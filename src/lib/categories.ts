import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { ApiError } from "@/lib/api-error";

export const createCategorySchema = z.object({
  name: z.string().min(1),
});

export const updateCategorySchema = createCategorySchema;

export async function listCategories() {
  return db.select().from(categories);
}

export async function getCategoryOrThrow(id: string) {
  const [category] = await db.select().from(categories).where(eq(categories.id, id));
  if (!category) {
    throw new ApiError(404, `Category ${id} not found`);
  }
  return category;
}

export async function createCategory(input: z.infer<typeof createCategorySchema>) {
  const [category] = await db.insert(categories).values(input).returning();
  return category;
}

export async function updateCategory(id: string, input: z.infer<typeof updateCategorySchema>) {
  await getCategoryOrThrow(id);
  const [updated] = await db.update(categories).set(input).where(eq(categories.id, id)).returning();
  return updated;
}

export async function deleteCategory(id: string) {
  await getCategoryOrThrow(id);
  await db.delete(categories).where(eq(categories.id, id));
}
