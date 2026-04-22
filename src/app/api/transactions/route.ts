import { NextRequest, NextResponse } from "next/server";
import {
  getTransactions,
  createTransaction,
  deleteTransaction,
  updateAccountBalance,
  getCategories,
  getAccounts,
} from "@/lib/sheets-db";
import { checkBudgetForCategory, sendBudgetAlert } from "@/lib/budget-checker";
import { z } from "zod";

const createSchema = z.object({
  accountId: z.number(),
  categoryId: z.number(),
  type: z.enum(["income", "expense"]),
  amount: z.number().positive(),
  note: z.string().optional().default(""),
  date: z.string(),
});

export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const limit      = Number(sp.get("limit") || "50");
  const offset     = Number(sp.get("offset") || "0");
  const from       = sp.get("from") ?? undefined;
  const to         = sp.get("to") ?? undefined;
  const type       = (sp.get("type") ?? undefined) as "income" | "expense" | undefined;
  const categoryId = sp.get("categoryId") ? Number(sp.get("categoryId")) : undefined;

  const txList = await getTransactions({ limit, offset, from, to, type, categoryId });

  const [allCats, allAccs] = await Promise.all([getCategories(), getAccounts()]);
  const catMap = new Map(allCats.map((c) => [c.id, c]));
  const accMap = new Map(allAccs.map((a) => [a.id, a]));

  const data = txList.map((tx) => ({
    transaction: tx,
    category: catMap.get(tx.categoryId) ?? { id: tx.categoryId, name: tx.categoryName, icon: "tag", type: tx.type, color: "#7c4dff" },
    account: accMap.get(tx.accountId),
  }));

  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  try {
    const parsed = createSchema.parse(await req.json());

    // Ambil nama kategori untuk disimpan langsung di baris transaksi
    const cats = await getCategories();
    const cat = cats.find((c) => c.id === parsed.categoryId);

    const tx = await createTransaction({
      ...parsed,
      categoryName: cat?.name ?? "",
    });

    const delta = parsed.type === "income" ? parsed.amount : -parsed.amount;
    await updateAccountBalance(parsed.accountId, delta);

    if (parsed.type === "expense") {
      checkBudgetForCategory(parsed.categoryId).then((s) => {
        if (s && (s.isOverBudget || s.isNearLimit)) sendBudgetAlert(s).catch(console.error);
      });
    }

    return NextResponse.json(tx, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.errors }, { status: 400 });
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const tx = await deleteTransaction(id);
  if (!tx) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const delta = tx.type === "income" ? -tx.amount : tx.amount;
  await updateAccountBalance(tx.accountId, delta);

  return NextResponse.json({ success: true });
}
