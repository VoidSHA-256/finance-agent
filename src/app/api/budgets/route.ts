import { NextRequest, NextResponse } from "next/server";
import { createBudget, createBudgetSchema, listBudgets } from "@/lib/budgets";
import { toErrorResponse } from "@/lib/api-error";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const rows = await listBudgets({
      categoryId: searchParams.get("categoryId") ?? undefined,
      period: searchParams.get("period") ?? undefined,
    });
    return NextResponse.json(rows);
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = createBudgetSchema.parse(await request.json());
    const budget = await createBudget(body);
    return NextResponse.json(budget, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
