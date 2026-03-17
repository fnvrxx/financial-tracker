import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { transactions, categories } from "@/db/schema";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";
import dayjs from "dayjs";

async function getAmountSums(from: string, to: string): Promise<{ income: number; expense: number }> {
  const [result] = await db
    .select({
      income: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'income' THEN ${transactions.amount} ELSE 0 END), 0)`,
      expense: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'expense' THEN ${transactions.amount} ELSE 0 END), 0)`,
    })
    .from(transactions)
    .where(and(gte(transactions.date, from), lte(transactions.date, to)));
  return { income: Number(result?.income || 0), expense: Number(result?.expense || 0) };
}

export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const type = sp.get("type") || "summary";
  const from = sp.get("from") || dayjs().startOf("month").format("YYYY-MM-DD");
  const to = sp.get("to") || dayjs().endOf("month").format("YYYY-MM-DD");

  if (type === "summary") {
    const [sums, cnt] = await Promise.all([
      getAmountSums(from, to),
      db
        .select({ count: sql<number>`COUNT(*)` })
        .from(transactions)
        .where(and(gte(transactions.date, from), lte(transactions.date, to))),
    ]);

    return NextResponse.json({
      income: sums.income,
      expense: sums.expense,
      net: sums.income - sums.expense,
      transactionCount: cnt[0]?.count || 0,
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
    const toParam = sp.get("to");
    const period = sp.get("period") || "monthly";
    const refDate = toParam ? dayjs(toParam) : dayjs();

    if (period === "weekly") {
      const refWeekEnd = refDate.endOf("week");
      const ranges = Array.from({ length: 3 }, (_, i) => {
        const weekEnd = refWeekEnd.subtract(2 - i, "week");
        const weekStart = weekEnd.startOf("week");
        return { f: weekStart.format("YYYY-MM-DD"), t: weekEnd.format("YYYY-MM-DD"), label: weekStart.format("DD MMM") };
      });

      const points = await Promise.all(
        ranges.map(async ({ f, t, label }) => {
          const sums = await getAmountSums(f, t);
          return { month: label, ...sums, net: sums.income - sums.expense };
        })
      );
      return NextResponse.json(points);
    } else {
      const ranges = Array.from({ length: 6 }, (_, i) => {
        const d = refDate.subtract(5 - i, "month");
        return { f: d.startOf("month").format("YYYY-MM-DD"), t: d.endOf("month").format("YYYY-MM-DD"), label: d.format("MMM YYYY") };
      });

      const points = await Promise.all(
        ranges.map(async ({ f, t, label }) => {
          const sums = await getAmountSums(f, t);
          return { month: label, ...sums, net: sums.income - sums.expense };
        })
      );
      return NextResponse.json(points);
    }
  }

  return NextResponse.json({ error: "Unknown type" }, { status: 400 });
}
