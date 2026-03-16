"use client";

import { useState } from "react";
import { api } from "@/lib/api-client";

// TODO: expand dengan full icon library, ganti path SVG dengan komponen lucide-react
const ICON_OPTIONS = [
  { key: "utensils",     label: "Makan",      path: "M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2M7 2v20M21 15V2a5 5 0 0 0-5 5v6h3" },
  { key: "car",          label: "Transport",  path: "M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v9a2 2 0 0 1-2 2h-2m-6 0a2 2 0 1 0 4 0 2 2 0 0 0-4 0m-6 0a2 2 0 1 0 4 0 2 2 0 0 0-4 0" },
  { key: "shopping-bag", label: "Belanja",    path: "M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0" },
  { key: "heart",        label: "Kesehatan",  path: "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" },
  { key: "briefcase",    label: "Kerja",      path: "M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" },
  { key: "home",         label: "Rumah",      path: "M3 9l9-7 9 7v11a2 2 0 1-2 2H5a2 2 0 1-2-2z M9 22V12h6v10" },
  { key: "zap",          label: "Tagihan",    path: "M13 2L3 14h9l-1 8 10-12h-9l1-8z" },
  { key: "tag",          label: "Lainnya",    path: "M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82zM7 7h.01" },
] as const;

const COLOR_PALETTE = [
  "#7c4dff", "#536dfe", "#00bcd4", "#10b981",
  "#f97316", "#ef4444", "#ec4899", "#f59e0b",
] as const;

interface FormState {
  name: string;
  icon: string;
  color: string;
  type: "expense" | "income";
  monthlyBudget: string;
}

const INITIAL_FORM: FormState = {
  name: "",
  icon: "tag",
  color: "#7c4dff",
  type: "expense",
  monthlyBudget: "",
};

export default function CreateBudgetForm({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const monthlyNum = Number(form.monthlyBudget);
  const dailyPreview = monthlyNum > 0 ? Math.round(monthlyNum / 30) : 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || monthlyNum <= 0) return;
    setLoading(true);
    setError(null);
    try {
      const newCategory = await api.categories.create({
        name: form.name.trim(),
        icon: form.icon,
        type: form.type,
        color: form.color,
      });
      await api.budgets.create({ categoryId: newCategory.id, limitAmount: monthlyNum, period: "monthly" });
      setForm({ ...INITIAL_FORM });
      setOpen(false);
      onSuccess();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-5 md:right-8 w-14 h-14 bg-white border-2 border-primary-300 text-primary-500 rounded-2xl shadow-card flex items-center justify-center hover:scale-105 active:scale-95 transition-transform z-40"
        aria-label="Tambah kategori budget"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>

      {/* Modal overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-6 pb-10 sm:pb-6 animate-slide-up sm:mx-4 max-h-[92vh] overflow-y-auto">
            {/* Drag handle (mobile) */}
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5 sm:hidden" />

            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900 font-display">New Budget Category</h2>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Nama kategori */}
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">
                  Nama Kategori
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Makan Siang"
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm font-medium text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-transparent"
                  required
                />
              </div>

              {/* Ikon */}
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">
                  Ikon
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {ICON_OPTIONS.map((icon) => (
                    <button
                      key={icon.key}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, icon: icon.key }))}
                      className={`flex flex-col items-center gap-1.5 py-3 rounded-2xl border-2 transition-all ${
                        form.icon === icon.key
                          ? "border-primary-400 bg-primary-50"
                          : "border-gray-100 bg-gray-50 hover:border-gray-200"
                      }`}
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={form.icon === icon.key ? form.color : "#9ca3af"}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d={icon.path} />
                      </svg>
                      <span className={`text-[10px] font-medium ${form.icon === icon.key ? "text-primary-600" : "text-gray-400"}`}>
                        {icon.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Warna */}
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">
                  Warna
                </label>
                <div className="flex gap-3 flex-wrap">
                  {COLOR_PALETTE.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, color }))}
                      className={`w-9 h-9 rounded-full transition-all ${
                        form.color === color ? "scale-110 ring-2 ring-offset-2 ring-gray-400" : "hover:scale-105"
                      }`}
                      style={{ background: color }}
                      aria-label={color}
                    />
                  ))}
                </div>
              </div>

              {/* Target Bulanan */}
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">
                  Target Bulanan
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">Rp</span>
                  <input
                    type="number"
                    value={form.monthlyBudget}
                    onChange={(e) => setForm((f) => ({ ...f, monthlyBudget: e.target.value }))}
                    placeholder="0"
                    min="1"
                    className="w-full pl-10 pr-4 py-3 rounded-2xl border border-gray-200 text-sm font-medium text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              {/* Preview Target Harian */}
              {dailyPreview > 0 && (
                <div className="animate-fade-in bg-primary-50 rounded-2xl px-4 py-3 flex items-center justify-between">
                  <span className="text-xs font-bold text-primary-600 uppercase tracking-wide">Target Harian</span>
                  <span className="text-sm font-bold text-primary-700">
                    Rp {dailyPreview.toLocaleString("id-ID")}
                  </span>
                </div>
              )}

              {/* Error inline */}
              {error && (
                <div className="bg-red-50 rounded-2xl px-4 py-3">
                  <p className="text-xs font-medium text-red-600">{error}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || !form.name.trim() || monthlyNum <= 0}
                className="w-full py-3.5 rounded-2xl bg-primary-500 text-white text-sm font-bold shadow-button transition-all hover:bg-primary-600 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Menyimpan..." : "Buat Kategori"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
