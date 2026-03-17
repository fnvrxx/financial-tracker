const BASE = "/api";

async function fetcher<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + url, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || "HTTP " + res.status);
  }
  return res.json();
}

export const api = {
  transactions: {
    list(params?: Record<string, any>) {
      const sp = new URLSearchParams();
      if (params) Object.entries(params).forEach(([k, v]) => { if (v !== undefined) sp.set(k, String(v)); });
      const qs = sp.toString();
      return fetcher<any[]>("/transactions" + (qs ? "?" + qs : ""));
    },
    create(data: any) {
      return fetcher<any>("/transactions", { method: "POST", body: JSON.stringify(data) });
    },
    delete(id: number) {
      return fetcher<any>("/transactions?id=" + id, { method: "DELETE" });
    },
  },
  accounts: {
    list: () => fetcher<any[]>("/accounts"),
  },
  categories: {
    list: (type?: string) => fetcher<any[]>("/categories" + (type ? "?type=" + type : "")),
    create: (data: { name: string; icon: string; type: "income" | "expense"; color: string }) =>
      fetcher<{ id: number; name: string; icon: string; type: string; color: string }>(
        "/categories",
        { method: "POST", body: JSON.stringify(data) }
      ),
  },
  budgets: {
    list: (month?: string) => fetcher<any[]>("/budgets" + (month ? "?month=" + month : "")),
    create: (d: any) => fetcher("/budgets", { method: "POST", body: JSON.stringify(d) }),
    update: (d: any) => fetcher("/budgets", { method: "PUT", body: JSON.stringify(d) }),
  },
  reports: {
    summary(from?: string, to?: string) {
      const sp = new URLSearchParams({ type: "summary" });
      if (from) sp.set("from", from);
      if (to) sp.set("to", to);
      return fetcher<any>("/reports?" + sp);
    },
    byCategory(from?: string, to?: string) {
      const sp = new URLSearchParams({ type: "byCategory" });
      if (from) sp.set("from", from);
      if (to) sp.set("to", to);
      return fetcher<any[]>("/reports?" + sp);
    },
    trend: (to?: string, period?: "monthly" | "weekly") => {
      const p = new URLSearchParams({ type: "trend" });
      if (to) p.set("to", to);
      if (period) p.set("period", period);
      return fetcher<any[]>("/reports?" + p);
    },
  },
  sync: {
    status: () => fetcher<any>("/sync"),
    process: () => fetcher("/sync?action=process", { method: "POST" }),
    init: () => fetcher("/sync?action=init", { method: "POST" }),
  },
};
