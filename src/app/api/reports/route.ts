import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { transactions, categories } from "@/db/schema";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";

async function getAmountSum(type: "income" | "expense", from: string, to: string) {
  const [result] = await db
    .select({ total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)` })
    .from(transactions)
    .where(and(eq(transactions.type, type), gte(transactions.date, from), lte(transactions.date, to)));
  return result?.total || 0;
}

export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const type = sp.get("type") || "summary";
  const from = sp.get("from") || format(startOfMonth(new Date()), "yyyy-MM-dd");
  const to = sp.get("to") || format(endOfMonth(new Date()), "yyyy-MM-dd");

  if (type === "summary") {
    const income = await getAmountSum("income", from, to);
    const expense = await getAmountSum("expense", from, to);
    const [cnt] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(transactions)
      .where(and(gte(transactions.date, from), lte(transactions.date, to)));

    return NextResponse.json({
      income,
      expense,
      net: income - expense,
      transactionCount: cnt?.count || 0,
      period: { from, to },
    });
  }

  if (type === "byCategory") {
    const data = await db
      .select({
        categoryId: categories.id,
        categoryName: categories.name,
        categoryIcon: categories.icon,
        categoryColor: categories.color,
        type: transactions.type,
        total: sql<number>`SUM(${transactions.amount})`,
        count: sql<number>`COUNT(*)`,
      })
      .from(transactions)
      .innerJoin(categories, eq(transactions.categoryId, categories.id))
      .where(and(gte(transactions.date, from), lte(transactions.date, to)))
      .groupBy(categories.id, transactions.type)
      .orderBy(desc(sql`SUM(${transactions.amount})`));

    return NextResponse.json(data);
  }

  if (type === "trend") {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      const f = format(startOfMonth(d), "yyyy-MM-dd");
      const t = format(endOfMonth(d), "yyyy-MM-dd");
      const income = await getAmountSum("income", f, t);
      const expense = await getAmountSum("expense", f, t);
      months.push({
        month: format(d, "MMM yyyy"),
        income,
        expense,
        net: income - expense,
      });
    }
    return NextResponse.json(months);
  }

  return NextResponse.json({ error: "Unknown type" }, { status: 400 });
}
