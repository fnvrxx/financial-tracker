import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { accounts } from "@/db/schema";

export async function GET() {
  const data = await db.select().from(accounts);
  return NextResponse.json(data, {
    headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=30" },
  });
}

export async function POST(req: NextRequest) {
  const [result] = await db.insert(accounts).values(await req.json()).returning();
  return NextResponse.json(result, { status: 201 });
}
