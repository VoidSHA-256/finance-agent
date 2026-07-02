# Finance Agent

An AI agent on top of a personal finance tracker — built to demonstrate real Claude API **tool use** and **MCP**, not a toy demo.

The agent decides for itself which tools to call and in what order (a genuine agentic loop, not a single hardcoded function call), operates on a real Postgres database through Drizzle ORM, and is exposed through three different surfaces: a streaming chat UI, a JSON API, and an MCP server that lets you drive the same tracker directly from Claude Desktop or Claude Code.

## What it does

- Track transactions, categories, and budgets (CRUD, backed by Postgres)
- Ask the agent things like *"What's my budget status this month?"* or *"I spent $20 on food, log it"* — it plans and executes the right sequence of tool calls itself
- Watch the agent's reasoning stream token-by-token in the chat UI, with live status for each tool call in progress
- Connect the same business logic to Claude Desktop/Code as an MCP server — call `getBudgetStatus`, `createTransaction`, etc. straight from an MCP client, no HTTP API needed

## Architecture

```
src/
├── db/                 Drizzle schema + migrations + seed data
├── lib/
│   ├── categories.ts    \
│   ├── transactions.ts   > shared business logic — reused by API routes, agent tools, and MCP
│   ├── budgets.ts       /
│   └── agent/
│       ├── tools.ts          tool schemas (Claude Messages API format)
│       ├── executor.ts       Zod-validated tool execution
│       ├── run.ts            non-streaming agentic loop
│       └── run-stream.ts     streaming agentic loop (async generator)
├── app/
│   ├── api/agent/            non-streaming agent endpoint
│   ├── api/agent/stream/     streaming endpoint (Route Handler → ReadableStream, NDJSON)
│   ├── dashboard/             RSC dashboard, reads budget status server-side
│   └── chat/                  streaming chat UI
└── mcp/
    ├── server.ts          MCP server (stdio transport), same 6 tools, calls lib/ directly
    └── test-client.ts     MCP client harness for local testing
```

**Design decisions worth noting:**

- **Streaming is a Route Handler + `ReadableStream` (NDJSON), not Server Actions.** Token-level streaming through Server Actions isn't a well-supported pattern in the App Router — a Route Handler gives direct control over the stream.
- **The agentic loop is hand-rolled, not the SDK's built-in tool runner** — so every step (tool call → validation → execution → result → next model turn) is visible and controllable, which matters for a demo project.
- **Business logic lives in `src/lib/`, independent of both the Claude Messages API and MCP's calling conventions.** The MCP server and the agent's tool executor both call the same functions — the tool-calling protocol differs, the business logic doesn't.
- **`categorize` uses UUIDs**, so the agent has a `listCategories` tool to discover them — not in the original spec, but the agent can't call `categorize` without it.

## Tech stack

- **Next.js 16** (App Router, RSC)
- **Postgres** + **Drizzle ORM**
- **Claude API** (`@anthropic-ai/sdk`), tool use, agentic loop on `claude-haiku-4-5`
- **MCP** (`@modelcontextprotocol/sdk`), stdio transport
- **Zod** for runtime validation
- TypeScript throughout

## Running it locally

```bash
pnpm install
cp .env.example .env   # set DATABASE_URL and ANTHROPIC_API_KEY
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Open `http://localhost:3000` — redirects to the dashboard. Chat UI is at `/chat`.

### Testing the agent loop without an API key

The agentic loop takes an injectable client (`AgentClient`), defaulting to a real `Anthropic()` instance. A mock client that emulates only the model's *decisions* (which tool to call, what to say) lets the full pipeline — tool validation, execution, real database writes — run without spending API credits:

```bash
pnpm agent:mock
```

### Running the MCP server

```bash
pnpm mcp          # start the server standalone (stdio)
pnpm mcp:test      # spawn it as a subprocess and exercise listTools / callTool, same as an MCP client would
```

To use it from Claude Code, see `.mcp.json` in the repo root — no secrets in it, `DATABASE_URL` is picked up from `.env`.

## Status

All five build steps are complete: schema/migrations, CRUD API, agent layer with tool use, streaming chat UI + dashboard, and the MCP server.
