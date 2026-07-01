"use client";

import { useState } from "react";
import type { AgentStreamEvent } from "@/lib/agent/run-stream";
import styles from "./chat.module.css";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function ChatWindow() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isStreaming) return;

    const history = [...messages, { role: "user" as const, content: text }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setInput("");
    setIsStreaming(true);
    setStatus(null);

    try {
      const response = await fetch("/api/agent/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history }),
      });

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line) continue;
          const event: AgentStreamEvent = JSON.parse(line);
          applyEvent(event);
        }
      }
    } catch {
      setStatus("Something went wrong. Try again.");
    } finally {
      setIsStreaming(false);
    }
  }

  function applyEvent(event: AgentStreamEvent) {
    if (event.type === "text") {
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = { ...next[next.length - 1], content: next[next.length - 1].content + event.text };
        return next;
      });
    } else if (event.type === "tool_call") {
      setStatus(`Calling ${event.name}...`);
    } else if (event.type === "tool_result") {
      setStatus(event.isError ? `${event.name} returned an error` : null);
    } else if (event.type === "done") {
      setStatus(null);
    } else if (event.type === "error") {
      setStatus(`Agent error: ${event.message}`);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.messages}>
        {messages.length === 0 && (
          <p className={styles.emptyState}>Ask about your spending, categorize a transaction, or set a budget.</p>
        )}
        {messages.map((message, i) => (
          <div
            key={i}
            className={message.role === "user" ? `${styles.bubble} ${styles.bubbleUser}` : `${styles.bubble} ${styles.bubbleAssistant}`}
          >
            {message.content || (message.role === "assistant" && isStreaming ? "…" : "")}
          </div>
        ))}
        {status && <div className={styles.status}>{status}</div>}
      </div>

      <form onSubmit={handleSubmit} className={styles.composer}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your spending or budget..."
          disabled={isStreaming}
          className={styles.input}
        />
        <button type="submit" disabled={isStreaming || !input.trim()} className={styles.sendButton} aria-label="Send">
          ↑
        </button>
      </form>
    </div>
  );
}
