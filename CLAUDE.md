# Finance Agent — project context

## Who I am and why this project exists
Senior Frontend Developer (ex-Tapestry, coach-pwa), currently between projects — using the time to upskill for 2026: AI agents/agentic workflows, backend for FE, Next.js in depth. This pet project is a hiring showcase: it needs to demonstrate real tool use + MCP, not toy demo code.

How to explain things: no rehashing FE basics, through working code, minimal theory, no "how it used to be vs now" comparisons.

## What we're building
An AI agent on top of a personal finance tracker.

- **Backend**: Next.js API routes + Postgres (Drizzle ORM). Tables: `transactions`, `categories`, `budgets`.
- **Agent layer**: Claude API (Anthropic), tool use. Tools: `getTransactions(filters)`, `createTransaction(...)`, `categorize(transactionId)`, `getBudgetStatus()`, `setBudgetRule(...)`. The agent decides the call order itself (an agentic loop, not one function at a time).
- **MCP server**: the same business logic/tools wrapped in MCP — so the tracker can be driven directly from Claude Code/Desktop.
- **Frontend**: Next.js (App Router, RSC) — dashboard + chat with streamed agent responses. Streaming is implemented via Route Handler + `ReadableStream` (NDJSON), not Server Actions — token-level streaming in the App Router via Server Actions isn't a typical pattern; we discussed it and deliberately departed from the original plan wording.

## Plan (step by step, don't get ahead)
1. Skeleton: Next.js + Postgres + Drizzle, migrations, seed data
2. CRUD API routes (transactions/categories/budgets) — no AI, clean working backend
3. Agent layer: Claude API, tool schemas, agentic loop
4. Chat UI on the frontend with streaming
5. MCP server as a wrapper over the same tools (last step, reuses the business logic)

**Status: step 3 complete** — Next.js 16 + Postgres/Drizzle (step 1), CRUD API routes (step 2). Business logic moved out of route.ts into `src/lib/{categories,transactions,budgets}.ts` — reused by both API routes and agent tools (groundwork for MCP in step 5). Added `getBudgetStatus(period)` (computes spent/remaining per budget, comparing dates with a `gte`/`lt` range rather than `LIKE` — Postgres `date` doesn't support `LIKE`) and `setBudgetRule(...)` (upsert by `categoryId`+`period`).

Agent layer (`src/lib/agent/`): `tools.ts` — schemas for Claude (`getTransactions`, `createTransaction`, `categorize`, `getBudgetStatus`, `setBudgetRule`, plus `listCategories`, which wasn't in the original plan — without it the agent has no way to learn category UUIDs). `executor.ts` — validates input via Zod and executes the tool, returning errors as a `tool_result` with `is_error: true` (the agent sees the error and can adjust instead of crashing). `run.ts` — a hand-rolled agentic loop (not the SDK's tool runner — deliberately, to see/control every step of the loop) on `claude-haiku-4-5` (a cheap model, a deliberate choice for a pet project with a limited API budget; easy to swap). `POST /api/agent` — a non-streaming endpoint, which the step-4 chat UI will stream on top of.

**The agentic loop has been verified against the mock, not the real Claude API** — no `ANTHROPIC_API_KEY` yet (planning to buy credits later, for a demo recording with real AI). To verify the loop logic without an API key: `client: AgentClient` in `runAgent(history, client?)` ([src/lib/agent/run.ts](src/lib/agent/run.ts)) is an injectable parameter (defaults to a real `Anthropic()`), so a fake client can be substituted for the real SDK. `src/lib/agent/mock-client.ts` — a fake client that emulates only the model's "decisions" (which tool to call, what to respond) per a predefined scenario; everything else in the chain — the executor, Zod validation, real queries to the local Postgres — is not faked. `src/lib/agent/mock-run.ts` (`pnpm agent:mock`) — two scenarios run and working: (1) a single `getBudgetStatus` tool call with a final response that reacts to real numbers read from the DB; (2) a two-step chain `listCategories` → `createTransaction` (actually writes a row to the DB) — confirms the agent can decide the tool call order itself. This is a temporary local-dev test harness to avoid API costs — kept in the repo.

**Status: step 4 complete** — chat UI + dashboard. `src/lib/agent/run-stream.ts` — `runAgentStream(history)`, the streaming variant of the agentic loop (async generator) built on `client.messages.stream(...)` instead of `.create()`; emits `text` (token deltas), `tool_call`/`tool_result` (for UI status like "Calling X..."), `done`, `error` events. Kept as a separate file from `run.ts` — the mock client only emulates the non-streaming `.create()`, and it wasn't worth complicating it for streaming.

`POST /api/agent/stream` — a Route Handler that wraps the generator in a `ReadableStream`, encoding events line-by-line as NDJSON. `src/app/chat/ChatWindow.tsx` (client component) reads the stream via `fetch` + a `ReadableStream` reader, appending text as it arrives. `src/app/dashboard/page.tsx` — a Server Component that calls `getBudgetStatus()` directly (no HTTP) — real Postgres data rendered server-side. `/` redirects to `/dashboard`; the default `page.module.css` from create-next-app was removed as unused.

**Bug found and fixed**: without error handling inside `ReadableStream`'s `pull()`, an exception thrown from the generator (e.g. a missing `ANTHROPIC_API_KEY`) tore down the HTTP connection with no response (curl failed with "Recv failure", exit 52) — not something the mock emulates, only caught by running a real request without a key. Fixed: `pull()` now wraps `events.next()` in a try/catch and on error sends `{type: "error", message}` and closes the stream, instead of an unhandled throw. There was also a hidden bug in `ChatWindow`: `finally` unconditionally cleared status after `try`, wiping out the error text that had just been shown — removed the redundant `setStatus(null)` from `finally`.

UI text (dashboard, chat) was translated to English — the whole site should be in English, a deliberate decision by the user.

**Status: step 5 (MCP server) complete — the whole plan is closed out.** `src/mcp/server.ts` — an `McpServer` from `@modelcontextprotocol/sdk` (1.29.0), `StdioServerTransport` transport (how Claude Desktop/Code spawn a local MCP server). Registers the same 6 tools as the agent layer, but **calls the business logic in `src/lib/{categories,transactions,budgets}.ts` directly**, not through `executor.ts` — that's tailored to the Claude Messages API format (a JSON string in/out), whereas the MCP SDK validates arguments itself against the Zod raw shape (`schema.shape`, not JSON Schema — a different format from what the Anthropic Messages API uses in `tools.ts`) and passes an already-parsed object into the callback. Three Zod schemas (`getTransactionsInput`, `categorizeInput`, `getBudgetStatusInput`), previously private in `executor.ts`, are now exported from there — reused in the MCP server, not duplicated.

`.mcp.json` at the repo root — config for registering the server with Claude Code (`command: npx tsx src/mcp/server.ts`); contains no secrets, the server picks up `DATABASE_URL` from `.env` via `dotenv/config`, same as `db:seed`/`agent:mock`. `pnpm mcp` — run the server manually. `pnpm mcp:test` (`src/mcp/test-client.ts`) — a test MCP client on the same SDK, spawns the server as a subprocess over stdio (exactly as Claude Code does) and actually calls `listTools`/`callTool` against the local Postgres — run and verified: 6 tools registered, `listCategories`/`getBudgetStatus` returned real data, calling with nonexistent UUIDs correctly returned `isError: true` with a readable message.

Important: Next.js 16 — APIs/conventions may differ from what's in my (the agent's) training data (e.g. `params` in dynamic route handlers is a Promise, not an object, as of v15). Docs are right in the repo: `node_modules/next/dist/docs/`. Check against them when writing new Next.js code rather than relying on memory. Same goes for the MCP SDK — a young, fast-moving protocol; before writing the `server.ts` API (`registerTool`, the `CallToolResult` shape) I checked directly against the installed package's `.d.ts` files rather than memory.

## Conventions
- TypeScript by default
- Working code, not pseudocode
- Cite sources/docs for fast-moving topics (Claude API, MCP — evolving quickly)
