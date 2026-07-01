import { NextRequest, NextResponse } from "next/server";
import { createCategory, createCategorySchema, listCategories } from "@/lib/categories";
import { toErrorResponse } from "@/lib/api-error";

export async function GET() {
  try {
    const rows = await listCategories();
    return NextResponse.json(rows);
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = createCategorySchema.parse(await request.json());
    const category = await createCategory(body);
    return NextResponse.json(category, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
