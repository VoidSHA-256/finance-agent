import Anthropic from "@anthropic-ai/sdk";
import { tools } from "@/lib/agent/tools";
import { executeTool } from "@/lib/agent/executor";
import type { AgentTurn } from "@/lib/agent/run";

const client = new Anthropic();

const MODEL = "claude-haiku-4-5";

const SYSTEM_PROMPT = `You are a personal finance assistant. You help the user track transactions, categorize spending, and manage budgets.

Amounts are decimal strings: negative for expenses, positive for income. Periods are "YYYY-MM". You often need a category's UUID before filtering or creating things — call listCategories if you don't already have it.

Be concise. State amounts and numbers plainly; don't pad responses with disclaimers.`;

export type AgentStreamEvent =
  | { type: "text"; text: string }
  | { type: "tool_call"; name: string; input: unknown }
  | { type: "tool_result"; name: string; isError: boolean }
  | { type: "done" }
  | { type: "error"; message: string };

export async function* runAgentStream(history: AgentTurn[]): AsyncGenerator<AgentStreamEvent> {
  const messages: Anthropic.MessageParam[] = history.map((turn) => ({
    role: turn.role,
    content: turn.content,
  }));

  for (let iteration = 0; iteration < 10; iteration++) {
    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools,
      messages,
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        yield { type: "text", text: event.delta.text };
      }
    }

    const response = await stream.finalMessage();
    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason !== "tool_use") {
      yield { type: "done" };
      return;
    }

    const toolUseBlocks = response.content.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
    );

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of toolUseBlocks) {
      yield { type: "tool_call", name: block.name, input: block.input };
      const result = await executeTool(block.name, block.input);
      yield { type: "tool_result", name: block.name, isError: result.isError };
      toolResults.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: result.output,
        is_error: result.isError,
      });
    }

    messages.push({ role: "user", content: toolResults });
  }

  throw new Error("Agent did not finish within the iteration limit");
}
