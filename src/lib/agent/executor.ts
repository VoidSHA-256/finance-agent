import { z } from "zod";
import { listCategories } from "@/lib/categories";
import { createTransaction, createTransactionSchema, categorize, listTransactions } from "@/lib/transactions";
import { getBudgetStatus, setBudgetRule, setBudgetRuleSchema } from "@/lib/budgets";
import { ApiError } from "@/lib/api-error";

const getTransactionsInput = z.object({
  categoryId: z.string().uuid().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

const categorizeInput = z.object({
  transactionId: z.string().uuid(),
  categoryId: z.string().uuid(),
});

const getBudgetStatusInput = z.object({
  period: z.string().optional(),
});

export interface ToolResult {
  output: string;
  isError: boolean;
}

export async function executeTool(name: string, input: unknown): Promise<ToolResult> {
  try {
    switch (name) {
      case "getTransactions": {
        const args = getTransactionsInput.parse(input);
        const rows = await listTransactions(args);
        return { output: JSON.stringify(rows), isError: false };
      }
      case "createTransaction": {
        const args = createTransactionSchema.parse(input);
        const created = await createTransaction(args);
        return { output: JSON.stringify(created), isError: false };
      }
      case "categorize": {
        const args = categorizeInput.parse(input);
        const updated = await categorize(args.transactionId, args.categoryId);
        return { output: JSON.stringify(updated), isError: false };
      }
      case "getBudgetStatus": {
        const args = getBudgetStatusInput.parse(input);
        const statuses = await getBudgetStatus(args.period);
        return { output: JSON.stringify(statuses), isError: false };
      }
      case "setBudgetRule": {
        const args = setBudgetRuleSchema.parse(input);
        const budget = await setBudgetRule(args);
        return { output: JSON.stringify(budget), isError: false };
      }
      case "listCategories": {
        const rows = await listCategories();
        return { output: JSON.stringify(rows), isError: false };
      }
      default:
        return { output: `Unknown tool: ${name}`, isError: true };
    }
  } catch (err) {
    if (err instanceof ApiError) {
      return { output: err.message, isError: true };
    }
    if (err instanceof z.ZodError) {
      return { output: `Invalid arguments: ${err.issues[0].message}`, isError: true };
    }
    return { output: err instanceof Error ? err.message : "Unknown error", isError: true };
  }
}
