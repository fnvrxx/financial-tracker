import { google } from "googleapis";
import type { Transaction, Category, Account } from "@/db/schema";

function getSheets() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

const SHEET_ID = process.env.GOOGLE_SHEET_ID!;
const HEADERS = ["ID", "Date", "Type", "Category", "Account", "Amount", "Note", "Created At", "Synced At"];

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
  const sheets = getSheets();
  try {
    const sp = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
    const names = sp.data.sheets?.map((s) => s.properties?.title) || [];

    if (!names.includes("Transactions")) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SHEET_ID,
        requestBody: {
          requests: [{ addSheet: { properties: { title: "Transactions" } } }],
        },
      });
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: "Transactions!A1:I1",
        valueInputOption: "RAW",
        requestBody: { values: [HEADERS] },
      });
    }

    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
}

export async function appendTransaction(tx: Transaction, category: Category, account: Account) {
  try {
    const sheets = getSheets();
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: "Transactions!A:I",
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [buildRow(tx, category, account)] },
    });
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
}

export async function batchAppendTransactions(
  rows: { tx: Transaction; category: Category; account: Account }[]
) {
  try {
    const sheets = getSheets();
    const values = rows.map(({ tx, category, account }) => buildRow(tx, category, account));
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: "Transactions!A:I",
      valueInputOption: "USER_ENTERED",
      requestBody: { values },
    });
    return { success: true, count: rows.length };
  } catch (error) {
    return { success: false, error };
  }
}
