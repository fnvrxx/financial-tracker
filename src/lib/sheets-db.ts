import { GoogleAuth } from "google-auth-library";

const SHEET_ID = process.env.GOOGLE_SHEET_ID!;
const SHEETS_BASE = "https://sheets.googleapis.com/v4/spreadsheets";

let _auth: GoogleAuth | null = null;

function getAuth(): GoogleAuth {
  if (!_auth) {
    _auth = new GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
  }
  return _auth;
}

async function getToken(): Promise<string> {
  const client = await getAuth().getClient();
  const token = await (client as any).getAccessToken();
  return token.token as string;
}

async function sheetsRequest(path: string, method: string, body?: unknown) {
  const token = await getToken();
  const res = await fetch(`${SHEETS_BASE}/${SHEET_ID}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`Sheets API error: ${res.status} ${await res.text()}`);
  return res.json();
}

// ─── Sheet definitions ───────────────────────────────────────────────────────

const SHEET_DEFS: Record<string, string[]> = {
  Accounts:     ["id", "name", "type", "balance", "icon", "createdAt"],
  Categories:   ["id", "name", "icon", "type", "color"],
  Transactions: ["id", "accountId", "categoryId", "categoryName", "type", "amount", "note", "date", "createdAt"],
  Budgets:      ["id", "categoryId", "limitAmount", "period"],
};

// ─── In-memory cache ─────────────────────────────────────────────────────────
// Setiap sheet di-cache di memory server. Cache di-invalidate setelah write.
// TTL 60 detik sebagai safety net kalau proses server berbeda (misalnya multi-instance).

const CACHE_TTL = 60_000; // 60 detik

interface CacheEntry {
  rows: string[][];
  expiresAt: number;
}

const _cache = new Map<string, CacheEntry>();

function cacheGet(sheet: string): string[][] | null {
  const entry = _cache.get(sheet);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { _cache.delete(sheet); return null; }
  return entry.rows;
}

function cacheSet(sheet: string, rows: string[][]) {
  _cache.set(sheet, { rows, expiresAt: Date.now() + CACHE_TTL });
}

function cacheInvalidate(sheet: string) {
  _cache.delete(sheet);
}

// ─── Auto-init: buat sheet + header jika belum ada ───────────────────────────

const _confirmedSheets = new Set<string>();
// Satu promise global agar cek metadata spreadsheet tidak race condition
let _initPromise: Promise<void> | null = null;

async function ensureAllSheetsOnce(): Promise<void> {
  if (_confirmedSheets.size === Object.keys(SHEET_DEFS).length) return;
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    const sp = await sheetsRequest("", "GET");
    const existing: string[] = (sp.sheets || []).map((s: any) => s.properties?.title);
    for (const e of existing) _confirmedSheets.add(e);

    for (const [name, headers] of Object.entries(SHEET_DEFS)) {
      if (!_confirmedSheets.has(name)) {
        await sheetsRequest(":batchUpdate", "POST", {
          requests: [{ addSheet: { properties: { title: name } } }],
        });
        await sheetsRequest(`/values/${name}!A1?valueInputOption=RAW`, "PUT", {
          values: [headers],
        });
        _confirmedSheets.add(name);
      }
    }
  })();

  await _initPromise;
}

export async function initAllSheets(): Promise<{ success: boolean }> {
  // Reset agar paksa re-check
  _confirmedSheets.clear();
  _initPromise = null;
  await ensureAllSheetsOnce();
  return { success: true };
}

// ─── Low-level helpers ───────────────────────────────────────────────────────

async function readSheet(sheetName: string): Promise<string[][]> {
  await ensureAllSheetsOnce();

  const cached = cacheGet(sheetName);
  if (cached) return cached;

  const resp = await sheetsRequest(`/values/${sheetName}`, "GET");
  const rows: string[][] = (resp.values as string[][] | undefined) ?? [];
  cacheSet(sheetName, rows);
  return rows;
}

function rowsToObjects(rows: string[][]): Record<string, string>[] {
  if (rows.length < 2) return [];
  const [headers, ...data] = rows;
  return data.map((row) =>
    Object.fromEntries(headers.map((h, i) => [h, row[i] ?? ""]))
  );
}

async function appendRow(sheetName: string, values: (string | number | boolean)[]) {
  await sheetsRequest(
    `/values/${sheetName}!A:Z:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    "POST",
    { values: [values] }
  );
  cacheInvalidate(sheetName);
}

async function rewriteSheet(
  sheetName: string,
  headers: string[],
  rows: (string | number | boolean)[][]
) {
  await sheetsRequest(`/values/${sheetName}!A:Z:clear`, "POST");
  await sheetsRequest(`/values/${sheetName}!A1?valueInputOption=RAW`, "PUT", {
    values: [headers, ...rows],
  });
  cacheInvalidate(sheetName);
}

// ─── ID unik: timestamp (ms) + 3 digit random ────────────────────────────────

function uniqueId(): number {
  // Tetap di bawah Number.MAX_SAFE_INTEGER (9_007_199_254_740_991)
  // Date.now() ~= 1_745_000_000_000 (13 digit), kali 1000 = 16 digit → tidak aman
  // Solusi: gunakan detik (10 digit) × 10000 + random 4 digit → 14 digit, aman
  return Math.floor(Date.now() / 1000) * 10000 + Math.floor(Math.random() * 10000);
}

// ─── ACCOUNTS ────────────────────────────────────────────────────────────────

export interface Account {
  id: number;
  name: string;
  type: "cash" | "bank" | "ewallet";
  balance: number;
  icon: string;
  createdAt: string;
}

function parseAccount(r: Record<string, string>): Account {
  return {
    id: Number(r.id),
    name: r.name,
    type: r.type as Account["type"],
    balance: Number(r.balance),
    icon: r.icon || "wallet",
    createdAt: r.createdAt,
  };
}

export async function getAccounts(): Promise<Account[]> {
  const rows = await readSheet("Accounts");
  return rowsToObjects(rows).map(parseAccount);
}

export async function createAccount(data: Omit<Account, "id" | "createdAt">): Promise<Account> {
  const id = uniqueId();
  const createdAt = new Date().toISOString();
  await appendRow("Accounts", [id, data.name, data.type, data.balance, data.icon, createdAt]);
  return { id, createdAt, ...data };
}

export async function updateAccountBalance(id: number, delta: number): Promise<void> {
  const all = await getAccounts();
  const updated = all.map((a) => (a.id === id ? { ...a, balance: a.balance + delta } : a));
  await rewriteSheet(
    "Accounts",
    SHEET_DEFS.Accounts,
    updated.map((a) => [a.id, a.name, a.type, a.balance, a.icon, a.createdAt])
  );
}

// ─── CATEGORIES ──────────────────────────────────────────────────────────────

export interface Category {
  id: number;
  name: string;
  icon: string;
  type: "income" | "expense";
  color: string;
}

function parseCategory(r: Record<string, string>): Category {
  return {
    id: Number(r.id),
    name: r.name,
    icon: r.icon || "tag",
    type: r.type as Category["type"],
    color: r.color || "#7c4dff",
  };
}

export async function getCategories(type?: "income" | "expense"): Promise<Category[]> {
  const rows = await readSheet("Categories");
  const all = rowsToObjects(rows).map(parseCategory);
  return type ? all.filter((c) => c.type === type) : all;
}

export async function createCategory(data: Omit<Category, "id">): Promise<Category> {
  const id = uniqueId();
  await appendRow("Categories", [id, data.name, data.icon, data.type, data.color]);
  return { id, ...data };
}

// ─── TRANSACTIONS ────────────────────────────────────────────────────────────

export interface Transaction {
  id: number;
  accountId: number;
  categoryId: number;
  categoryName: string;
  type: "income" | "expense";
  amount: number;
  note: string;
  date: string;
  createdAt: string;
}

function parseTx(r: Record<string, string>): Transaction {
  return {
    id: Number(r.id),
    accountId: Number(r.accountId),
    categoryId: Number(r.categoryId),
    categoryName: r.categoryName || "",
    type: r.type as Transaction["type"],
    amount: Number(r.amount),
    note: r.note || "",
    date: r.date,
    createdAt: r.createdAt,
  };
}

export async function getTransactions(opts?: {
  limit?: number;
  offset?: number;
  from?: string;
  to?: string;
  type?: "income" | "expense";
  categoryId?: number;
}): Promise<Transaction[]> {
  const rows = await readSheet("Transactions");
  let all = rowsToObjects(rows).map(parseTx);

  if (opts?.from)       all = all.filter((t) => t.date >= opts.from!);
  if (opts?.to)         all = all.filter((t) => t.date <= opts.to!);
  if (opts?.type)       all = all.filter((t) => t.type === opts.type);
  if (opts?.categoryId) all = all.filter((t) => t.categoryId === opts.categoryId);

  all.sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);

  const offset = opts?.offset ?? 0;
  const limit  = opts?.limit  ?? 50;
  return all.slice(offset, offset + limit);
}

export async function getAllTransactionsRaw(): Promise<Transaction[]> {
  const rows = await readSheet("Transactions");
  return rowsToObjects(rows).map(parseTx);
}

export async function createTransaction(
  data: Omit<Transaction, "id" | "createdAt">
): Promise<Transaction> {
  const id = uniqueId();
  const createdAt = new Date().toISOString();
  await appendRow("Transactions", [
    id,
    data.accountId,
    data.categoryId,
    data.categoryName,
    data.type,
    data.amount,
    data.note,
    data.date,
    createdAt,
  ]);
  return { id, createdAt, ...data };
}

export async function deleteTransaction(id: number): Promise<Transaction | null> {
  const all = await getAllTransactionsRaw();
  const tx = all.find((t) => t.id === id) ?? null;
  if (!tx) return null;
  const remaining = all.filter((t) => t.id !== id);
  await rewriteSheet(
    "Transactions",
    SHEET_DEFS.Transactions,
    remaining.map((t) => [t.id, t.accountId, t.categoryId, t.categoryName, t.type, t.amount, t.note, t.date, t.createdAt])
  );
  return tx;
}

// ─── BUDGETS ─────────────────────────────────────────────────────────────────

export interface Budget {
  id: number;
  categoryId: number;
  limitAmount: number;
  period: "monthly" | "weekly";
}

function parseBudget(r: Record<string, string>): Budget {
  return {
    id: Number(r.id),
    categoryId: Number(r.categoryId),
    limitAmount: Number(r.limitAmount),
    period: r.period as Budget["period"],
  };
}

export async function getBudgets(): Promise<Budget[]> {
  const rows = await readSheet("Budgets");
  return rowsToObjects(rows).map(parseBudget);
}

export async function createBudget(data: Omit<Budget, "id">): Promise<Budget> {
  const id = uniqueId();
  await appendRow("Budgets", [id, data.categoryId, data.limitAmount, data.period]);
  return { id, ...data };
}

export async function updateBudget(id: number, data: Partial<Omit<Budget, "id">>): Promise<void> {
  const all = await getBudgets();
  const updated = all.map((b) => (b.id === id ? { ...b, ...data } : b));
  await rewriteSheet(
    "Budgets",
    SHEET_DEFS.Budgets,
    updated.map((b) => [b.id, b.categoryId, b.limitAmount, b.period])
  );
}
