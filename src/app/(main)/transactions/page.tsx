"use client";

import { useState, useEffect, useCallback } from "react";
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

function groupByDate(items: TransactionWithRelations[]) {
  return items.reduce<Record<string, TransactionWithRelations[]>>((acc, item) => {
    const date = item.transaction.date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(item);
    return acc;
  }, {});
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<TransactionWithRelations[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { limit: 100 };
      if (filter !== "all") params.type = filter;
      setTransactions(await api.transactions.list(params));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { refresh(); }, [refresh]);
  useRefreshListener(refresh);

  async function handleDelete(id: number) {
    if (!confirm("Hapus transaksi ini?")) return;
    await api.transactions.delete(id);
    refresh();
  }

  const grouped = groupByDate(transactions);

  return (
    <div className="max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto pb-24">
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

      {/* Transaction list */}
      <div className="px-5 md:px-8 mt-5 space-y-4">
        {loading ? (
          <LoadingSpinner />
        ) : Object.keys(grouped).length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-primary-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#7c4dff" strokeWidth="1.5" strokeLinecap="round">
                <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z" />
                <polyline points="13 2 13 9 20 9" />
              </svg>
            </div>
            <p className="text-gray-900 font-bold">Belum ada transaksi</p>
            <p className="text-sm text-gray-400 mt-1">Tap + untuk menambahkan</p>
          </div>
        ) : (
          Object.entries(grouped).map(([date, items]) => (
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
