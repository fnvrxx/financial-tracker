import { NextRequest, NextResponse } from "next/server";
import { getCategories, createCategory } from "@/lib/sheets-db";

export async function GET(req: NextRequest) {
  const type = new URL(req.url).searchParams.get("type") as "income" | "expense" | null;
  const data = await getCategories(type ?? undefined);
  return NextResponse.json(data, {
    headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=30" },
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const result = await createCategory({
    name: body.name,
    icon: body.icon ?? "tag",
    type: body.type,
    color: body.color ?? "#7c4dff",
  });
  return NextResponse.json(result, { status: 201 });
}
