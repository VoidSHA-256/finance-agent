import { and, eq, gte, lt, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { budgets, categories, transactions } from "@/db/schema";
import { ApiError } from "@/lib/api-error";

export const periodString = z.string().regex(/^\d{4}-\d{2}$/, "Must be a period string like 2026-06");
export const limitAmountString = z.string().regex(/^\d+(\.\d{1,2})?$/, "Must be a decimal string like 300.00");

export const createBudgetSchema = z.object({
  categoryId: z.string().uuid(),
  period: periodString,
  limitAmount: limitAmountString,
});

export const updateBudgetSchema = z.object({
  period: periodString.optional(),
  limitAmount: limitAmountString.optional(),
});

export interface BudgetFilters {
  categoryId?: string;
  period?: string;
}

async function assertNoConflict(categoryId: string, period: string, excludeId?: string) {
  const conditions = [eq(budgets.categoryId, categoryId), eq(budgets.period, period)];
  if (excludeId) conditions.push(ne(budgets.id, excludeId));
  const [existing] = await db
    .select()
    .from(budgets)
    .where(and(...conditions));
  if (existing) {
    throw new ApiError(409, `Budget for category ${categoryId} in period ${period} already exists`);
  }
}

export async function listBudgets(filters: BudgetFilters) {
  const conditions = [];
  if (filters.categoryId) conditions.push(eq(budgets.categoryId, filters.categoryId));
  if (filters.period) conditions.push(eq(budgets.period, filters.period));

  return db
    .select()
    .from(budgets)
    .where(conditions.length ? and(...conditions) : undefined);
}

export async function getBudgetOrThrow(id: string) {
  const [budget] = await db.select().from(budgets).where(eq(budgets.id, id));
  if (!budget) {
    throw new ApiError(404, `Budget ${id} not found`);
  }
  return budget;
}

export async function createBudget(input: z.infer<typeof createBudgetSchema>) {
  const [category] = await db.select().from(categories).where(eq(categories.id, input.categoryId));
  if (!category) {
    throw new ApiError(400, `Category ${input.categoryId} does not exist`);
  }
  await assertNoConflict(input.categoryId, input.period);
  const [budget] = await db.insert(budgets).values(input).returning();
  return budget;
}

export async function updateBudget(id: string, input: z.infer<typeof updateBudgetSchema>) {
  const current = await getBudgetOrThrow(id);
  const nextPeriod = input.period ?? current.period;
  await assertNoConflict(current.categoryId, nextPeriod, id);
  const [updated] = await db.update(budgets).set(input).where(eq(budgets.id, id)).returning();
  return updated;
}

export async function deleteBudget(id: string) {
  await getBudgetOrThrow(id);
  await db.delete(budgets).where(eq(budgets.id, id));
}

export const setBudgetRuleSchema = createBudgetSchema;

export async function setBudgetRule(input: z.infer<typeof setBudgetRuleSchema>) {
  const [category] = await db.select().from(categories).where(eq(categories.id, input.categoryId));
  if (!category) {
    throw new ApiError(400, `Category ${input.categoryId} does not exist`);
  }

  const [existing] = await db
    .select()
    .from(budgets)
    .where(and(eq(budgets.categoryId, input.categoryId), eq(budgets.period, input.period)));

  if (existing) {
    const [updated] = await db
      .update(budgets)
      .set({ limitAmount: input.limitAmount })
      .where(eq(budgets.id, existing.id))
      .returning();
    return updated;
  }

  const [created] = await db.insert(budgets).values(input).returning();
  return created;
}

export interface BudgetStatus {
  budgetId: string;
  categoryId: string;
  categoryName: string;
  period: string;
  limitAmount: string;
  spent: string;
  remaining: string;
  overBudget: boolean;
}

function periodDateRange(period: string) {
  const [year, month] = period.split("-").map(Number);
  const start = `${period}-01`;
  const nextMonth = month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, "0")}`;
  const end = `${nextMonth}-01`;
  return { start, end };
}

export async function getBudgetStatus(period?: string): Promise<BudgetStatus[]> {
  const budgetRows = await listBudgets(period ? { period } : {});

  const statuses: BudgetStatus[] = [];
  for (const budget of budgetRows) {
    const [category] = await db.select().from(categories).where(eq(categories.id, budget.categoryId));
    const { start, end } = periodDateRange(budget.period);

    const periodTransactions = await db
      .select()
      .from(transactions)
      .where(
        and(eq(transactions.categoryId, budget.categoryId), gte(transactions.occurredAt, start), lt(transactions.occurredAt, end)),
      );

    const spent = periodTransactions
      .map((t) => parseFloat(t.amount))
      .filter((amount) => amount < 0)
      .reduce((sum, amount) => sum - amount, 0);

    const remaining = parseFloat(budget.limitAmount) - spent;

    statuses.push({
      budgetId: budget.id,
      categoryId: budget.categoryId,
      categoryName: category?.name ?? "Unknown",
      period: budget.period,
      limitAmount: budget.limitAmount,
      spent: spent.toFixed(2),
      remaining: remaining.toFixed(2),
      overBudget: remaining < 0,
    });
  }

  return statuses;
}
