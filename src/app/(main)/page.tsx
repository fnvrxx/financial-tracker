"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api-client";
import { formatRupiah } from "@/lib/utils";
import { useRefreshListener } from "@/lib/events";
import LoadingSpinner from "@/components/LoadingSpinner";
import BudgetStatusBadge from "@/components/BudgetStatusBadge";
import type { ReportSummary, BudgetStatus, CategoryBreakdown } from "@/types";

export default function HomePage() {
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [budgets, setBudgets] = useState<BudgetStatus[]>([]);
  const [categories, setCategories] = useState<CategoryBreakdown[]>([]);
  const [tab, setTab] = useState<"expense" | "income">("expense");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [s, b, c] = await Promise.all([
        api.reports.summary(),
        api.budgets.list(),
        api.reports.byCategory(),
      ]);
      setSummary(s);
      setBudgets(b);
      setCategories(c);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  useRefreshListener(refresh);

  const monthName = new Date().toLocaleDateString("id-ID", { month: "long" });

  if (loading) return <LoadingSpinner className="min-h-screen" />;

  const topSpending = categories
    .filter((c) => c.type === "expense")
    .slice(0, 5);

  return (
    <div className="max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto pb-24">
      {/* Purple gradient header */}
      <div className="gradient-purple rounded-b-[32px] px-5 md:px-8 pt-12 pb-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4" />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div>
                <p className="text-white/60 text-xs font-medium">Today</p>
                <p className="text-sm font-bold">
                  {formatRupiah(Math.abs(summary?.net || 0))}
                </p>
              </div>
            </div>
          </div>

          {/* Savings card */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 md:p-6 border border-white/10">
            <p className="text-white/60 text-xs font-medium mb-1">
              {monthName} Savings
            </p>
            <p className="text-3xl md:text-4xl font-bold font-display tracking-tight">
              {formatRupiah(summary?.net || 0)}
            </p>
            <div className="flex gap-4 md:gap-8 mt-4">
              <div className="flex-1">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-white/60 text-[11px] font-medium">Pemasukkan</span>
                </div>
                <p className="text-base md:text-lg font-bold">
                  {formatRupiah(summary?.income || 0)}
                </p>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-2 h-2 rounded-full bg-red-400" />
                  <span className="text-white/60 text-[11px] font-medium">Pengeluaran</span>
                </div>
                <p className="text-base md:text-lg font-bold">
                  {formatRupiah(summary?.expense || 0)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Spending */}
      <div className="px-5 md:px-8 mt-6">
        <h2 className="text-base font-bold font-display text-gray-900 mb-3">
          Top Spending
        </h2>
        <div className="flex gap-3 overflow-x-auto month-tabs pb-2">
          {topSpending.length === 0 ? (
            <p className="text-sm text-gray-400 py-4">Belum ada pengeluaran</p>
          ) : (
            topSpending.map((c, i) => (
              <div
                key={c.categoryId}
                className={`shrink-0 w-20 flex flex-col items-center gap-2 animate-fade-in stagger-${i + 1}`}
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg shadow-card"
                  style={{ background: `${c.categoryColor}15` }}
                >
                  <span style={{ color: c.categoryColor }} className="text-xl font-bold">
                    {c.categoryName.charAt(0)}
                  </span>
                </div>
                <span className="text-[11px] font-medium text-gray-600 text-center truncate w-full">
                  {c.categoryName}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Monthly Budget */}
      <div className="px-5 md:px-8 mt-6">
        <h2 className="text-base font-bold font-display text-gray-900 mb-3">
          Monthly Budget
        </h2>
        <div className="space-y-3 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
          {budgets.map((b, i) => (
            <div
              key={b.budgetId}
              className={`bg-white rounded-2xl p-4 shadow-card animate-fade-in stagger-${Math.min(i + 1, 4)}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold"
                    style={{
                      background: `${b.categoryColor || "#7c4dff"}15`,
                      color: b.categoryColor || "#7c4dff",
                    }}
                  >
                    {b.categoryName.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{b.categoryName}</p>
                    <p className="text-[11px] text-gray-400">
                      Rp {Math.round(b.limitAmount / 30).toLocaleString("id-ID")} Per day
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 mt-3">
                <div className="flex-1">
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        b.isOverBudget
                          ? "bg-red-500"
                          : b.isNearLimit
                            ? "bg-amber-500"
                            : "bg-primary-500"
                      }`}
                      style={{ width: `${Math.min(b.percentage, 100)}%` }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className={`text-xs font-bold ${b.isOverBudget ? "text-red-500" : "text-primary-600"}`}>
                    {formatRupiah(b.spent)}
                  </span>
                  <span className="text-[11px] text-gray-400">
                    {formatRupiah(b.limitAmount)}
                  </span>
                </div>
              </div>

              <BudgetStatusBadge budget={b} />
            </div>
          ))}
          {budgets.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6">Belum ada budget</p>
          )}
        </div>
      </div>
    </div>
  );
}
