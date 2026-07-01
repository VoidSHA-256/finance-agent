import Anthropic from "@anthropic-ai/sdk";
import type { AgentClient } from "@/lib/agent/run";

/**
 * Fake Anthropic client for local testing without spending API credits.
 * It fakes only the model's decisions (which tools to call, what to say) — the
 * agentic loop, tool executors, Zod validation, and Postgres calls are all real.
 * See run.ts / mock-run.ts for usage.
 */

export interface ScriptedToolCall {
  name: string;
  input: Record<string, unknown>;
}

export interface ScriptedTurn {
  text?: string;
  toolCalls?: ScriptedToolCall[];
}

export type ScriptStep = ScriptedTurn | ((messages: Anthropic.MessageParam[]) => ScriptedTurn);

function resolveStep(step: ScriptStep, messages: Anthropic.MessageParam[]): ScriptedTurn {
  return typeof step === "function" ? step(messages) : step;
}

let counter = 0;

function toMessage(turn: ScriptedTurn): Anthropic.Message {
  const content: Anthropic.ContentBlock[] = [];

  if (turn.text) {
    content.push({ type: "text", text: turn.text, citations: null });
  }

  for (const call of turn.toolCalls ?? []) {
    counter += 1;
    content.push({
      type: "tool_use",
      id: `mock_tool_${counter}`,
      name: call.name,
      input: call.input,
      caller: { type: "direct" },
    });
  }

  return {
    id: `mock_msg_${counter}`,
    type: "message",
    role: "assistant",
    model: "mock-model",
    content,
    container: null,
    stop_reason: turn.toolCalls?.length ? "tool_use" : "end_turn",
    stop_details: null,
    stop_sequence: null,
    usage: {
      input_tokens: 0,
      output_tokens: 0,
      cache_creation: null,
      cache_creation_input_tokens: null,
      cache_read_input_tokens: null,
      inference_geo: null,
      output_tokens_details: null,
      server_tool_use: null,
      service_tier: null,
    },
  };
}

export function createMockClient(script: ScriptStep[]): AgentClient {
  let index = 0;
  return {
    messages: {
      async create(params) {
        const step = script[index];
        if (!step) {
          throw new Error(`Mock script exhausted after ${index} turn(s) — add another scripted step`);
        }
        index += 1;
        return toMessage(resolveStep(step, params.messages));
      },
    },
  };
}
