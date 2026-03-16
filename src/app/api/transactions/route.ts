import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { transactions, accounts, categories } from "@/db/schema";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import { syncTransaction } from "@/lib/sync";
import { checkBudgetForCategory, sendBudgetAlert } from "@/lib/budget-checker";
import { z } from "zod";

const createSchema = z.object({
  accountId: z.number(),
  categoryId: z.number(),
  type: z.enum(["income", "expense"]),
  amount: z.number().positive(),
  note: z.string().optional(),
  date: z.string(),
});

export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const limit = Number(sp.get("limit") || "50");
  const offset = Number(sp.get("offset") || "0");
  const from = sp.get("from");
  const to = sp.get("to");
  const type = sp.get("type");
  const categoryId = sp.get("categoryId");

  const conds = [];
  if (from) conds.push(gte(transactions.date, from));
  if (to) conds.push(lte(transactions.date, to));
  if (type) conds.push(eq(transactions.type, type as "income" | "expense"));
  if (categoryId) conds.push(eq(transactions.categoryId, Number(categoryId)));

  const data = await db
    .select({ transaction: transactions, category: categories, account: accounts })
    .from(transactions)
    .innerJoin(categories, eq(transactions.categoryId, categories.id))
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(transactions.date), desc(transactions.id))
    .limit(limit)
    .offset(offset);

  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  try {
    const parsed = createSchema.parse(await req.json());
    const [result] = await db.insert(transactions).values(parsed).returning();

    const delta = parsed.type === "income" ? parsed.amount : -parsed.amount;
    await db
      .update(accounts)
      .set({ balance: sql`${accounts.balance} + ${delta}` })
      .where(eq(accounts.id, parsed.accountId));

    syncTransaction(result.id).catch(console.error);

    if (parsed.type === "expense") {
      checkBudgetForCategory(parsed.categoryId).then((s) => {
        if (s && (s.isOverBudget || s.isNearLimit)) sendBudgetAlert(s).catch(console.error);
      });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.errors }, { status: 400 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const [tx] = await db.select().from(transactions).where(eq(transactions.id, id));
  if (!tx) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const delta = tx.type === "income" ? -tx.amount : tx.amount;
  await db
    .update(accounts)
    .set({ balance: sql`${accounts.balance} + ${delta}` })
    .where(eq(accounts.id, tx.accountId));

  await db.delete(transactions).where(eq(transactions.id, id));
  return NextResponse.json({ success: true });
}
