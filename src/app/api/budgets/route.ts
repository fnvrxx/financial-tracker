import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { budgets } from "@/db/schema";
import { eq } from "drizzle-orm";
import { checkBudgets } from "@/lib/budget-checker";

export async function GET(req: NextRequest) {
  const month = new URL(req.url).searchParams.get("month") ?? undefined;
  return NextResponse.json(await checkBudgets(month));
}

export async function POST(req: NextRequest) {
  const [result] = await db.insert(budgets).values(await req.json()).returning();
  return NextResponse.json(result, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const { id, ...data } = await req.json();
  await db.update(budgets).set(data).where(eq(budgets.id, id));
  return NextResponse.json({ success: true });
}
