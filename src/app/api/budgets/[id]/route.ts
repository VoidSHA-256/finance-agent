import { NextRequest, NextResponse } from "next/server";
import { deleteBudget, getBudgetOrThrow, updateBudget, updateBudgetSchema } from "@/lib/budgets";
import { toErrorResponse } from "@/lib/api-error";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const budget = await getBudgetOrThrow(id);
    return NextResponse.json(budget);
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = updateBudgetSchema.parse(await request.json());
    const updated = await updateBudget(id, body);
    return NextResponse.json(updated);
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await deleteBudget(id);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
