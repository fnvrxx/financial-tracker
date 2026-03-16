import { db } from "@/db";
import { budgets, transactions, categories } from "@/db/schema";
import { eq, and, sql, gte } from "drizzle-orm";
import { startOfMonth, startOfWeek, format } from "date-fns";
import type { BudgetStatus } from "@/types";

export async function checkBudgets(): Promise<BudgetStatus[]> {
  const all = await db
    .select({ budget: budgets, category: categories })
    .from(budgets)
    .innerJoin(categories, eq(budgets.categoryId, categories.id));

  const results: BudgetStatus[] = [];

  for (const { budget, category } of all) {
    const periodStart =
      budget.period === "monthly"
        ? format(startOfMonth(new Date()), "yyyy-MM-dd")
        : format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");

    const [result] = await db
      .select({ total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)` })
      .from(transactions)
      .where(
        and(
          eq(transactions.categoryId, budget.categoryId),
          eq(transactions.type, "expense"),
          gte(transactions.date, periodStart)
        )
      );

    const spent = result?.total || 0;
    const remaining = budget.limitAmount - spent;
    const percentage = Math.round((spent / budget.limitAmount) * 100);

    results.push({
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
    });
  }

  return results;
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
