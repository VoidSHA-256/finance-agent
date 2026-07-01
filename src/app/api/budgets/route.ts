import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { budgets, categories } from "@/db/schema";
import { ApiError, toErrorResponse } from "@/lib/api-error";

const periodString = z.string().regex(/^\d{4}-\d{2}$/, "Must be a period string like 2026-06");
const decimalString = z.string().regex(/^\d+(\.\d{1,2})?$/, "Must be a decimal string like 300.00");

const createBudgetSchema = z.object({
  categoryId: z.string().uuid(),
  period: periodString,
  limitAmount: decimalString,
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const categoryId = searchParams.get("categoryId");
    const period = searchParams.get("period");

    const conditions = [];
    if (categoryId) conditions.push(eq(budgets.categoryId, categoryId));
    if (period) conditions.push(eq(budgets.period, period));

    const rows = await db
      .select()
      .from(budgets)
      .where(conditions.length ? and(...conditions) : undefined);

    return NextResponse.json(rows);
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = createBudgetSchema.parse(await request.json());

    const [category] = await db.select().from(categories).where(eq(categories.id, body.categoryId));
    if (!category) {
      throw new ApiError(400, `Category ${body.categoryId} does not exist`);
    }

    const [existing] = await db
      .select()
      .from(budgets)
      .where(and(eq(budgets.categoryId, body.categoryId), eq(budgets.period, body.period)));
    if (existing) {
      throw new ApiError(409, `Budget for category ${body.categoryId} in period ${body.period} already exists`);
    }

    const [budget] = await db.insert(budgets).values(body).returning();
    return NextResponse.json(budget, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
