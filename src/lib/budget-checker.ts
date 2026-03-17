import { db } from "@/db";
import { budgets, transactions, categories } from "@/db/schema";
import { eq, and, sql, gte, lte } from "drizzle-orm";
import dayjs from "dayjs";
import type { BudgetStatus } from "@/types";

function getPeriodBounds(period: string, refDate: dayjs.Dayjs) {
  if (period === "monthly") {
    return {
      start: refDate.startOf("month").format("YYYY-MM-DD"),
      end: refDate.endOf("month").format("YYYY-MM-DD"),
    };
  }
  return {
    start: refDate.startOf("week").format("YYYY-MM-DD"),
    end: refDate.endOf("week").format("YYYY-MM-DD"),
  };
}

export async function checkBudgets(monthStart?: string): Promise<BudgetStatus[]> {
  const refDate = monthStart ? dayjs(monthStart) : dayjs();

  const all = await db
    .select({ budget: budgets, category: categories })
    .from(budgets)
    .innerJoin(categories, eq(budgets.categoryId, categories.id));

  if (!all.length) return [];

  // Single batched query: get spending for all budget categories at once
  const monthlyBudgetIds = all.filter((r) => r.budget.period === "monthly").map((r) => r.budget.categoryId);
  const weeklyBudgetIds = all.filter((r) => r.budget.period === "weekly").map((r) => r.budget.categoryId);

  const monthBounds = getPeriodBounds("monthly", refDate);
  const weekBounds = getPeriodBounds("weekly", refDate);

  const [monthlySpending, weeklySpending] = await Promise.all([
    monthlyBudgetIds.length > 0
      ? db
          .select({
            categoryId: transactions.categoryId,
            total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
          })
          .from(transactions)
          .where(
            and(
              eq(transactions.type, "expense"),
              gte(transactions.date, monthBounds.start),
              lte(transactions.date, monthBounds.end)
            )
          )
          .groupBy(transactions.categoryId)
      : Promise.resolve([]),
    weeklyBudgetIds.length > 0
      ? db
          .select({
            categoryId: transactions.categoryId,
            total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
          })
          .from(transactions)
          .where(
            and(
              eq(transactions.type, "expense"),
              gte(transactions.date, weekBounds.start),
              lte(transactions.date, weekBounds.end)
            )
          )
          .groupBy(transactions.categoryId)
      : Promise.resolve([]),
  ]);

  const monthlyMap = new Map(monthlySpending.map((r) => [r.categoryId, r.total]));
  const weeklyMap = new Map(weeklySpending.map((r) => [r.categoryId, r.total]));

  return all.map(({ budget, category }) => {
    const spendingMap = budget.period === "monthly" ? monthlyMap : weeklyMap;
    const spent = Number(spendingMap.get(budget.categoryId) ?? 0);
    const remaining = budget.limitAmount - spent;
    const percentage = Math.round((spent / budget.limitAmount) * 100);

    return {
      budgetId: budget.id,
      categoryId: category.id,
      categoryName: category.name,
      categoryIcon: category.icon || "tag",
      categoryColor: category.color || "#7c4dff",
      limitAmount: budget.limitAmount,
      spent,
      remaining,
      percentage,
      period: budget.period,
      isOverBudget: spent > budget.limitAmount,
      isNearLimit: percentage >= 80 && percentage <= 100,
    };
  });
}

export async function checkBudgetForCategory(categoryId: number): Promise<BudgetStatus | null> {
  const results = await checkBudgets();
  return results.find((b) => b.categoryId === categoryId) || null;
}

export async function sendBudgetAlert(status: BudgetStatus) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  const emoji = status.isOverBudget ? "!" : "~";
  const msg = [
    `${emoji} *Budget ${status.isOverBudget ? "Exceeded" : "Warning"} (${status.percentage}%)*`,
    `Category: ${status.categoryName}`,
    `Spent: Rp ${status.spent.toLocaleString("id-ID")} / Rp ${status.limitAmount.toLocaleString("id-ID")}`,
  ].join("\n");

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: "Markdown" }),
    });
  } catch {
    // Telegram alert is best-effort
  }
}
