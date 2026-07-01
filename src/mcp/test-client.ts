/**
 * Local test harness for the MCP server — spawns src/mcp/server.ts as a
 * subprocess over stdio (the same way Claude Desktop/Code would) and calls
 * a couple of tools against the real local Postgres. Run with: pnpm mcp:test
 */
import "dotenv/config";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

function stringEnv(): Record<string, string> {
  const entries = Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined);
  return Object.fromEntries(entries);
}

async function main() {
  const transport = new StdioClientTransport({
    command: "npx",
    args: ["tsx", "src/mcp/server.ts"],
    env: stringEnv(),
  });

  const client = new Client({ name: "test-client", version: "0.1.0" });
  await client.connect(transport);

  const { tools } = await client.listTools();
  console.log(
    "Registered tools:",
    tools.map((t) => t.name),
  );

  const categories = await client.callTool({ name: "listCategories", arguments: {} });
  console.log("\nlistCategories ->", categories.content);

  const budgetStatus = await client.callTool({ name: "getBudgetStatus", arguments: { period: "2026-06" } });
  console.log("\ngetBudgetStatus({ period: '2026-06' }) ->", budgetStatus.content);

  const notFound = await client.callTool({ name: "categorize", arguments: { transactionId: "00000000-0000-0000-0000-000000000000", categoryId: "00000000-0000-0000-0000-000000000000" } });
  console.log("\ncategorize(unknown ids) ->", notFound.content, "isError:", notFound.isError);

  await client.close();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
