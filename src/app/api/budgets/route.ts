import { NextRequest, NextResponse } from "next/server";
import { createBudget, updateBudget } from "@/lib/sheets-db";
import { checkBudgets } from "@/lib/budget-checker";

export async function GET(req: NextRequest) {
  const month = new URL(req.url).searchParams.get("month") ?? undefined;
  return NextResponse.json(await checkBudgets(month));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const result = await createBudget({
    categoryId: body.categoryId,
    limitAmount: body.limitAmount,
    period: body.period ?? "monthly",
  });
  return NextResponse.json(result, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const { id, ...data } = await req.json();
  await updateBudget(id, data);
  return NextResponse.json({ success: true });
}
