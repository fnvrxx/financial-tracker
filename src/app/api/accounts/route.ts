import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { accounts } from "@/db/schema";

export async function GET() {
  return NextResponse.json(await db.select().from(accounts));
}

export async function POST(req: NextRequest) {
  const [result] = await db.insert(accounts).values(await req.json()).returning();
  return NextResponse.json(result, { status: 201 });
}
