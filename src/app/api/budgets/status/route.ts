import { NextRequest, NextResponse } from "next/server";
import { getBudgetStatus } from "@/lib/budgets";
import { toErrorResponse } from "@/lib/api-error";

export async function GET(request: NextRequest) {
  try {
    const period = request.nextUrl.searchParams.get("period") ?? undefined;
    const statuses = await getBudgetStatus(period);
    return NextResponse.json(statuses);
  } catch (err) {
    return toErrorResponse(err);
  }
}
