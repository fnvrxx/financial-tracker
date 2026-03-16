import { NextRequest, NextResponse } from "next/server";
import { processSyncQueue, getSyncStatus } from "@/lib/sync";
import { initializeSheet } from "@/lib/sheets";

export async function GET() {
  return NextResponse.json(await getSyncStatus());
}

export async function POST(req: NextRequest) {
  const action = new URL(req.url).searchParams.get("action") || "process";

  if (action === "init") {
    return NextResponse.json(await initializeSheet());
  }
  if (action === "process") {
    return NextResponse.json(await processSyncQueue());
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
