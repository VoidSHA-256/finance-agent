import "dotenv/config";
import { db } from "./index";
import { categories, transactions, budgets } from "./schema";

async function main() {
  const [food, transport, entertainment] = await db
    .insert(categories)
    .values([{ name: "Food" }, { name: "Transport" }, { name: "Entertainment" }])
    .returning();

  await db.insert(transactions).values([
    { amount: "-45.20", description: "Groceries", categoryId: food.id, occurredAt: "2026-06-03" },
    { amount: "-12.50", description: "Metro card", categoryId: transport.id, occurredAt: "2026-06-05" },
    { amount: "-30.00", description: "Cinema", categoryId: entertainment.id, occurredAt: "2026-06-10" },
    { amount: "-60.00", description: "Restaurant", categoryId: food.id, occurredAt: "2026-06-15" },
  ]);

  await db.insert(budgets).values([
    { categoryId: food.id, period: "2026-06", limitAmount: "300.00" },
    { categoryId: transport.id, period: "2026-06", limitAmount: "100.00" },
    { categoryId: entertainment.id, period: "2026-06", limitAmount: "80.00" },
  ]);

  console.log("Seed complete");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
