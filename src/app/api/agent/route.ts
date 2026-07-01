import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { runAgent } from "@/lib/agent/run";
import { toErrorResponse } from "@/lib/api-error";

const requestSchema = z.object({
  message: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const { message } = requestSchema.parse(await request.json());
    const reply = await runAgent([{ role: "user", content: message }]);
    return NextResponse.json({ reply });
  } catch (err) {
    return toErrorResponse(err);
  }
}
