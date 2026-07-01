import Anthropic from "@anthropic-ai/sdk";
import { tools } from "@/lib/agent/tools";
import { executeTool } from "@/lib/agent/executor";

export interface AgentClient {
  messages: {
    create(params: Anthropic.MessageCreateParamsNonStreaming): Promise<Anthropic.Message>;
  };
}

const defaultClient: AgentClient = new Anthropic();

const MODEL = "claude-haiku-4-5";

const SYSTEM_PROMPT = `You are a personal finance assistant. You help the user track transactions, categorize spending, and manage budgets.

Amounts are decimal strings: negative for expenses, positive for income. Periods are "YYYY-MM". You often need a category's UUID before filtering or creating things — call listCategories if you don't already have it.

Be concise. State amounts and numbers plainly; don't pad responses with disclaimers.`;

export interface AgentTurn {
  role: "user" | "assistant";
  content: string;
}

export async function runAgent(history: AgentTurn[], client: AgentClient = defaultClient): Promise<string> {
  const messages: Anthropic.MessageParam[] = history.map((turn) => ({
    role: turn.role,
    content: turn.content,
  }));

  for (let iteration = 0; iteration < 10; iteration++) {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools,
      messages,
    });

    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason !== "tool_use") {
      return response.content
        .filter((block): block is Anthropic.TextBlock => block.type === "text")
        .map((block) => block.text)
        .join("\n");
    }

    const toolUseBlocks = response.content.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
    );

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of toolUseBlocks) {
      const result = await executeTool(block.name, block.input);
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
