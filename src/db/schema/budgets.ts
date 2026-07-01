import { pgTable, uuid, numeric, text, timestamp, unique } from "drizzle-orm/pg-core";
import { categories } from "./categories";

export const budgets = pgTable(
  "budgets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id),
    period: text("period").notNull(), // "YYYY-MM"
    limitAmount: numeric("limit_amount", { precision: 12, scale: 2 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique().on(table.categoryId, table.period)],
);
