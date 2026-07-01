import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { toErrorResponse } from "@/lib/api-error";

const createCategorySchema = z.object({
  name: z.string().min(1),
});

export async function GET() {
  try {
    const rows = await db.select().from(categories);
    return NextResponse.json(rows);
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = createCategorySchema.parse(await request.json());
    const [category] = await db.insert(categories).values(body).returning();
    return NextResponse.json(category, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
