import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { ApiError, toErrorResponse } from "@/lib/api-error";

const updateCategorySchema = z.object({
  name: z.string().min(1),
});

async function findCategoryOrThrow(id: string) {
  const [category] = await db.select().from(categories).where(eq(categories.id, id));
  if (!category) {
    throw new ApiError(404, `Category ${id} not found`);
  }
  return category;
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const category = await findCategoryOrThrow(id);
    return NextResponse.json(category);
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await findCategoryOrThrow(id);
    const body = updateCategorySchema.parse(await request.json());
    const [updated] = await db.update(categories).set(body).where(eq(categories.id, id)).returning();
    return NextResponse.json(updated);
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await findCategoryOrThrow(id);
    await db.delete(categories).where(eq(categories.id, id));
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
