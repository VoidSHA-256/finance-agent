# Finance Agent — контекст проекта

## Кто я и зачем этот проект
Senior Frontend Developer (ex-Tapestry, coach-pwa), сейчас между проектами — использую время на upskilling под 2026: AI-агенты/agentic workflow, backend для FE, Next.js углублённо. Этот pet-проект — витрина для найма: должен показывать реальный tool use + MCP, не игрушечный демо-код.

Как объяснять: без разжёвывания FE-основ, через рабочий код, минимум теории, без сравнений "как было раньше".

## Что строим
AI-агент поверх личного финансового трекера.

- **Backend**: Next.js API routes + Postgres (Drizzle ORM). Таблицы: `transactions`, `categories`, `budgets`.
- **Agent layer**: Claude API (Anthropic), tool use. Инструменты: `getTransactions(filters)`, `createTransaction(...)`, `categorize(transactionId)`, `getBudgetStatus()`, `setBudgetRule(...)`. Агент сам решает порядок вызовов (агентный цикл, не одна функция за раз).
- **MCP-сервер**: та же бизнес-логика/tools, обёрнутая в MCP — чтобы дёргать трекер прямо из Claude Code/Desktop.
- **Frontend**: Next.js (App Router, RSC) — dashboard + чат со стримингом ответов агента (Server Actions + streaming).

## План (по шагам, не забегать вперёд)
1. Скелет: Next.js + Postgres + Drizzle, миграции, сид-данные
2. CRUD API routes (transactions/categories/budgets) — без AI, чистый рабочий backend
3. Agent layer: Claude API, описание tools, agentic loop
4. Chat UI на фронте со стримингом
5. MCP-сервер как обёртка над теми же tools (последний шаг, переиспользует бизнес-логику)

**Статус: шаг 1 завершён** — Next.js 16 (App Router, src/, TS, без Tailwind) + Postgres в Docker (`docker-compose.yml`) + Drizzle ORM. Схема (`src/db/schema/`): `categories`, `transactions`, `budgets`. Миграции сгенерированы и применены (`pnpm db:generate` / `db:migrate`), сид-скрипт (`pnpm db:seed`) работает. Next.js API routes (шаг 2) ещё не написаны.

Важно: Next.js 16 — API/конвенции могут отличаться от того, что в моих (агента) тренировочных данных. Доки лежат прямо в репо: `node_modules/next/dist/docs/`. Перед написанием route handlers на шаге 2 сверяться с `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md` и соседними файлами про route segment config / caching.

## Конвенции
- TypeScript по умолчанию
- Рабочий код, не псевдокод
- Указывать источники/доки для тем, которые быстро меняются (Claude API, MCP — быстро эволюционируют)
