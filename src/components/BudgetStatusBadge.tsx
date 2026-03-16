import type { BudgetStatus } from "@/types";

export default function BudgetStatusBadge({ budget }: { budget: BudgetStatus }) {
  if (budget.isOverBudget) {
    return (
      <div className="flex items-center gap-1.5 mt-2">
        <span className="w-4 h-4 rounded-full bg-red-100 flex items-center justify-center text-[10px]">!</span>
        <span className="text-[11px] text-red-500 font-medium">Budget exceeded!</span>
      </div>
    );
  }

  if (budget.isNearLimit) {
    return (
      <div className="flex items-center gap-1.5 mt-2">
        <span className="w-4 h-4 rounded-full bg-amber-100 flex items-center justify-center text-[10px]">!</span>
        <span className="text-[11px] text-amber-600 font-medium">Almost exceeding your budget</span>
      </div>
    );
  }

  if (budget.spent > 0) {
    return (
      <div className="flex items-center gap-1.5 mt-2">
        <span className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center text-[10px]">o</span>
        <span className="text-[11px] text-emerald-600 font-medium">Your spending still on track</span>
      </div>
    );
  }

  return null;
}
