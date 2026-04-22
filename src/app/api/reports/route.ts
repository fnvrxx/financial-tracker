import { NextRequest, NextResponse } from "next/server";
import { getAllTransactionsRaw, getCategories } from "@/lib/sheets-db";
import dayjs from "dayjs";

export async function GET(req: NextRequest) {
  const sp   = new URL(req.url).searchParams;
  const type = sp.get("type") || "summary";
  const from = sp.get("from") || dayjs().startOf("month").format("YYYY-MM-DD");
  const to   = sp.get("to")   || dayjs().endOf("month").format("YYYY-MM-DD");

  const allTx = await getAllTransactionsRaw();

  if (type === "summary") {
    const inRange = allTx.filter((t) => t.date >= from && t.date <= to);
    const income  = inRange.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const expense = inRange.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    return NextResponse.json({
      income,
      expense,
      net: income - expense,
      transactionCount: inRange.length,
      period: { from, to },
    });
  }

  if (type === "byCategory") {
    const inRange = allTx.filter((t) => t.date >= from && t.date <= to);
    const cats    = await getCategories();
    const catMap  = new Map(cats.map((c) => [c.id, c]));

    const key = (t: (typeof inRange)[0]) => `${t.categoryId}:${t.type}`;
    const agg = new Map<string, { total: number; count: number }>();
    for (const t of inRange) {
      const k = key(t);
      const cur = agg.get(k) ?? { total: 0, count: 0 };
      agg.set(k, { total: cur.total + t.amount, count: cur.count + 1 });
    }

    const result = [...agg.entries()].map(([k, v]) => {
      const [catIdStr, txType] = k.split(":");
      const cat = catMap.get(Number(catIdStr));
      return {
        categoryId:    Number(catIdStr),
        categoryName:  cat?.name  ?? "Unknown",
        categoryIcon:  cat?.icon  ?? "tag",
        categoryColor: cat?.color ?? "#7c4dff",
        type:          txType,
        total:         v.total,
        count:         v.count,
      };
    });
    result.sort((a, b) => b.total - a.total);
    return NextResponse.json(result);
  }

  if (type === "trend") {
    const toParam = sp.get("to");
    const period  = sp.get("period") || "monthly";
    const refDate = toParam ? dayjs(toParam) : dayjs();

    function amountsForRange(f: string, t: string) {
      const inRange = allTx.filter((tx) => tx.date >= f && tx.date <= t);
      const income  = inRange.filter((tx) => tx.type === "income").reduce((s, tx) => s + tx.amount, 0);
      const expense = inRange.filter((tx) => tx.type === "expense").reduce((s, tx) => s + tx.amount, 0);
      return { income, expense, net: income - expense };
    }

    if (period === "weekly") {
      const refWeekEnd = refDate.endOf("week");
      const points = Array.from({ length: 3 }, (_, i) => {
        const weekEnd   = refWeekEnd.subtract(2 - i, "week");
        const weekStart = weekEnd.startOf("week");
        const f = weekStart.format("YYYY-MM-DD");
        const t = weekEnd.format("YYYY-MM-DD");
        return { month: weekStart.format("DD MMM"), ...amountsForRange(f, t) };
      });
      return NextResponse.json(points);
    }

    const points = Array.from({ length: 6 }, (_, i) => {
      const d = refDate.subtract(5 - i, "month");
      const f = d.startOf("month").format("YYYY-MM-DD");
      const t = d.endOf("month").format("YYYY-MM-DD");
      return { month: d.format("MMM YYYY"), ...amountsForRange(f, t) };
    });
    return NextResponse.json(points);
  }

  return NextResponse.json({ error: "Unknown type" }, { status: 400 });
}
