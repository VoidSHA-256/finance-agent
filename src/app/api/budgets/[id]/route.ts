import { NextRequest, NextResponse } from "next/server";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { budgets } from "@/db/schema";
import { ApiError, toErrorResponse } from "@/lib/api-error";

const periodString = z.string().regex(/^\d{4}-\d{2}$/, "Must be a period string like 2026-06");
const decimalString = z.string().regex(/^\d+(\.\d{1,2})?$/, "Must be a decimal string like 300.00");

const updateBudgetSchema = z.object({
  period: periodString.optional(),
  limitAmount: decimalString.optional(),
});

async function findBudgetOrThrow(id: string) {
  const [budget] = await db.select().from(budgets).where(eq(budgets.id, id));
  if (!budget) {
    throw new ApiError(404, `Budget ${id} not found`);
  }
  return budget;
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const budget = await findBudgetOrThrow(id);
    return NextResponse.json(budget);
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const current = await findBudgetOrThrow(id);
    const body = updateBudgetSchema.parse(await request.json());

    const nextPeriod = body.period ?? current.period;
    const [conflict] = await db
      .select()
      .from(budgets)
      .where(and(eq(budgets.categoryId, current.categoryId), eq(budgets.period, nextPeriod), ne(budgets.id, id)));
    if (conflict) {
      throw new ApiError(409, `Budget for category ${current.categoryId} in period ${nextPeriod} already exists`);
    }

    const [updated] = await db.update(budgets).set(body).where(eq(budgets.id, id)).returning();
    return NextResponse.json(updated);
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await findBudgetOrThrow(id);
    await db.delete(budgets).where(eq(budgets.id, id));
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
