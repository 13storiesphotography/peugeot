"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState } from "react";

const SUGGESTIONS = [
  "Kann ich mir einen Schrank für 799 € diesen Monat leisten?",
  "Wie viel muss ich sparen für einen Laptop à 1.200 €?",
  "Wie stehen meine Budgets?",
];

export function FinanceChat() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  const busy = status === "submitted" || status === "streaming";

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    await sendMessage({ text });
  }

  return (
    <div className="flex h-[min(70vh,720px)] flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto pr-1">
        {messages.length === 0 && (
          <div className="animate-rise space-y-3">
            <p className="text-ink-soft">
              Frag Kontura zu deinem Demo-Konto. Beispiele:
            </p>
            <ul className="space-y-2">
              {SUGGESTIONS.map((suggestion) => (
                <li key={suggestion}>
                  <button
                    type="button"
                    className="text-left text-sm font-medium text-teal transition hover:text-teal-deep"
                    onClick={() => sendMessage({ text: suggestion })}
                  >
                    {suggestion}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={
              message.role === "user"
                ? "ml-8 rounded-md bg-ink px-4 py-3 text-white"
                : "mr-8 border-l-2 border-teal pl-4 text-ink"
            }
          >
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide opacity-60">
              {message.role === "user" ? "Du" : "Kontura"}
            </p>
            <div className="space-y-2 whitespace-pre-wrap text-[15px] leading-relaxed">
              {message.parts.map((part, index) => {
                if (part.type === "text") {
                  return <p key={`${message.id}-${index}`}>{part.text}</p>;
                }
                if (part.type.startsWith("tool-")) {
                  return (
                    <p
                      key={`${message.id}-${index}`}
                      className="text-xs text-ink-soft"
                    >
                      Tool: {part.type.replace("tool-", "")}
                    </p>
                  );
                }
                return null;
              })}
            </div>
          </div>
        ))}

        {busy && (
          <p className="animate-pulse text-sm text-ink-soft">Rechnet…</p>
        )}
        {error && (
          <p className="text-sm text-danger">
            Fehler: {error.message || "Chat nicht erreichbar"}
          </p>
        )}
      </div>

      <form onSubmit={onSubmit} className="mt-4 flex gap-2 border-t border-[#10253a]/10 pt-4">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="z.B. Schrank für 799 € — machbar?"
          className="flex-1 rounded-md border border-[#10253a]/15 bg-white/70 px-3 py-3 text-sm outline-none ring-teal focus:ring-2"
          disabled={busy}
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="rounded-md bg-teal px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-deep disabled:opacity-50"
        >
          Senden
        </button>
      </form>
    </div>
  );
}
