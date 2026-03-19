"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import dayjs from "dayjs";
import { api } from "@/lib/api-client";
import { formatRupiah, formatDate } from "@/lib/utils";
import { useRefreshListener } from "@/lib/events";
import PageHeader from "@/components/PageHeader";
import LoadingSpinner from "@/components/LoadingSpinner";
import type { TransactionWithRelations } from "@/types";

type FilterType = "all" | "income" | "expense";

const FILTER_LABELS: Record<FilterType, string> = {
  all: "Semua",
  income: "Pemasukan",
  expense: "Pengeluaran",
};

const DAY_LABELS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

function groupByDate(items: TransactionWithRelations[]) {
  return items.reduce<Record<string, TransactionWithRelations[]>>((acc, item) => {
    const date = item.transaction.date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(item);
    return acc;
  }, {});
}

function buildCalendarDays(year: number, month: number): Date[] {
  const first = dayjs(new Date(year, month)).startOf("month");
  const last = first.endOf("month");
  const start = first.startOf("week");
  const end = last.endOf("week");
  const days: Date[] = [];
  let cur = start;
  while (cur.isBefore(end) || cur.isSame(end, "day")) {
    days.push(cur.toDate());
    cur = cur.add(1, "day");
  }
  return days;
}

export default function TransactionsPage() {
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [transactions, setTransactions] = useState<TransactionWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  }

  const from = dayjs(new Date(calYear, calMonth)).startOf("month").format("YYYY-MM-DD");
  const to = dayjs(new Date(calYear, calMonth)).endOf("month").format("YYYY-MM-DD");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { limit: 100, from, to };
      if (filter !== "all") params.type = filter;
      setTransactions(await api.transactions.list(params));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calYear, calMonth, filter]);

  useEffect(() => {
    setSelectedDate(null);
  }, [calYear, calMonth]);

  useEffect(() => { refresh(); }, [refresh]);
  useRefreshListener(refresh);

  async function handleDelete(id: number) {
    if (!confirm("Hapus transaksi ini?")) return;
    try {
      await api.transactions.delete(id);
      showToast("Transaksi berhasil dihapus");
      refresh();
    } catch (err) {
      showToast("Gagal menghapus transaksi", "error");
      console.error(err);
    }
  }

  // Dates that have at least one transaction
  const txDates = useMemo(() => new Set(transactions.map((t) => t.transaction.date)), [transactions]);

  // Income/expense per date for dot coloring
  const dateSummary = useMemo(() => {
    const map: Record<string, { income: number; expense: number }> = {};
    for (const { transaction: tx } of transactions) {
      if (!map[tx.date]) map[tx.date] = { income: 0, expense: 0 };
      map[tx.date][tx.type] += tx.amount;
    }
    return map;
  }, [transactions]);

  // Filtered list for the transaction list below
  const filtered = useMemo(() => {
    if (!selectedDate) return transactions;
    return transactions.filter((t) => t.transaction.date === selectedDate);
  }, [transactions, selectedDate]);

  const grouped = groupByDate(filtered);

  // Calendar
  const calDays = buildCalendarDays(calYear, calMonth);
  const curMonthDate = new Date(calYear, calMonth);

  function prevMonth() {
    const d = dayjs(curMonthDate).subtract(1, "month");
    setCalYear(d.year());
    setCalMonth(d.month());
  }
  function nextMonth() {
    const d = dayjs(curMonthDate).add(1, "month");
    if (d.toDate() > now) return;
    setCalYear(d.year());
    setCalMonth(d.month());
  }

  const monthTotals = useMemo(() => {
    let income = 0, expense = 0;
    for (const { transaction: tx } of filtered) {
      if (tx.type === "income") income += tx.amount;
      else expense += tx.amount;
    }
    return { income, expense };
  }, [filtered]);

  return (
    <div className="max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto pb-24">

      {/* Toast notification */}
      {toast && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-[60] animate-slide-up">
          <div className={`flex items-center gap-2 px-5 py-3 rounded-2xl shadow-lg text-white ${
            toast.type === "success" ? "bg-emerald-500" : "bg-red-500"
          }`}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              {toast.type === "success"
                ? <path d="M20 6L9 17l-5-5" />
                : <path d="M18 6L6 18M6 6l12 12" />}
            </svg>
            <span className="text-sm font-semibold">{toast.msg}</span>
          </div>
        </div>
      )}

      <PageHeader title="Transaksi">
        <div className="flex gap-2">
          {(Object.keys(FILTER_LABELS) as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                filter === f
                  ? "bg-white text-primary-600 shadow-lg"
                  : "bg-white/15 text-white/80"
              }`}
            >
              {FILTER_LABELS[f]}
            </button>
          ))}
        </div>
      </PageHeader>

      {/* Calendar */}
      <div className="px-5 md:px-8 mt-5">
        <div className="bg-white rounded-3xl shadow-card p-4">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={prevMonth}
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <p className="text-sm font-bold text-gray-900">
              {dayjs(curMonthDate).format("MMMM YYYY")}
            </p>
            <button
              onClick={nextMonth}
              disabled={dayjs(curMonthDate).add(1, "month").toDate() > now}
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAY_LABELS.map((d) => (
              <div key={d} className="text-center text-[10px] font-bold text-gray-400 py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Date cells */}
          <div className="grid grid-cols-7 gap-y-1">
            {calDays.map((day, i) => {
              const dj = dayjs(day);
              const dateStr = dj.format("YYYY-MM-DD");
              const inMonth = dj.month() === calMonth && dj.year() === calYear;
              const isSelected = selectedDate === dateStr;
              const hasTx = txDates.has(dateStr);
              const summary = dateSummary[dateStr];
              const today = dj.isSame(dayjs(), "day");

              return (
                <button
                  key={i}
                  onClick={() => {
                    if (!inMonth || !hasTx) return;
                    setSelectedDate(isSelected ? null : dateStr);
                  }}
                  className={`relative flex flex-col items-center py-1.5 rounded-xl transition-all ${
                    isSelected
                      ? "bg-primary-500"
                      : today && inMonth
                        ? "bg-primary-50"
                        : hasTx && inMonth
                          ? "hover:bg-gray-50 cursor-pointer"
                          : "cursor-default"
                  }`}
                >
                  <span className={`text-[12px] font-bold leading-none ${
                    isSelected
                      ? "text-white"
                      : today && inMonth
                        ? "text-primary-600"
                        : inMonth
                          ? "text-gray-800"
                          : "text-gray-200"
                  }`}>
                    {dj.date()}
                  </span>

                  {/* Transaction dots */}
                  {hasTx && inMonth && (
                    <div className="flex gap-0.5 mt-1">
                      {summary?.expense > 0 && (
                        <span className={`w-1 h-1 rounded-full ${isSelected ? "bg-red-200" : "bg-red-400"}`} />
                      )}
                      {summary?.income > 0 && (
                        <span className={`w-1 h-1 rounded-full ${isSelected ? "bg-emerald-200" : "bg-emerald-400"}`} />
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Summary strip */}
          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
            {selectedDate ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-700">
                  {formatDate(selectedDate)}
                </span>
                <button
                  onClick={() => setSelectedDate(null)}
                  className="text-[10px] text-gray-400 hover:text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full transition-colors"
                >
                  Lihat semua
                </button>
              </div>
            ) : (
              <span className="text-xs text-gray-400">{filtered.length} transaksi bulan ini</span>
            )}
            <div className="flex gap-3">
              {monthTotals.income > 0 && (
                <span className="text-[11px] font-bold text-emerald-600">+{formatRupiah(monthTotals.income)}</span>
              )}
              {monthTotals.expense > 0 && (
                <span className="text-[11px] font-bold text-red-500">-{formatRupiah(monthTotals.expense)}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Transaction list */}
      <div className="px-5 md:px-8 mt-5 space-y-4">
        {loading ? (
          <LoadingSpinner />
        ) : Object.keys(grouped).length === 0 ? (
          <div className="text-center py-12">
            <div className="w-14 h-14 bg-primary-50 rounded-3xl flex items-center justify-center mx-auto mb-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7c4dff" strokeWidth="1.5" strokeLinecap="round">
                <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z" />
                <polyline points="13 2 13 9 20 9" />
              </svg>
            </div>
            <p className="text-gray-900 font-bold">Belum ada transaksi</p>
            <p className="text-sm text-gray-400 mt-1">
              {selectedDate ? "Di tanggal ini" : "Di bulan ini"}
            </p>
          </div>
        ) : (
          Object.entries(grouped)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, items]) => (
              <div key={date} className="animate-fade-in">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">
                  {formatDate(date)}
                </p>
                <div className="bg-white rounded-2xl shadow-card overflow-hidden divide-y divide-gray-50">
                  {items.map(({ transaction: tx, category, account }) => (
                    <div
                      key={tx.id}
                      className="flex items-center gap-3 p-4 hover:bg-gray-50/50 transition-colors cursor-pointer"
                      onClick={() => handleDelete(tx.id)}
                    >
                      <div
                        className="w-11 h-11 rounded-2xl flex items-center justify-center text-sm font-bold shrink-0"
                        style={{
                          background: `${category.color || "#7c4dff"}15`,
                          color: category.color || "#7c4dff",
                        }}
                      >
                        {category.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900">{category.name}</p>
                        <p className="text-[11px] text-gray-400 truncate">
                          {tx.note || account.name}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-sm font-bold ${
                          tx.type === "income" ? "text-emerald-500" : "text-red-500"
                        }`}>
                          {tx.type === "income" ? "+" : "-"}
                          {formatRupiah(tx.amount)}
                        </p>
                        <div className="flex items-center gap-1 justify-end mt-0.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            tx.synced ? "bg-emerald-400" : "bg-gray-300"
                          }`} />
                          <span className="text-[9px] text-gray-400">
                            {tx.synced ? "synced" : "pending"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  );
}
