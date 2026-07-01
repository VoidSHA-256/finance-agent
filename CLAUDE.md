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

**Статус: шаг 3 завершён** — Next.js 16 + Postgres/Drizzle (шаг 1), CRUD API routes (шаг 2). Бизнес-логика вынесена из route.ts в `src/lib/{categories,transactions,budgets}.ts` — реюзается и API routes, и agent tools (задел под MCP на шаге 5). Добавлен `getBudgetStatus(period)` (считает spent/remaining по бюджету, сравнивая даты диапазоном `gte`/`lt`, а не `LIKE` — Postgres `date` не поддерживает `LIKE`) и `setBudgetRule(...)` (upsert по `categoryId`+`period`).

Agent layer (`src/lib/agent/`): `tools.ts` — схемы для Claude (`getTransactions`, `createTransaction`, `categorize`, `getBudgetStatus`, `setBudgetRule`, плюс `listCategories`, которого не было в изначальном плане — без него агент не может узнать UUID категорий). `executor.ts` — валидирует input через Zod и исполняет tool, ошибки возвращает как `tool_result` с `is_error: true` (агент видит ошибку и может скорректироваться, а не падает). `run.ts` — ручной agentic loop (не SDK tool runner — осознанно, чтобы видеть/контролировать каждый шаг цикла) на `claude-haiku-4-5` (дешёвая модель, осознанный выбор для pet-проекта с ограниченным бюджетом на API; легко сменить). `POST /api/agent` — нестриминговый эндпоинт, на который в шаге 4 ляжет чат UI со стримингом.

**Agentic loop проверен на моке, не на реальном Claude API** — `ANTHROPIC_API_KEY` пока нет (планируется купить кредитов позже, для демо-записи с реальным AI). Чтобы проверить логику цикла без API-ключа: `client: AgentClient` в `runAgent(history, client?)` ([src/lib/agent/run.ts](src/lib/agent/run.ts)) — инжектируемый параметр (по умолчанию — реальный `Anthropic()`), поэтому можно подсунуть фейковый клиент вместо настоящего SDK. `src/lib/agent/mock-client.ts` — фейковый клиент, эмулирующий только "решения" модели (какой tool вызвать, что ответить) по заранее заданному сценарию; вся остальная цепочка — executor, Zod-валидация, реальные запросы в локальный Postgres — не подделана. `src/lib/agent/mock-run.ts` (`pnpm agent:mock`) — два прогнанных и рабочих сценария: (1) одиночный tool call `getBudgetStatus` с реактивным финальным ответом, читающим настоящие цифры из БД; (2) двухшаговая цепочка `listCategories` → `createTransaction` (реально пишет строку в БД) — подтверждает, что агент может сам решать порядок вызовов инструментов. Это временный тестовый харнесс для локальной разработки без затрат на API — держим в репозитории.

Важно: Next.js 16 — API/конвенции могут отличаться от того, что в моих (агента) тренировочных данных (например, `params` в динамических route handlers — Promise, а не объект, начиная с v15). Доки лежат прямо в репо: `node_modules/next/dist/docs/`. Сверяться с ними при написании нового Next.js-кода, а не полагаться на память.

## Конвенции
- TypeScript по умолчанию
- Рабочий код, не псевдокод
- Указывать источники/доки для тем, которые быстро меняются (Claude API, MCP — быстро эволюционируют)
