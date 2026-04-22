import { getBudgets, getCategories, getAllTransactionsRaw } from "@/lib/sheets-db";
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

  const [allBudgets, allCats, allTx] = await Promise.all([
    getBudgets(),
    getCategories(),
    getAllTransactionsRaw(),
  ]);

  if (!allBudgets.length) return [];

  const catMap = new Map(allCats.map((c) => [c.id, c]));

  return allBudgets.map((budget) => {
    const category = catMap.get(budget.categoryId);
    const bounds = getPeriodBounds(budget.period, refDate);

    const spent = allTx
      .filter(
        (t) =>
          t.type === "expense" &&
          t.categoryId === budget.categoryId &&
          t.date >= bounds.start &&
          t.date <= bounds.end
      )
      .reduce((sum, t) => sum + t.amount, 0);

    const remaining = budget.limitAmount - spent;
    const percentage = Math.round((spent / budget.limitAmount) * 100);

    return {
      budgetId: budget.id,
      categoryId: budget.categoryId,
      categoryName: category?.name ?? "Unknown",
      categoryIcon: category?.icon ?? "tag",
      categoryColor: category?.color ?? "#7c4dff",
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
  return results.find((b) => b.categoryId === categoryId) ?? null;
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
    // best-effort
  }
}
