"use client";

import { useState, useEffect, useCallback } from "react";
import dayjs from "dayjs";
import { api } from "@/lib/api-client";
import { formatRupiah } from "@/lib/utils";
import { useRefreshListener } from "@/lib/events";
import LoadingSpinner from "@/components/LoadingSpinner";
import AnimatedNumber from "@/components/AnimatedNumber";
import CategoryDetailSheet from "@/components/CategoryDetailSheet";
import type { ReportSummary, BudgetStatus, CategoryBreakdown } from "@/types";

// ─── Main Page ──────────────────────────────────────────────

export default function HomePage() {
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [budgets, setBudgets] = useState<BudgetStatus[]>([]);
  const [categories, setCategories] = useState<CategoryBreakdown[]>([]);
  const [todayTxs, setTodayTxs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [detailCategory, setDetailCategory] = useState<CategoryBreakdown | null>(null);
  const [detailTxs, setDetailTxs] = useState<any[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const today = dayjs().format("YYYY-MM-DD");
      const [s, b, c, todayData] = await Promise.all([
        api.reports.summary(),
        api.budgets.list(),
        api.reports.byCategory(),
        api.transactions.list({ from: today, to: today, type: "expense", limit: 200 }),
      ]);
      setSummary(s);
      setBudgets(b);
      setCategories(c);
      setTodayTxs(todayData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  useRefreshListener(refresh);

  async function openCategoryDetail(c: CategoryBreakdown) {
    const from = dayjs().startOf("month").format("YYYY-MM-DD");
    const to = dayjs().endOf("month").format("YYYY-MM-DD");
    setDetailCategory(c);
    setDetailTxs([]);
    setDetailLoading(true);
    try {
      const txs = await api.transactions.list({ categoryId: c.categoryId, from, to, limit: 100 });
      txs.sort((a: any, b: any) => a.transaction.date.localeCompare(b.transaction.date));
      setDetailTxs(txs);
    } catch (err) {
      console.error(err);
    } finally {
      setDetailLoading(false);
    }
  }

  // ─── Derived values ────────────────────────────────────────

  const monthName = new Date().toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  const income = summary?.income || 0;
  const expense = summary?.expense || 0;
  const net = summary?.net || 0;
  const savingsRate = income > 0 ? Math.round((net / income) * 100) : 0;

  const dailyBudget = budgets.reduce((s, b) => s + Math.round(b.limitAmount / 30), 0);
  const todaySpent = todayTxs.reduce((s, t) => s + t.transaction.amount, 0);
  const dailyRemaining = dailyBudget - todaySpent;
  const dailyPercentage = dailyBudget > 0 ? Math.round((todaySpent / dailyBudget) * 100) : 0;
  const todayLabel = dayjs().locale("id").format("dddd, DD MMM YYYY");
  const topSpending = categories.filter((c) => c.type === "expense").slice(0, 5);
  const isOverDailyBudget = dailyBudget > 0 && todaySpent > dailyBudget;

  // ─── Loading state ─────────────────────────────────────────

  if (loading) return <LoadingSpinner className="min-h-screen" />;

  // ─── Render ────────────────────────────────────────────────

  return (
    <div className="max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto pb-24">
      <HeaderSection
        monthName={monthName}
        savingsRate={savingsRate}
        net={net}
        income={income}
        expense={expense}
        transactionCount={summary?.transactionCount}
      />

      <TopSpendingSection items={topSpending} onSelect={openCategoryDetail} />

      <DailySpendingCard
        todayLabel={todayLabel}
        todaySpent={todaySpent}
        dailyBudget={dailyBudget}
        dailyRemaining={dailyRemaining}
        dailyPercentage={dailyPercentage}
        isOver={isOverDailyBudget}
        transactions={todayTxs}
      />

      {detailCategory && (
        <CategoryDetailSheet
          name={detailCategory.categoryName}
          color={detailCategory.categoryColor}
          subtitle={`Bulan ini · ${formatRupiah(detailCategory.total || 0)}`}
          transactions={detailTxs}
          loading={detailLoading}
          onClose={() => setDetailCategory(null)}
        />
      )}
    </div>
  );
}

// ─── Header Section ──────────────────────────────────────────

function HeaderSection({
  monthName,
  savingsRate,
  net,
  income,
  expense,
  transactionCount,
}: {
  monthName: string;
  savingsRate: number;
  net: number;
  income: number;
  expense: number;
  transactionCount?: number;
}) {
  return (
    <div className="gradient-purple rounded-b-[36px] px-5 md:px-8 pt-14 pb-6 text-white relative overflow-hidden">
      <div className="absolute top-0 right-0 w-56 h-56 bg-white/5 rounded-full -translate-y-1/3 translate-x-1/4 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4 pointer-events-none" />

      <div className="relative z-10 space-y-5">
        {/* Month label + savings badge */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/50 text-xs font-medium uppercase tracking-widest">Ringkasan</p>
            <p className="text-sm font-bold text-white/90 mt-0.5">{monthName}</p>
          </div>
          <div
            className={`px-3 py-1.5 rounded-full text-xs font-bold backdrop-blur-sm border ${
              savingsRate >= 0
                ? "bg-emerald-400/20 border-emerald-400/30 text-emerald-200"
                : "bg-red-400/20 border-red-400/30 text-red-200"
            }`}
          >
            {savingsRate >= 0 ? "+" : ""}
            {savingsRate}% saved
          </div>
        </div>

        {/* Net savings */}
        <div>
          <p className="text-white/50 text-[11px] font-medium mb-1">Sisa bulan ini</p>
          <p className={`text-4xl md:text-5xl font-bold font-display tracking-tight ${net < 0 ? "text-red-300" : "text-white"}`}>
            <AnimatedNumber value={net} />
          </p>
        </div>

        {/* Income & Expense */}
        <div className="grid grid-cols-2 gap-3">
          <SummaryCard
            label="Pemasukan"
            value={income}
            iconColor="#34d399"
            iconBg="bg-emerald-400/20"
            iconPath="M12 19V5M5 12l7-7 7 7"
            footer={transactionCount !== undefined ? `${transactionCount} transaksi` : undefined}
          />
          <SummaryCard
            label="Pengeluaran"
            value={expense}
            iconColor="#f87171"
            iconBg="bg-red-400/20"
            iconPath="M12 5v14M19 12l-7 7-7-7"
            progressBar={income > 0 ? Math.min((expense / income) * 100, 100) : undefined}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Summary Card (Income / Expense) ─────────────────────────

function SummaryCard({
  label,
  value,
  iconColor,
  iconBg,
  iconPath,
  footer,
  progressBar,
}: {
  label: string;
  value: number;
  iconColor: string;
  iconBg: string;
  iconPath: string;
  footer?: string;
  progressBar?: number;
}) {
  return (
    <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-3.5 md:p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className={`w-7 h-7 md:w-8 md:h-8 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d={iconPath} />
          </svg>
        </div>
        <span className="text-white/60 text-[11px] md:text-xs font-semibold">{label}</span>
      </div>
      <p className="text-white font-bold text-base md:text-xl leading-tight break-all">
        <AnimatedNumber value={value} />
      </p>
      {footer && <p className="text-white/40 text-[10px]">{footer}</p>}
      {progressBar !== undefined && (
        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-red-400/70 rounded-full transition-all duration-700"
            style={{ width: `${progressBar}%` }}
          />
        </div>
      )}
    </div>
  );
}

// ─── Top Spending Section ────────────────────────────────────

function TopSpendingSection({
  items,
  onSelect,
}: {
  items: CategoryBreakdown[];
  onSelect: (c: CategoryBreakdown) => void;
}) {
  return (
    <div className="px-5 md:px-8 mt-6">
      <h2 className="text-base font-bold font-display text-gray-900 mb-3">Top Spending</h2>
      {items.length === 0 ? (
        <p className="text-sm text-gray-400 py-4">Belum ada pengeluaran</p>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
          {items.map((c, i) => (
            <div
              key={c.categoryId}
              onClick={() => onSelect(c)}
              className={`shrink-0 flex flex-col items-center gap-2 cursor-pointer hover:scale-105 active:scale-95 transition-transform animate-fade-in stagger-${i + 1}`}
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
  );
}

// ─── Daily Spending Card ─────────────────────────────────────

function DailySpendingCard({
  todayLabel,
  todaySpent,
  dailyBudget,
  dailyRemaining,
  dailyPercentage,
  isOver,
  transactions,
}: {
  todayLabel: string;
  todaySpent: number;
  dailyBudget: number;
  dailyRemaining: number;
  dailyPercentage: number;
  isOver: boolean;
  transactions: any[];
}) {
  return (
    <div className="px-5 md:px-8 mt-6">
      <h2 className="text-base font-bold font-display text-gray-900 mb-3">Pengeluaran Hari Ini</h2>
      <div className="bg-white rounded-2xl p-5 shadow-card animate-fade-in">
        {/* Date + status badge */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-500 capitalize">{todayLabel}</p>
          {dailyBudget > 0 && (
            <span
              className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                !isOver ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"
              }`}
            >
              {!isOver ? "On track" : "Melebihi target harian"}
            </span>
          )}
        </div>

        {/* Big number */}
        <p
          className={`text-3xl md:text-4xl font-bold font-display tracking-tight mb-4 ${
            isOver ? "text-red-500" : "text-gray-900"
          }`}
        >
          <AnimatedNumber value={todaySpent} />
        </p>

        {/* Progress bar */}
        {dailyBudget > 0 ? (
          <>
            <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden mb-2">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  isOver ? "bg-red-500" : dailyPercentage > 70 ? "bg-amber-500" : "bg-primary-500"
                }`}
                style={{ width: `${Math.min(dailyPercentage, 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mb-4">
              {dailyRemaining >= 0 ? (
                <>
                  Sisa <span className="font-bold text-primary-600">{formatRupiah(dailyRemaining)}</span> dari{" "}
                  {formatRupiah(dailyBudget)}/hari
                </>
              ) : (
                <>
                  Melebihi <span className="font-bold text-red-500">{formatRupiah(Math.abs(dailyRemaining))}</span>{" "}
                  dari target {formatRupiah(dailyBudget)}/hari
                </>
              )}
            </p>
          </>
        ) : (
          <p className="text-xs text-gray-400 mb-4">Belum ada budget — set budget di halaman kategori</p>
        )}

        {/* Today's transactions */}
        {transactions.length > 0 ? (
          <div className="border-t border-gray-100 pt-3 space-y-2">
            {transactions.slice(0, 5).map((item: any) => (
              <div key={item.transaction.id} className="flex items-center gap-3 py-1.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {item.transaction.note || item.category?.name || "Pengeluaran"}
                  </p>
                  <p className="text-[11px] text-gray-400">{item.account?.name || ""}</p>
                </div>
                <span className="text-sm font-bold text-red-500 shrink-0">
                  -{formatRupiah(item.transaction.amount)}
                </span>
              </div>
            ))}
            {transactions.length > 5 && (
              <p className="text-[11px] text-gray-400 text-center pt-1">
                +{transactions.length - 5} transaksi lagi
              </p>
            )}
          </div>
        ) : (
          <div className="border-t border-gray-100 pt-4 pb-1 text-center">
            <p className="text-sm text-gray-400">Belum ada pengeluaran hari ini</p>
          </div>
        )}
      </div>
    </div>
  );
}
