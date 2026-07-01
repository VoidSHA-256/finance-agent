import { NextRequest } from "next/server";
import { z } from "zod";
import { runAgentStream } from "@/lib/agent/run-stream";

const requestSchema = z.object({
  history: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string().min(1),
    }),
  ),
});

function agentEventStream(history: z.infer<typeof requestSchema>["history"]) {
  const encoder = new TextEncoder();
  const events = runAgentStream(history);

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { value, done } = await events.next();
        if (done) {
          controller.close();
          return;
        }
        controller.enqueue(encoder.encode(JSON.stringify(value) + "\n"));
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        controller.enqueue(encoder.encode(JSON.stringify({ type: "error", message }) + "\n"));
        controller.close();
      }
    },
    async cancel() {
      await events.return?.(undefined);
    },
  });
}

export async function POST(request: NextRequest) {
  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: parsed.error.issues[0].message }), { status: 400 });
  }

  return new Response(agentEventStream(parsed.data.history), {
    headers: { "Content-Type": "application/x-ndjson" },
  });
}
