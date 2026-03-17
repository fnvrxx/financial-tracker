import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const type = new URL(req.url).searchParams.get("type");

  const data = type
    ? await db.select().from(categories).where(eq(categories.type, type as "income" | "expense"))
    : await db.select().from(categories);

  return NextResponse.json(data, {
    headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=30" },
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const [result] = await db.insert(categories).values({
    name: body.name,
    icon: body.icon ?? "tag",
    type: body.type,
    color: body.color ?? "#7c4dff",
  }).returning();
  return NextResponse.json(result, { status: 201 });
}
