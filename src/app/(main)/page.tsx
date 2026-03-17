"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api-client";
import { formatRupiah } from "@/lib/utils";
import { useRefreshListener } from "@/lib/events";
import LoadingSpinner from "@/components/LoadingSpinner";
import BudgetStatusBadge from "@/components/BudgetStatusBadge";
import type { ReportSummary, BudgetStatus, CategoryBreakdown } from "@/types";

function AnimatedNumber({ value }: { value: number }) {
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    if (value === 0) { setDisplayed(0); return; }
    const start = displayed;
    const diff = value - start;
    const duration = 600;
    const startTime = performance.now();
    let raf: number;
    function step(now: number) {
      const progress = Math.min((now - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.round(start + diff * ease));
      if (progress < 1) raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return <>{formatRupiah(displayed)}</>;
}

export default function HomePage() {
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [budgets, setBudgets] = useState<BudgetStatus[]>([]);
  const [categories, setCategories] = useState<CategoryBreakdown[]>([]);
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

  const monthName = new Date().toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  const income = summary?.income || 0;
  const expense = summary?.expense || 0;
  const net = summary?.net || 0;
  const savingsRate = income > 0 ? Math.round((net / income) * 100) : 0;

  if (loading) return <LoadingSpinner className="min-h-screen" />;

  const topSpending = categories.filter((c) => c.type === "expense").slice(0, 5);

  return (
    <div className="max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto pb-24">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="gradient-purple rounded-b-[36px] px-5 md:px-8 pt-14 pb-6 text-white relative overflow-hidden">
        {/* decorative blobs */}
        <div className="absolute top-0 right-0 w-56 h-56 bg-white/5 rounded-full -translate-y-1/3 translate-x-1/4 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4 pointer-events-none" />

        <div className="relative z-10 space-y-5">

          {/* month label + savings rate badge */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/50 text-xs font-medium uppercase tracking-widest">Ringkasan</p>
              <p className="text-sm font-bold text-white/90 mt-0.5">{monthName}</p>
            </div>
            <div className={`px-3 py-1.5 rounded-full text-xs font-bold backdrop-blur-sm border ${
              savingsRate >= 0
                ? "bg-emerald-400/20 border-emerald-400/30 text-emerald-200"
                : "bg-red-400/20 border-red-400/30 text-red-200"
            }`}>
              {savingsRate >= 0 ? "+" : ""}{savingsRate}% saved
            </div>
          </div>

          {/* Net savings — big number */}
          <div>
            <p className="text-white/50 text-[11px] font-medium mb-1">Sisa bulan ini</p>
            <p className={`text-4xl md:text-5xl font-bold font-display tracking-tight ${net < 0 ? "text-red-300" : "text-white"}`}>
              <AnimatedNumber value={net} />
            </p>
          </div>

          {/* Income & Expense cards — responsive grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Income card */}
            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-3.5 md:p-4 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 md:w-8 md:h-8 rounded-xl bg-emerald-400/20 flex items-center justify-center shrink-0">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 19V5M5 12l7-7 7 7" />
                  </svg>
                </div>
                <span className="text-white/60 text-[11px] md:text-xs font-semibold">Pemasukan</span>
              </div>
              <p className="text-white font-bold text-base md:text-xl leading-tight break-all">
                <AnimatedNumber value={income} />
              </p>
              {summary?.transactionCount !== undefined && (
                <p className="text-white/40 text-[10px]">{summary.transactionCount} transaksi</p>
              )}
            </div>

            {/* Expense card */}
            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-3.5 md:p-4 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 md:w-8 md:h-8 rounded-xl bg-red-400/20 flex items-center justify-center shrink-0">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14M19 12l-7 7-7-7" />
                  </svg>
                </div>
                <span className="text-white/60 text-[11px] md:text-xs font-semibold">Pengeluaran</span>
              </div>
              <p className="text-white font-bold text-base md:text-xl leading-tight break-all">
                <AnimatedNumber value={expense} />
              </p>
              {income > 0 && (
                <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-400/70 rounded-full transition-all duration-700"
                    style={{ width: `${Math.min((expense / income) * 100, 100)}%` }}
                  />
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* ── Top Spending ───────────────────────────────────────── */}
      <div className="px-5 md:px-8 mt-6">
        <h2 className="text-base font-bold font-display text-gray-900 mb-3">Top Spending</h2>
        {topSpending.length === 0 ? (
          <p className="text-sm text-gray-400 py-4">Belum ada pengeluaran</p>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
            {topSpending.map((c, i) => (
              <div
                key={c.categoryId}
                className={`shrink-0 flex flex-col items-center gap-2 animate-fade-in stagger-${i + 1}`}
                style={{ minWidth: 72 }}
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-card"
                  style={{ background: `${c.categoryColor}18` }}
                >
                  <span style={{ color: c.categoryColor }} className="text-xl font-bold">
                    {c.categoryName.charAt(0)}
                  </span>
                </div>
                <span className="text-[11px] font-medium text-gray-600 text-center truncate w-full px-1">
                  {c.categoryName}
                </span>
                <span className="text-[10px] font-bold text-gray-400">
                  {formatRupiah(c.total || 0)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Monthly Budget ─────────────────────────────────────── */}
      <div className="px-5 md:px-8 mt-6">
        <h2 className="text-base font-bold font-display text-gray-900 mb-3">Monthly Budget</h2>
        <div className="space-y-3 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
          {budgets.map((b, i) => (
            <div
              key={b.budgetId}
              className={`bg-white rounded-2xl p-4 shadow-card animate-fade-in stagger-${Math.min(i + 1, 4)}`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0"
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
                      {formatRupiah(Math.round(b.limitAmount / 30))}/hari
                    </p>
                  </div>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded-lg ${
                  b.isOverBudget ? "bg-red-50 text-red-500" : "bg-gray-50 text-gray-500"
                }`}>
                  {b.percentage}%
                </span>
              </div>

              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    b.isOverBudget ? "bg-red-500" : b.isNearLimit ? "bg-amber-500" : "bg-primary-500"
                  }`}
                  style={{ width: `${Math.min(b.percentage, 100)}%` }}
                />
              </div>

              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold ${b.isOverBudget ? "text-red-500" : "text-primary-600"}`}>
                  {formatRupiah(b.spent)}
                </span>
                <span className="text-[11px] text-gray-400">dari {formatRupiah(b.limitAmount)}</span>
              </div>

              <BudgetStatusBadge budget={b} />
            </div>
          ))}
          {budgets.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6 md:col-span-2">Belum ada budget</p>
          )}
        </div>
      </div>

    </div>
  );
}
