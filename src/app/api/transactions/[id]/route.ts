import { NextRequest, NextResponse } from "next/server";
import { deleteTransaction, getTransactionOrThrow, updateTransaction, updateTransactionSchema } from "@/lib/transactions";
import { toErrorResponse } from "@/lib/api-error";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const transaction = await getTransactionOrThrow(id);
    return NextResponse.json(transaction);
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = updateTransactionSchema.parse(await request.json());
    const updated = await updateTransaction(id, body);
    return NextResponse.json(updated);
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await deleteTransaction(id);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
