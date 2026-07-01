import Anthropic from "@anthropic-ai/sdk";

export const tools: Anthropic.Tool[] = [
  {
    name: "getTransactions",
    description:
      "List transactions, optionally filtered by category, and/or a date range. Amounts are decimal strings; negative means an expense, positive means income.",
    input_schema: {
      type: "object",
      properties: {
        categoryId: { type: "string", description: "Filter by category UUID" },
        from: { type: "string", description: "Start date (inclusive), format YYYY-MM-DD" },
        to: { type: "string", description: "End date (inclusive), format YYYY-MM-DD" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "createTransaction",
    description: "Create a new transaction. Use a negative amount for an expense, positive for income.",
    input_schema: {
      type: "object",
      properties: {
        amount: { type: "string", description: "Decimal string, e.g. -45.20 for an expense" },
        description: { type: "string", description: "What the transaction was for" },
        categoryId: { type: "string", description: "Category UUID, optional if not yet known" },
        occurredAt: { type: "string", description: "Date the transaction happened, format YYYY-MM-DD" },
      },
      required: ["amount", "description", "occurredAt"],
      additionalProperties: false,
    },
  },
  {
    name: "categorize",
    description: "Assign a category to an existing transaction.",
    input_schema: {
      type: "object",
      properties: {
        transactionId: { type: "string", description: "UUID of the transaction to categorize" },
        categoryId: { type: "string", description: "UUID of the category to assign" },
      },
      required: ["transactionId", "categoryId"],
      additionalProperties: false,
    },
  },
  {
    name: "getBudgetStatus",
    description:
      "Get spending status against budget limits, per category, for a given period. Includes limit, amount spent, remaining, and whether it's over budget.",
    input_schema: {
      type: "object",
      properties: {
        period: { type: "string", description: "Period to check, format YYYY-MM. Omit for all periods." },
      },
      additionalProperties: false,
    },
  },
  {
    name: "setBudgetRule",
    description: "Create or update the spending limit for a category in a given period.",
    input_schema: {
      type: "object",
      properties: {
        categoryId: { type: "string", description: "Category UUID" },
        period: { type: "string", description: "Period, format YYYY-MM" },
        limitAmount: { type: "string", description: "Decimal string, e.g. 300.00" },
      },
      required: ["categoryId", "period", "limitAmount"],
      additionalProperties: false,
    },
  },
  {
    name: "listCategories",
    description: "List all available categories with their UUIDs and names. Call this before creating or filtering by category if you don't already know the category UUID.",
    input_schema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
];
