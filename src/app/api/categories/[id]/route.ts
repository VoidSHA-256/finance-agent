import { NextRequest, NextResponse } from "next/server";
import { deleteCategory, getCategoryOrThrow, updateCategory, updateCategorySchema } from "@/lib/categories";
import { toErrorResponse } from "@/lib/api-error";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const category = await getCategoryOrThrow(id);
    return NextResponse.json(category);
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = updateCategorySchema.parse(await request.json());
    const updated = await updateCategory(id, body);
    return NextResponse.json(updated);
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await deleteCategory(id);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
