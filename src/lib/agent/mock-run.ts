/**
 * Local test harness for the agentic loop — no ANTHROPIC_API_KEY required.
 *
 * Runs two scripted scenarios through the real executor (real Zod validation,
 * real Postgres reads/writes) with a fake Anthropic client standing in for
 * Claude's decisions. Useful for verifying the loop mechanics before spending
 * real API credits. Run with: pnpm agent:mock
 */
import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { runAgent } from "@/lib/agent/run";
import { createMockClient, type ScriptStep } from "@/lib/agent/mock-client";

function lastToolResultText(messages: Anthropic.MessageParam[]): string {
  const last = messages[messages.length - 1];
  if (last.role !== "user" || typeof last.content === "string") {
    throw new Error("Expected the previous turn to be tool results");
  }
  const resultBlock = last.content.find(
    (block): block is Anthropic.ToolResultBlockParam => block.type === "tool_result",
  );
  if (!resultBlock || typeof resultBlock.content !== "string") {
    throw new Error("Expected a text tool_result block");
  }
  return resultBlock.content;
}

async function scenarioBudgetStatus() {
  console.log("\n=== Scenario 1: budget status for June ===");

  const script: ScriptStep[] = [
    { toolCalls: [{ name: "getBudgetStatus", input: { period: "2026-06" } }] },
    (messages) => {
      const statuses = JSON.parse(lastToolResultText(messages)) as Array<{
        categoryName: string;
        spent: string;
        limitAmount: string;
        remaining: string;
        overBudget: boolean;
      }>;
      const food = statuses.find((s) => s.categoryName === "Food");
      if (!food) return { text: "I couldn't find a Food budget for June." };
      const verdict = food.overBudget ? "over budget" : "within budget";
      return {
        text: `In June you spent ${food.spent} out of a ${food.limitAmount} Food budget (${food.remaining} remaining) — you're ${verdict}.`,
      };
    },
  ];

  const client = createMockClient(script);
  const reply = await runAgent(
    [{ role: "user", content: "Сколько я потратил на еду в июне и укладываюсь ли в бюджет?" }],
    client,
  );
  console.log(reply);
}

async function scenarioCreateTransactionByName() {
  console.log("\n=== Scenario 2: create a transaction, resolving category by name ===");
  console.log("(this scenario actually inserts a row into the local database)");

  const script: ScriptStep[] = [
    { toolCalls: [{ name: "listCategories", input: {} }] },
    (messages) => {
      const categories = JSON.parse(lastToolResultText(messages)) as Array<{ id: string; name: string }>;
      const food = categories.find((c) => c.name === "Food");
      if (!food) throw new Error("Expected a 'Food' category to exist — run pnpm db:seed first");
      return {
        toolCalls: [
          {
            name: "createTransaction",
            input: { amount: "-18.40", description: "Coffee run", categoryId: food.id, occurredAt: "2026-06-20" },
          },
        ],
      };
    },
    (messages) => {
      const transaction = JSON.parse(lastToolResultText(messages)) as {
        id: string;
        amount: string;
        description: string;
      };
      return { text: `Created transaction ${transaction.id}: ${transaction.description} for ${transaction.amount}.` };
    },
  ];

  const client = createMockClient(script);
  const reply = await runAgent(
    [{ role: "user", content: "Add an $18.40 coffee run expense for June 20, category Food." }],
    client,
  );
  console.log(reply);
}

async function main() {
  await scenarioBudgetStatus();
  await scenarioCreateTransactionByName();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
