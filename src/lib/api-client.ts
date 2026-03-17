const BASE = "/api";

// Simple in-memory cache with TTL
const cache = new Map<string, { data: unknown; expires: number }>();
const TTL = 30_000; // 30 seconds

function getCache<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) { cache.delete(key); return null; }
  return entry.data as T;
}

function setCache(key: string, data: unknown, ttl = TTL) {
  cache.set(key, { data, expires: Date.now() + ttl });
}

export function invalidateCache(pattern?: string) {
  if (!pattern) { cache.clear(); return; }
  for (const key of cache.keys()) {
    if (key.includes(pattern)) cache.delete(key);
  }
}

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

async function cachedFetch<T>(url: string, ttl = TTL): Promise<T> {
  const cached = getCache<T>(url);
  if (cached !== null) return cached;
  const data = await fetcher<T>(url);
  setCache(url, data, ttl);
  return data;
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
      invalidateCache("/reports");
      invalidateCache("/budgets");
      return fetcher<any>("/transactions", { method: "POST", body: JSON.stringify(data) });
    },
    delete(id: number) {
      invalidateCache("/reports");
      invalidateCache("/budgets");
      return fetcher<any>("/transactions?id=" + id, { method: "DELETE" });
    },
  },
  accounts: {
    list: () => cachedFetch<any[]>("/accounts", 60_000), // accounts change rarely
  },
  categories: {
    list: (type?: string) => cachedFetch<any[]>("/categories" + (type ? "?type=" + type : ""), 60_000),
    create: (data: { name: string; icon: string; type: "income" | "expense"; color: string }) => {
      invalidateCache("/categories");
      return fetcher<{ id: number; name: string; icon: string; type: string; color: string }>(
        "/categories",
        { method: "POST", body: JSON.stringify(data) }
      );
    },
  },
  budgets: {
    list: (month?: string) => cachedFetch<any[]>("/budgets" + (month ? "?month=" + month : ""), TTL),
    create: (d: any) => {
      invalidateCache("/budgets");
      return fetcher("/budgets", { method: "POST", body: JSON.stringify(d) });
    },
    update: (d: any) => {
      invalidateCache("/budgets");
      return fetcher("/budgets", { method: "PUT", body: JSON.stringify(d) });
    },
  },
  reports: {
    summary(from?: string, to?: string) {
      const sp = new URLSearchParams({ type: "summary" });
      if (from) sp.set("from", from);
      if (to) sp.set("to", to);
      return cachedFetch<any>("/reports?" + sp, TTL);
    },
    byCategory(from?: string, to?: string) {
      const sp = new URLSearchParams({ type: "byCategory" });
      if (from) sp.set("from", from);
      if (to) sp.set("to", to);
      return cachedFetch<any[]>("/reports?" + sp, TTL);
    },
    trend: (to?: string, period?: "monthly" | "weekly") => {
      const p = new URLSearchParams({ type: "trend" });
      if (to) p.set("to", to);
      if (period) p.set("period", period);
      return cachedFetch<any[]>("/reports?" + p, TTL);
    },
  },
  sync: {
    status: () => fetcher<any>("/sync"),
    process: () => fetcher("/sync?action=process", { method: "POST" }),
    init: () => fetcher("/sync?action=init", { method: "POST" }),
  },
};
