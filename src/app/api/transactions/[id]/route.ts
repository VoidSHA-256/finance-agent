import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { transactions, categories } from "@/db/schema";
import { ApiError, toErrorResponse } from "@/lib/api-error";

const decimalString = z.string().regex(/^-?\d+(\.\d{1,2})?$/, "Must be a decimal string like -45.20");
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be a date string like 2026-06-15");

const updateTransactionSchema = z.object({
  amount: decimalString.optional(),
  description: z.string().min(1).optional(),
  categoryId: z.string().uuid().nullable().optional(),
  occurredAt: dateString.optional(),
});

async function findTransactionOrThrow(id: string) {
  const [transaction] = await db.select().from(transactions).where(eq(transactions.id, id));
  if (!transaction) {
    throw new ApiError(404, `Transaction ${id} not found`);
  }
  return transaction;
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const transaction = await findTransactionOrThrow(id);
    return NextResponse.json(transaction);
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await findTransactionOrThrow(id);
    const body = updateTransactionSchema.parse(await request.json());

    if (body.categoryId) {
      const [category] = await db.select().from(categories).where(eq(categories.id, body.categoryId));
      if (!category) {
        throw new ApiError(400, `Category ${body.categoryId} does not exist`);
      }
    }

    const [updated] = await db.update(transactions).set(body).where(eq(transactions.id, id)).returning();
    return NextResponse.json(updated);
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await findTransactionOrThrow(id);
    await db.delete(transactions).where(eq(transactions.id, id));
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
