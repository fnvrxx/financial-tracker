"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { Account, Category, TransactionForm as FormData } from "@/types";

interface Props {
  onSuccess: () => void;
}

interface FormErrors {
  amount?: string;
  accountId?: string;
  categoryId?: string;
  date?: string;
}

const INITIAL_FORM: FormData = {
  accountId: 0,
  categoryId: 0,
  type: "expense",
  amount: 0,
  note: "",
  date: new Date().toISOString().split("T")[0],
};

const MAX_AMOUNT = 999_999_999;
const MIN_AMOUNT = 100;

function validateForm(form: FormData): FormErrors {
  const errors: FormErrors = {};

  if (!form.amount || form.amount < MIN_AMOUNT) {
    errors.amount = `Minimal Rp ${MIN_AMOUNT.toLocaleString("id-ID")}`;
  } else if (form.amount > MAX_AMOUNT) {
    errors.amount = `Maksimal Rp ${MAX_AMOUNT.toLocaleString("id-ID")}`;
  }

  if (!form.accountId) {
    errors.accountId = "Pilih akun terlebih dahulu";
  }

  if (!form.categoryId) {
    errors.categoryId = "Pilih kategori terlebih dahulu";
  }

  if (!form.date) {
    errors.date = "Tanggal wajib diisi";
  } else if (form.date > new Date().toISOString().split("T")[0]) {
    errors.date = "Tidak boleh tanggal masa depan";
  }

  return errors;
}

export default function TransactionForm({ onSuccess }: Props) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"expense" | "income">("expense");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<FormData>({ ...INITIAL_FORM });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

  useEffect(() => {
    api.accounts.list().then(setAccounts);
    api.categories.list().then(setCategories);
  }, []);

  useEffect(() => {
    setForm((f) => ({ ...f, type, categoryId: 0 }));
    setErrors((e) => ({ ...e, categoryId: undefined }));
  }, [type]);

  const filtered = categories.filter((c) => c.type === type);

  function updateField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    // Clear field error on change
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    const fieldErrors = validateForm(form);
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    try {
      await api.transactions.create(form);
      setForm({
        ...INITIAL_FORM,
        accountId: form.accountId,
        type,
        date: new Date().toISOString().split("T")[0],
      });
      setErrors({});
      setOpen(false);
      showToast("Transaksi berhasil disimpan!");
      onSuccess();
    } catch (err) {
      setSubmitError((err as Error).message || "Gagal menyimpan transaksi");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Toast notification */}
      {toast && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-[60] animate-slide-up">
          <div className="flex items-center gap-2 bg-emerald-500 text-white px-5 py-3 rounded-2xl shadow-lg">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            <span className="text-sm font-semibold">{toast}</span>
          </div>
        </div>
      )}

      {/* FAB button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-20 right-5 md:right-8 w-14 h-14 gradient-purple text-white rounded-2xl shadow-purple flex items-center justify-center text-2xl z-40 hover:scale-105 active:scale-95 transition-transform"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      )}

      {/* Form modal */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl animate-slide-up sm:mx-4 flex flex-col max-h-[90dvh] sm:max-h-[85dvh]">

            {/* ── Header (sticky) ── */}
            <div className="px-6 pt-5 pb-4 shrink-0">
              <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4 sm:hidden" />
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold font-display">Tambah Transaksi</h2>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Type toggle */}
              <div className="flex gap-1 bg-gray-100 rounded-2xl p-1">
                {(["expense", "income"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
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
            </div>

            {/* ── Scrollable body ── */}
            <form id="tx-form" onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-6 space-y-4 pb-2">
              {/* Jumlah */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">
                  Jumlah
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">Rp</span>
                  <input
                    type="number"
                    placeholder="0"
                    value={form.amount || ""}
                    onChange={(e) => updateField("amount", Number(e.target.value))}
                    className={cn(
                      "w-full bg-gray-50 border-2 rounded-2xl pl-12 pr-4 py-3.5 text-xl font-bold outline-none transition-colors",
                      errors.amount
                        ? "border-red-300 focus:border-red-400"
                        : "border-gray-100 focus:border-primary-400"
                    )}
                    autoFocus
                  />
                </div>
                {errors.amount && <p className="text-xs text-red-500 mt-1.5 ml-1">{errors.amount}</p>}
              </div>

              {/* Akun */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">
                  Akun
                </label>
                <select
                  value={form.accountId || ""}
                  onChange={(e) => updateField("accountId", Number(e.target.value))}
                  className={cn(
                    "w-full bg-gray-50 border-2 rounded-2xl px-4 py-3 outline-none font-medium transition-colors",
                    errors.accountId
                      ? "border-red-300 focus:border-red-400"
                      : "border-gray-100 focus:border-primary-400"
                  )}
                >
                  <option value="">Pilih akun...</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={String(a.id)}>{a.name}</option>
                  ))}
                </select>
                {errors.accountId && <p className="text-xs text-red-500 mt-1.5 ml-1">{errors.accountId}</p>}
              </div>

              {/* Kategori */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                  Kategori
                </label>
                <div className="flex flex-wrap gap-2">
                  {filtered.length === 0 ? (
                    <p className="text-xs text-gray-400">Belum ada kategori — tambah di halaman Kategori</p>
                  ) : (
                    filtered.map((c) => (
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
                    ))
                  )}
                </div>
                {errors.categoryId && <p className="text-xs text-red-500 mt-1.5 ml-1">{errors.categoryId}</p>}
              </div>

              {/* Catatan & Tanggal */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">
                    Catatan
                  </label>
                  <input
                    type="text"
                    placeholder="Opsional"
                    maxLength={100}
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
                    max={new Date().toISOString().split("T")[0]}
                    onChange={(e) => updateField("date", e.target.value)}
                    className={cn(
                      "w-full bg-gray-50 border-2 rounded-2xl px-4 py-2.5 text-sm font-medium outline-none transition-colors",
                      errors.date
                        ? "border-red-300 focus:border-red-400"
                        : "border-gray-100 focus:border-primary-400"
                    )}
                  />
                  {errors.date && <p className="text-xs text-red-500 mt-1.5 ml-1">{errors.date}</p>}
                </div>
              </div>

              {/* Submit error */}
              {submitError && (
                <div className="bg-red-50 rounded-2xl px-4 py-3">
                  <p className="text-xs font-medium text-red-600">{submitError}</p>
                </div>
              )}
            </form>

            {/* ── Footer (sticky) ── */}
            <div className="px-6 pt-3 pb-6 sm:pb-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shrink-0 border-t border-gray-100">
              <button
                type="submit"
                form="tx-form"
                disabled={loading}
                className="w-full gradient-purple text-white py-4 rounded-2xl font-bold text-base shadow-purple hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {loading ? "Menyimpan..." : "Simpan Transaksi"}
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
