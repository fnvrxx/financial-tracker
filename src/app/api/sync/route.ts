import { NextResponse } from "next/server";
import { initAllSheets } from "@/lib/sheets-db";

export async function GET() {
  // All data lives in Sheets — no separate sync queue needed
  return NextResponse.json({ status: "ok", message: "Data synced directly to Google Sheets" });
}

export async function POST() {
  return NextResponse.json(await initAllSheets());
}
