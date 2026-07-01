import { NextRequest, NextResponse } from "next/server";
import { and, eq, gte, lte } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { transactions, categories } from "@/db/schema";
import { ApiError, toErrorResponse } from "@/lib/api-error";

const decimalString = z.string().regex(/^-?\d+(\.\d{1,2})?$/, "Must be a decimal string like -45.20");
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be a date string like 2026-06-15");

const createTransactionSchema = z.object({
  amount: decimalString,
  description: z.string().min(1),
  categoryId: z.string().uuid().optional(),
  occurredAt: dateString,
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const categoryId = searchParams.get("categoryId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const conditions = [];
    if (categoryId) conditions.push(eq(transactions.categoryId, categoryId));
    if (from) conditions.push(gte(transactions.occurredAt, from));
    if (to) conditions.push(lte(transactions.occurredAt, to));

    const rows = await db
      .select()
      .from(transactions)
      .where(conditions.length ? and(...conditions) : undefined);

    return NextResponse.json(rows);
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = createTransactionSchema.parse(await request.json());

    if (body.categoryId) {
      const [category] = await db.select().from(categories).where(eq(categories.id, body.categoryId));
      if (!category) {
        throw new ApiError(400, `Category ${body.categoryId} does not exist`);
      }
    }

    const [transaction] = await db.insert(transactions).values(body).returning();
    return NextResponse.json(transaction, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
