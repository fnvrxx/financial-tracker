"use client";

import { formatRupiah } from "@/lib/utils";

interface BudgetProgress {
  percentage: number;
  isOverBudget: boolean;
  remaining: number;
}

interface CategoryDetailSheetProps {
  name: string;
  color: string;
  subtitle: string;
  transactions: any[];
  loading: boolean;
  onClose: () => void;
  budget?: BudgetProgress;
}

export default function CategoryDetailSheet({
  name,
  color,
  subtitle,
  transactions,
  loading,
  onClose,
  budget,
}: CategoryDetailSheetProps) {
  const safeColor = color || "#7c4dff";

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl pb-10 sm:pb-0 animate-slide-up sm:mx-4 max-h-[88vh] flex flex-col">
        {/* Drag handle */}
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mt-4 mb-1 sm:hidden shrink-0" />

        {/* Header */}
        <div className="px-6 pt-4 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-base font-bold shrink-0"
              style={{ background: `${safeColor}15`, color: safeColor }}
            >
              {name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-bold text-gray-900 font-display">
                {name}
              </h2>
              <p className="text-[11px] text-gray-400">{subtitle}</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors shrink-0"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Optional budget progress bar */}
          {budget && (
            <div className="mt-3">
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    budget.isOverBudget
                      ? "bg-red-500"
                      : budget.percentage > 60
                        ? "bg-amber-500"
                        : "bg-primary-500"
                  }`}
                  style={{
                    width: `${Math.min(budget.percentage, 100)}%`,
                  }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span
                  className={`text-[11px] font-bold ${budget.isOverBudget ? "text-red-500" : "text-primary-600"}`}
                >
                  {budget.percentage}% terpakai
                </span>
                <span className="text-[11px] text-gray-400">
                  Sisa {formatRupiah(Math.max(budget.remaining, 0))}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 shrink-0" />

        {/* Transaction list */}
        <div className="overflow-y-auto flex-1 px-6 py-4">
          {loading ? (
            <div className="py-10 flex justify-center">
              <div className="w-6 h-6 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-gray-400">
                Belum ada transaksi bulan ini
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map((item: any) => (
                <div
                  key={item.transaction.id}
                  className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {item.transaction.note || name}
                    </p>
                    <p className="text-[11px] text-gray-400">
                      {item.transaction.date} · {item.account?.name || ""}
                    </p>
                  </div>
                  <span
                    className={`text-sm font-bold shrink-0 ${
                      item.transaction.type === "expense"
                        ? "text-red-500"
                        : "text-emerald-500"
                    }`}
                  >
                    {item.transaction.type === "expense" ? "-" : "+"}
                    {formatRupiah(item.transaction.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer summary */}
        {!loading && transactions.length > 0 && (
          <div className="px-6 py-3 border-t border-gray-100 shrink-0">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-400">
                {transactions.length} transaksi
              </span>
              <span className="text-sm font-bold text-gray-700">
                Total{" "}
                {formatRupiah(
                  transactions.reduce(
                    (s: number, t: any) => s + t.transaction.amount,
                    0
                  )
                )}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
