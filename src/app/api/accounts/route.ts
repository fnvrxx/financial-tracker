import { NextRequest, NextResponse } from "next/server";
import { getAccounts, createAccount } from "@/lib/sheets-db";

export async function GET() {
  const data = await getAccounts();
  return NextResponse.json(data, {
    headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=30" },
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const result = await createAccount({
    name: body.name,
    type: body.type ?? "cash",
    balance: body.balance ?? 0,
    icon: body.icon ?? "wallet",
  });
  return NextResponse.json(result, { status: 201 });
}
