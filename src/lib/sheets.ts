import { GoogleAuth } from "google-auth-library";
import type { Transaction, Category, Account } from "@/db/schema";

const SHEET_ID = process.env.GOOGLE_SHEET_ID!;
const HEADERS = ["ID", "Date", "Type", "Category", "Account", "Amount", "Note", "Created At", "Synced At"];
const SHEETS_BASE = "https://sheets.googleapis.com/v4/spreadsheets";

// Cached auth client — created once, reused across all sync calls
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

function buildRow(tx: Transaction, category: Category, account: Account) {
  return [
    tx.id,
    tx.date,
    tx.type,
    category.name,
    account.name,
    tx.type === "income" ? tx.amount : -tx.amount,
    tx.note || "",
    String(tx.createdAt),
    new Date().toISOString(),
  ];
}

export async function initializeSheet() {
  try {
    const sp = await sheetsRequest("", "GET");
    const names: string[] = (sp.sheets || []).map((s: any) => s.properties?.title);

    if (!names.includes("Transactions")) {
      await sheetsRequest(":batchUpdate", "POST", {
        requests: [{ addSheet: { properties: { title: "Transactions" } } }],
      });
      await sheetsRequest("/values/Transactions!A1:I1?valueInputOption=RAW", "PUT", {
        values: [HEADERS],
      });
    }

    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
}

export async function appendTransaction(tx: Transaction, category: Category, account: Account) {
  try {
    await sheetsRequest(
      "/values/Transactions!A:I:append?valueInputOption=USER_ENTERED",
      "POST",
      { values: [buildRow(tx, category, account)] }
    );
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
}

export async function batchAppendTransactions(
  rows: { tx: Transaction; category: Category; account: Account }[]
) {
  try {
    const values = rows.map(({ tx, category, account }) => buildRow(tx, category, account));
    await sheetsRequest(
      "/values/Transactions!A:I:append?valueInputOption=USER_ENTERED",
      "POST",
      { values }
    );
    return { success: true, count: rows.length };
  } catch (error) {
    return { success: false, error };
  }
}
