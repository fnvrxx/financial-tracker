"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { api } from "@/lib/api-client";
import { formatRupiah } from "@/lib/utils";
import { useRefreshListener } from "@/lib/events";
import PageHeader from "@/components/PageHeader";
import LoadingSpinner from "@/components/LoadingSpinner";
import type { ReportSummary, CategoryBreakdown } from "@/types";

const DonutChart = dynamic(() => import("@/components/DonutChart"), {
  ssr: false,
  loading: () => <div className="w-[180px] h-[180px] rounded-full bg-gray-100 animate-pulse" />,
});

const currentYear = new Date().getFullYear();

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

const MONTH_FULL = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const COLORS = [
  "#7c4dff", "#ef4444", "#f97316", "#06b6d4",
  "#10b981", "#ec4899", "#8b5cf6", "#3b82f6",
];

function pad(n: number) { return String(n).padStart(2, "0"); }

function getMonthRange(year: number, month: number) {
  const from = `${year}-${pad(month + 1)}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const to = `${year}-${pad(month + 1)}-${pad(lastDay)}`;
  return { from, to };
}

export default function GraphPage() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [categories, setCategories] = useState<CategoryBreakdown[]>([]);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const tabsRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { from, to } = getMonthRange(selectedYear, selectedMonth);
    try {
      const [c, s] = await Promise.all([
        api.reports.byCategory(from, to),
        api.reports.summary(from, to),
      ]);
      setCategories(c);
      setSummary(s);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useRefreshListener(fetchData);

  useEffect(() => {
    if (tabsRef.current) {
      const active = tabsRef.current.querySelector('[data-active="true"]');
      if (active) {
        active.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      }
    }
  }, [selectedMonth]);

  const expenseCategories = categories.filter((c) => c.type === "expense");
  const totalExpense = expenseCategories.reduce((s, c) => s + c.total, 0);

  const segments = expenseCategories.map((c, i) => ({
    label: c.categoryName,
    value: c.total,
    color: c.categoryColor || COLORS[i % COLORS.length],
  }));

  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  return (
    <div className="max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto pb-24">
      <PageHeader
        title="Billing Reports"
        icon={
          <button onClick={() => setShowYearPicker(!showYearPicker)} className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center hover:bg-white/30 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
          </button>
        }
      >
        {/* Year picker dropdown */}
        {showYearPicker && (
          <div className="flex gap-2 mb-3 animate-fade-in">
            {yearOptions.map((y) => (
              <button
                key={y}
                onClick={() => { setSelectedYear(y); setShowYearPicker(false); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedYear === y
                    ? "bg-white text-primary-600 shadow-lg"
                    : "bg-white/15 text-white/70 hover:text-white"
                }`}
              >
                {y}
              </button>
            ))}
          </div>
        )}

        {/* Month tabs */}
        <div ref={tabsRef} className="flex gap-1 overflow-x-auto month-tabs -mx-1 px-1">
          {MONTH_NAMES.map((name, i) => (
            <button
              key={i}
              data-active={selectedMonth === i}
              onClick={() => setSelectedMonth(i)}
              className={`shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                selectedMonth === i
                  ? "bg-white text-primary-600 shadow-lg"
                  : "text-white/60 hover:text-white/90"
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      </PageHeader>

      {/* Current selection label */}
      <div className="px-5 md:px-8 mt-4">
        <p className="text-sm text-gray-500 font-medium">
          {MONTH_FULL[selectedMonth]} {selectedYear}
        </p>
      </div>

      {/* Chart section */}
      <div className="px-5 md:px-8 mt-3">
        {loading ? (
          <LoadingSpinner />
        ) : (
          <>
            <div className="bg-white rounded-3xl p-6 shadow-card animate-scale-in">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <DonutChart
                  segments={segments}
                  total={totalExpense}
                  centerLabel={formatRupiah(totalExpense)}
                  size={180}
                />
                {/* Legend */}
                <div className="w-full sm:flex-1 space-y-2.5">
                  {segments.slice(0, 5).map((seg, i) => {
                    const pct = totalExpense > 0
                      ? Math.round((seg.value / totalExpense) * 100)
                      : 0;
                    return (
                      <div key={i} className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ background: seg.color }}
                        />
                        <span className="text-xs text-gray-600 flex-1">{seg.label}</span>
                        <span className="text-xs font-bold text-gray-900">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Category list */}
            <div className="mt-5 space-y-3 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
              {expenseCategories.map((c, i) => (
                <div
                  key={c.categoryId}
                  className={`bg-white rounded-2xl p-4 shadow-card flex items-center gap-3 animate-fade-in stagger-${Math.min(i + 1, 4)}`}
                >
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-base font-bold"
                    style={{
                      background: `${c.categoryColor || "#7c4dff"}15`,
                      color: c.categoryColor || "#7c4dff",
                    }}
                  >
                    {c.categoryName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900">{c.categoryName}</p>
                    <p className="text-[11px] text-gray-400">{c.count} transactions</p>
                  </div>
                  <p className="text-sm font-bold text-gray-900">{formatRupiah(c.total)}</p>
                </div>
              ))}
              {expenseCategories.length === 0 && (
                <div className="text-center py-12 md:col-span-2">
                  <p className="text-gray-400 text-sm">
                    Belum ada pengeluaran di {MONTH_FULL[selectedMonth]} {selectedYear}
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
