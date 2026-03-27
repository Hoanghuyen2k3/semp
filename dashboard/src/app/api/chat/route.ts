import { NextRequest, NextResponse } from "next/server";
import { InferenceClient } from "@huggingface/inference";

export const dynamic = "force-dynamic";

/** Default: Llama 2 7B Chat. Override with HF_CHAT_MODEL. Gated — accept the license on the model page at huggingface.co. */
const DEFAULT_HF_CHAT_MODEL = "meta-llama/Llama-2-7b-chat-hf";

type ChatMessage = { role: "user" | "model"; text: string };

const SYSTEM = `You are the assistant for the Smart Eco-Monitoring Platform (SEMP), a garden monitoring system.
Data path: LoRaWAN sensors → The Things Network → Supabase → this Next.js dashboard.
Metrics: air temperature & humidity, soil moisture, soil pH, water flow, water depth (and related devices).
Help users interpret readings, irrigation, alerts, and how the system is wired. Be concise and practical.
If a "Current sensor & weather context" block is provided, use it to tailor answers. If something is unknown, say so.`;

function assistantContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "object" && part !== null && "text" in part) {
          return String((part as { text: unknown }).text);
        }
        return "";
      })
      .join("");
  }
  return "";
}

export async function POST(req: NextRequest) {
  const token = process.env.HUGGINGFACE_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "Chat not configured. Add HUGGINGFACE_TOKEN to .env.local (same token as Plant Health)." },
      { status: 503 }
    );
  }

  const model = (process.env.HF_CHAT_MODEL ?? DEFAULT_HF_CHAT_MODEL).trim() || DEFAULT_HF_CHAT_MODEL;

  try {
    const body = await req.json();
    const messages = body.messages as ChatMessage[] | undefined;
    const context = typeof body.context === "string" ? body.context : "";

    if (!messages?.length || !messages.some((m) => m.role === "user")) {
      return NextResponse.json({ error: "Provide messages with at least one user turn" }, { status: 400 });
    }

    const systemText = context.trim()
      ? `${SYSTEM}\n\n[Current sensor & weather context]\n${context.trim()}`
      : SYSTEM;

    const hfMessages: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: systemText },
    ];

    for (const m of messages) {
      if (m.role === "user") {
        hfMessages.push({ role: "user", content: m.text });
      } else if (m.role === "model") {
        hfMessages.push({ role: "assistant", content: m.text });
      }
    }

    const client = new InferenceClient(token);
    const completion = await client.chatCompletion({
      model,
      messages: hfMessages,
      max_tokens: 1024,
      temperature: 0.6,
    });

    const text = assistantContent(completion.choices?.[0]?.message?.content).trim();

    if (!text) {
      return NextResponse.json({ error: "Empty response from model" }, { status: 502 });
    }

    return NextResponse.json({ text });
  } catch (e) {
    console.error("Chat route (Hugging Face):", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Chat failed" },
      { status: 502 }
    );
  }
}
