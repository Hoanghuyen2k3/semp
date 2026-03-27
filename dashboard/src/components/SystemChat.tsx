"use client";

import { useCallback, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { buildChatContextSummary } from "@/lib/gardenPredictions";
import type { WeatherPayload } from "@/lib/gardenPredictions";
import type { ChartDataset } from "@/lib/useSensorReadings";

type Msg = { role: "user" | "model"; text: string };

type Props = {
  chartData: ChartDataset | null;
  weather: WeatherPayload | null;
};

export function SystemChat({ chartData, weather }: Props) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || pending) return;

    const nextUser: Msg = { role: "user", text };
    const history = [...messages, nextUser];
    setMessages(history);
    setInput("");
    setPending(true);
    setError(null);

    try {
      const context = buildChatContextSummary(chartData, weather);
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history,
          context,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError((json.error as string) ?? "Chat failed");
        return;
      }
      const reply = json.text as string;
      setMessages((prev) => [...prev, { role: "model", text: reply }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chat failed");
    } finally {
      setPending(false);
    }
  }, [input, pending, messages, chartData, weather]);

  return (
    <>
      <button
        type="button"
        className="chat-fab"
        aria-expanded={open}
        aria-label="Open assistant chat"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? "✕" : "💬"}
      </button>

      {open && (
        <div className="chat-panel" role="dialog" aria-label="SEMP assistant">
          <div className="chat-panel-header">
            <span>SEMP assistant</span>
            <span className="muted chat-panel-sub">Llama&nbsp;3 (HF)</span>
          </div>
          <div className="chat-messages">
            {messages.length === 0 && (
              <div className="chat-bubble chat-bubble-model">
                Ask about your sensors, irrigation, alerts, or how SEMP is set up (LoRaWAN → TTN → Supabase).
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`chat-bubble chat-bubble-${m.role}`}>
                <div className="chat-md">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.text}</ReactMarkdown>
                </div>
              </div>
            ))}
            {pending && <div className="chat-bubble chat-bubble-model muted">…</div>}
            {error && <p className="error chat-error">{error}</p>}
          </div>
          <div className="chat-input-row">
            <input
              className="chat-input"
              placeholder="Ask about the system…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
              disabled={pending}
            />
            <button type="button" className="auth-button chat-send" onClick={send} disabled={pending}>
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
}
