import { NextRequest, NextResponse } from "next/server";
import { createTransaction, createTransactionSchema, listTransactions } from "@/lib/transactions";
import { toErrorResponse } from "@/lib/api-error";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const rows = await listTransactions({
      categoryId: searchParams.get("categoryId") ?? undefined,
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
    });
    return NextResponse.json(rows);
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = createTransactionSchema.parse(await request.json());
    const transaction = await createTransaction(body);
    return NextResponse.json(transaction, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
