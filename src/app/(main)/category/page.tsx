"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api-client";
import { formatRupiah } from "@/lib/utils";
import { useRefreshListener } from "@/lib/events";
import LoadingSpinner from "@/components/LoadingSpinner";
import CreateBudgetForm from "@/components/CreateBudgetForm";
import type { BudgetStatus, CategoryBreakdown, MonthlyTrend } from "@/types";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface UnbudgetedCategory {
  id: number;
  name: string;
  icon: string;
  type: string;
  color: string | null;
}

export default function CategoryPage() {
  const [budgets, setBudgets] = useState<BudgetStatus[]>([]);
  const [categories, setCategories] = useState<CategoryBreakdown[]>([]);
  const [trend, setTrend] = useState<MonthlyTrend[]>([]);
  const [unbudgeted, setUnbudgeted] = useState<UnbudgetedCategory[]>([]);
  const [tab, setTab] = useState<"categories" | "accounts">("categories");
  const [loading, setLoading] = useState(true);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [settingBudget, setSettingBudget] = useState<UnbudgetedCategory | null>(null);
  const [budgetAmount, setBudgetAmount] = useState("");
  const [savingBudget, setSavingBudget] = useState(false);

  const currentMonth = new Date().getMonth();
  const monthName = MONTH_NAMES[currentMonth];

  const refresh = useCallback(async () => {
    try {
      const [b, c, t, allCats] = await Promise.all([
        api.budgets.list(),
        api.reports.byCategory(),
        api.reports.trend(),
        api.categories.list(),
      ]);
      setBudgets(b);
      setCategories(c);
      setTrend(t);
      const budgetedIds = new Set(b.map((x: BudgetStatus) => x.categoryId));
      setUnbudgeted(allCats.filter((cat: UnbudgetedCategory) => !budgetedIds.has(cat.id)));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  useRefreshListener(refresh);

  const totalBudget = budgets.reduce((s, b) => s + b.limitAmount, 0);
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);

  // Build sparkline SVG path from trend data
  const maxVal = Math.max(...trend.map((t) => t.expense), 1);
  const sparkPoints = trend
    .map((t, i) => {
      const x = (i / Math.max(trend.length - 1, 1)) * 260;
      const y = 50 - (t.expense / maxVal) * 40;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto pb-24">
      {/* Purple header with sparkline chart */}
      <div className="gradient-purple rounded-b-[32px] px-5 md:px-8 pt-12 pb-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4" />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-lg font-bold font-display">Budget</h1>
            <button
              onClick={() => setShowMonthPicker(!showMonthPicker)}
              className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
            </button>
          </div>

          {/* Month picker */}
          {showMonthPicker && (
            <div className="grid grid-cols-4 gap-2 mb-4 animate-fade-in">
              {MONTH_NAMES.map((name, i) => (
                <button
                  key={i}
                  className={`px-2 py-2 rounded-xl text-[11px] font-bold transition-all ${
                    i === currentMonth
                      ? "bg-white text-primary-600 shadow-lg"
                      : i <= currentMonth
                        ? "bg-white/15 text-white/70 hover:text-white"
                        : "bg-white/5 text-white/30 cursor-not-allowed"
                  }`}
                  disabled={i > currentMonth}
                >
                  {name.slice(0, 3)}
                </button>
              ))}
            </div>
          )}

          <div className="text-center mb-4">
            <p className="text-4xl font-bold font-display tracking-tight">
              {formatRupiah(totalBudget - totalSpent)}
            </p>
            <p className="text-white/60 text-sm mt-1">{monthName}</p>
          </div>

          {/* Sparkline chart */}
          {trend.length > 1 && (
            <div className="flex justify-center mb-2">
              <svg width="280" height="60" viewBox="0 0 280 60" className="opacity-60 w-full max-w-[280px]">
                <polyline
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={sparkPoints}
                />
                <polyline
                  fill="url(#sparkGrad)"
                  stroke="none"
                  points={`0,55 ${sparkPoints} 260,55`}
                  opacity="0.2"
                />
                <defs>
                  <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="white" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="white" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          )}

          {/* X-axis labels */}
          {trend.length > 0 && (
            <div className="flex justify-between px-2 max-w-[280px] mx-auto">
              {trend.map((t, i) => (
                <span key={i} className="text-[10px] text-white/40 font-medium">
                  {t.month.split(" ")[0]}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Budget cards */}
      <div className="px-5 md:px-8 mt-4 space-y-3 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
        {loading ? (
          <LoadingSpinner className="py-16 md:col-span-2" />
        ) : (
          budgets.map((b, i) => (
            <div
              key={b.budgetId}
              className={`bg-white rounded-2xl p-4 shadow-card animate-fade-in stagger-${Math.min(i + 1, 4)}`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center text-sm font-bold"
                  style={{
                    background: `${b.categoryColor || "#7c4dff"}15`,
                    color: b.categoryColor || "#7c4dff",
                  }}
                >
                  {b.categoryName.charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-gray-900">{b.categoryName}</p>
                  <p className="text-[11px] text-gray-400">
                    Rp {Math.round(b.limitAmount / 30).toLocaleString("id-ID")} Per day
                  </p>
                </div>
              </div>

              <div className="relative mb-2">
                <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      b.isOverBudget
                        ? "bg-red-500"
                        : b.percentage > 60
                          ? "bg-amber-500"
                          : "bg-primary-500"
                    }`}
                    style={{ width: `${Math.min(b.percentage, 100)}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                  b.isOverBudget
                    ? "bg-red-50 text-red-500"
                    : "bg-primary-50 text-primary-600"
                }`}>
                  {formatRupiah(b.spent)}
                </span>
                <span className="text-xs font-medium text-gray-400">
                  {formatRupiah(b.limitAmount)}
                </span>
              </div>

              {b.isOverBudget && (
                <div className="flex items-center gap-1.5 mt-3 bg-red-50 rounded-xl px-3 py-2">
                  <span className="text-[11px] text-red-600 font-medium">
                    You are almost exceeding your budget
                  </span>
                </div>
              )}
              {!b.isOverBudget && b.spent > 0 && (
                <div className="flex items-center gap-1.5 mt-3 bg-emerald-50 rounded-xl px-3 py-2">
                  <span className="text-[11px] text-emerald-600 font-medium">
                    Your spending still on track
                  </span>
                </div>
              )}
            </div>
          ))
        )}
        {!loading && budgets.length === 0 && (
          <div className="text-center py-12 md:col-span-2">
            <p className="text-gray-400 text-sm">Belum ada budget</p>
          </div>
        )}
      </div>
      {/* Unbudgeted categories */}
      {!loading && unbudgeted.length > 0 && (
        <div className="px-5 md:px-8 mt-6">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">Belum Ada Budget</h2>
          <div className="space-y-2 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
            {unbudgeted.map((cat) => (
              <div
                key={cat.id}
                className="bg-white rounded-2xl p-4 shadow-card flex items-center gap-3"
              >
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center text-sm font-bold shrink-0"
                  style={{
                    background: `${cat.color || "#7c4dff"}15`,
                    color: cat.color || "#7c4dff",
                  }}
                >
                  {cat.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">{cat.name}</p>
                  <p className="text-[11px] text-gray-400 capitalize">{cat.type === "expense" ? "Pengeluaran" : "Pemasukan"}</p>
                </div>
                <button
                  onClick={() => { setSettingBudget(cat); setBudgetAmount(""); }}
                  className="px-3 py-1.5 rounded-xl bg-primary-50 text-primary-600 text-xs font-bold hover:bg-primary-100 transition-colors shrink-0"
                >
                  Set Budget
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Set budget modal for existing category */}
      {settingBudget && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center"
          onClick={(e) => { if (e.target === e.currentTarget) setSettingBudget(null); }}
        >
          <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-6 pb-10 sm:pb-6 animate-slide-up sm:mx-4">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5 sm:hidden" />

            <div className="flex items-center gap-3 mb-5">
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center text-sm font-bold"
                style={{
                  background: `${settingBudget.color || "#7c4dff"}15`,
                  color: settingBudget.color || "#7c4dff",
                }}
              >
                {settingBudget.name.charAt(0)}
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-gray-900 font-display">{settingBudget.name}</h2>
                <p className="text-xs text-gray-400 capitalize">{settingBudget.type === "expense" ? "Pengeluaran" : "Pemasukan"}</p>
              </div>
              <button
                onClick={() => setSettingBudget(null)}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const amount = Number(budgetAmount);
                if (amount <= 0) return;
                setSavingBudget(true);
                try {
                  await api.budgets.create({ categoryId: settingBudget.id, limitAmount: amount, period: "monthly" });
                  setSettingBudget(null);
                  refresh();
                } catch (err) {
                  console.error(err);
                } finally {
                  setSavingBudget(false);
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">
                  Target Bulanan
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">Rp</span>
                  <input
                    type="number"
                    value={budgetAmount}
                    onChange={(e) => setBudgetAmount(e.target.value)}
                    placeholder="0"
                    min="1"
                    className="w-full pl-10 pr-4 py-3 rounded-2xl border border-gray-200 text-sm font-medium text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-transparent"
                    autoFocus
                    required
                  />
                </div>
              </div>

              {Number(budgetAmount) > 0 && (
                <div className="animate-fade-in bg-primary-50 rounded-2xl px-4 py-3 flex items-center justify-between">
                  <span className="text-xs font-bold text-primary-600 uppercase tracking-wide">Target Harian</span>
                  <span className="text-sm font-bold text-primary-700">
                    Rp {Math.round(Number(budgetAmount) / 30).toLocaleString("id-ID")}
                  </span>
                </div>
              )}

              <button
                type="submit"
                disabled={savingBudget || Number(budgetAmount) <= 0}
                className="w-full py-3.5 rounded-2xl bg-primary-500 text-white text-sm font-bold shadow-button transition-all hover:bg-primary-600 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingBudget ? "Menyimpan..." : "Set Budget"}
              </button>
            </form>
          </div>
        </div>
      )}

      <CreateBudgetForm onSuccess={refresh} />
    </div>
  );
}
