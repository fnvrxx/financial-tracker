"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { Account, Category, TransactionForm as FormData } from "@/types";

interface Props {
  onSuccess: () => void;
}

const INITIAL_FORM: FormData = {
  accountId: 0,
  categoryId: 0,
  type: "expense",
  amount: 0,
  note: "",
  date: new Date().toISOString().split("T")[0],
};

export default function TransactionForm({ onSuccess }: Props) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"expense" | "income">("expense");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<FormData>({ ...INITIAL_FORM });

  useEffect(() => {
    api.accounts.list().then(setAccounts);
    api.categories.list().then(setCategories);
  }, []);

  useEffect(() => {
    setForm((f) => ({ ...f, type, categoryId: 0 }));
  }, [type]);

  const filtered = categories.filter((c) => c.type === type);

  function updateField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.accountId || !form.categoryId || form.amount <= 0) return;
    setLoading(true);
    try {
      await api.transactions.create(form);
      setForm({
        ...INITIAL_FORM,
        accountId: form.accountId,
        type,
        date: new Date().toISOString().split("T")[0],
      });
      setOpen(false);
      onSuccess();
    } catch (err) {
      alert("Gagal: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-5 md:right-8 w-14 h-14 gradient-purple text-white rounded-2xl shadow-purple flex items-center justify-center text-2xl z-40 hover:scale-105 active:scale-95 transition-transform"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center"
      onClick={(e) => e.target === e.currentTarget && setOpen(false)}
    >
      <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-6 pb-10 sm:pb-6 animate-slide-up sm:mx-4">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5 sm:hidden" />
        <h2 className="text-lg font-bold font-display mb-4">Tambah Transaksi</h2>

        {/* Type toggle */}
        <div className="flex gap-1 mb-5 bg-gray-100 rounded-2xl p-1">
          {(["expense", "income"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={cn(
                "flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all",
                type === t
                  ? t === "expense"
                    ? "bg-red-500 text-white shadow-md"
                    : "bg-emerald-500 text-white shadow-md"
                  : "text-gray-500"
              )}
            >
              {t === "expense" ? "Pengeluaran" : "Pemasukan"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">
              Jumlah
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">
                Rp
              </span>
              <input
                type="number"
                placeholder="0"
                value={form.amount || ""}
                onChange={(e) => updateField("amount", Number(e.target.value))}
                className="w-full bg-gray-50 border-2 border-gray-100 focus:border-primary-400 rounded-2xl pl-12 pr-4 py-3.5 text-xl font-bold outline-none transition-colors"
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">
              Akun
            </label>
            <select
              value={form.accountId}
              onChange={(e) => updateField("accountId", Number(e.target.value))}
              className="w-full bg-gray-50 border-2 border-gray-100 focus:border-primary-400 rounded-2xl px-4 py-3 outline-none font-medium transition-colors"
            >
              <option value={0}>Pilih akun...</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
              Kategori
            </label>
            <div className="flex flex-wrap gap-2">
              {filtered.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => updateField("categoryId", c.id)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold border-2 transition-all",
                    form.categoryId === c.id
                      ? "border-primary-500 bg-primary-50 text-primary-700 scale-105"
                      : "border-gray-100 text-gray-600 hover:border-primary-200"
                  )}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">
                Catatan
              </label>
              <input
                type="text"
                placeholder="Opsional"
                value={form.note}
                onChange={(e) => updateField("note", e.target.value)}
                className="w-full bg-gray-50 border-2 border-gray-100 focus:border-primary-400 rounded-2xl px-4 py-2.5 text-sm font-medium outline-none transition-colors"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">
                Tanggal
              </label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => updateField("date", e.target.value)}
                className="w-full bg-gray-50 border-2 border-gray-100 focus:border-primary-400 rounded-2xl px-4 py-2.5 text-sm font-medium outline-none transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !form.accountId || !form.categoryId || form.amount <= 0}
            className="w-full gradient-purple text-white py-4 rounded-2xl font-bold text-base shadow-purple hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all mt-2"
          >
            {loading ? "Menyimpan..." : "Simpan Transaksi"}
          </button>
        </form>
      </div>
    </div>
  );
}
