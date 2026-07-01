/**
 * MCP server exposing the finance tracker as tools for MCP-compatible clients
 * (Claude Desktop, Claude Code). Wraps the same business logic used by the
 * REST API and the in-app agent — no new logic lives here.
 *
 * Run with: pnpm mcp
 */
import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { listCategories } from "@/lib/categories";
import { createTransaction, createTransactionSchema, categorize, listTransactions } from "@/lib/transactions";
import { getBudgetStatus, setBudgetRule, setBudgetRuleSchema } from "@/lib/budgets";
import { getTransactionsInput, categorizeInput, getBudgetStatusInput } from "@/lib/agent/executor";
import { ApiError } from "@/lib/api-error";

const server = new McpServer({ name: "finance-agent", version: "0.1.0" });

function ok(data: unknown): CallToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data) }] };
}

function fail(err: unknown): CallToolResult {
  if (err instanceof ApiError || err instanceof Error) {
    return { content: [{ type: "text", text: err.message }], isError: true };
  }
  return { content: [{ type: "text", text: "Unknown error" }], isError: true };
}

server.registerTool(
  "getTransactions",
  {
    description:
      "List transactions, optionally filtered by category and/or a date range. Amounts are decimal strings; negative means an expense, positive means income.",
    inputSchema: getTransactionsInput.shape,
  },
  async (args) => {
    try {
      return ok(await listTransactions(args));
    } catch (err) {
      return fail(err);
    }
  },
);

server.registerTool(
  "createTransaction",
  {
    description: "Create a new transaction. Use a negative amount for an expense, positive for income.",
    inputSchema: createTransactionSchema.shape,
  },
  async (args) => {
    try {
      return ok(await createTransaction(args));
    } catch (err) {
      return fail(err);
    }
  },
);

server.registerTool(
  "categorize",
  {
    description: "Assign a category to an existing transaction.",
    inputSchema: categorizeInput.shape,
  },
  async (args) => {
    try {
      return ok(await categorize(args.transactionId, args.categoryId));
    } catch (err) {
      return fail(err);
    }
  },
);

server.registerTool(
  "getBudgetStatus",
  {
    description:
      "Get spending status against budget limits, per category, for a given period. Includes limit, amount spent, remaining, and whether it's over budget.",
    inputSchema: getBudgetStatusInput.shape,
  },
  async (args) => {
    try {
      return ok(await getBudgetStatus(args.period));
    } catch (err) {
      return fail(err);
    }
  },
);

server.registerTool(
  "setBudgetRule",
  {
    description: "Create or update the spending limit for a category in a given period.",
    inputSchema: setBudgetRuleSchema.shape,
  },
  async (args) => {
    try {
      return ok(await setBudgetRule(args));
    } catch (err) {
      return fail(err);
    }
  },
);

server.registerTool(
  "listCategories",
  {
    description: "List all available categories with their UUIDs and names.",
    inputSchema: z.object({}).shape,
  },
  async () => {
    try {
      return ok(await listCategories());
    } catch (err) {
      return fail(err);
    }
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
