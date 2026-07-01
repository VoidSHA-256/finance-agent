import { pgTable, uuid, text, numeric, date, timestamp } from "drizzle-orm/pg-core";
import { categories } from "./categories";

export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  description: text("description").notNull(),
  categoryId: uuid("category_id").references(() => categories.id),
  occurredAt: date("occurred_at").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
