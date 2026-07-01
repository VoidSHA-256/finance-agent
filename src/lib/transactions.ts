import { and, eq, gte, lte } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { transactions, categories } from "@/db/schema";
import { ApiError } from "@/lib/api-error";

export const decimalString = z.string().regex(/^-?\d+(\.\d{1,2})?$/, "Must be a decimal string like -45.20");
export const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be a date string like 2026-06-15");

export const createTransactionSchema = z.object({
  amount: decimalString,
  description: z.string().min(1),
  categoryId: z.string().uuid().optional(),
  occurredAt: dateString,
});

export const updateTransactionSchema = z.object({
  amount: decimalString.optional(),
  description: z.string().min(1).optional(),
  categoryId: z.string().uuid().nullable().optional(),
  occurredAt: dateString.optional(),
});

export interface TransactionFilters {
  categoryId?: string;
  from?: string;
  to?: string;
}

async function assertCategoryExists(categoryId: string) {
  const [category] = await db.select().from(categories).where(eq(categories.id, categoryId));
  if (!category) {
    throw new ApiError(400, `Category ${categoryId} does not exist`);
  }
}

export async function listTransactions(filters: TransactionFilters) {
  const conditions = [];
  if (filters.categoryId) conditions.push(eq(transactions.categoryId, filters.categoryId));
  if (filters.from) conditions.push(gte(transactions.occurredAt, filters.from));
  if (filters.to) conditions.push(lte(transactions.occurredAt, filters.to));

  return db
    .select()
    .from(transactions)
    .where(conditions.length ? and(...conditions) : undefined);
}

export async function getTransactionOrThrow(id: string) {
  const [transaction] = await db.select().from(transactions).where(eq(transactions.id, id));
  if (!transaction) {
    throw new ApiError(404, `Transaction ${id} not found`);
  }
  return transaction;
}

export async function createTransaction(input: z.infer<typeof createTransactionSchema>) {
  if (input.categoryId) {
    await assertCategoryExists(input.categoryId);
  }
  const [transaction] = await db.insert(transactions).values(input).returning();
  return transaction;
}

export async function updateTransaction(id: string, input: z.infer<typeof updateTransactionSchema>) {
  await getTransactionOrThrow(id);
  if (input.categoryId) {
    await assertCategoryExists(input.categoryId);
  }
  const [updated] = await db.update(transactions).set(input).where(eq(transactions.id, id)).returning();
  return updated;
}

export async function categorize(transactionId: string, categoryId: string) {
  return updateTransaction(transactionId, { categoryId });
}

export async function deleteTransaction(id: string) {
  await getTransactionOrThrow(id);
  await db.delete(transactions).where(eq(transactions.id, id));
}
