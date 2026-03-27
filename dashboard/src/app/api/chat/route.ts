import { NextRequest, NextResponse } from "next/server";
import {
  InferenceClient,
  InferenceClientProviderApiError,
  type InferenceProviderOrPolicy,
} from "@huggingface/inference";

export const dynamic = "force-dynamic";

/**
 * Default: Meta Llama 3 8B Instruct — has active Inference Providers on the Hub.
 * `meta-llama/Llama-2-7b-chat-hf` is not deployed on HF serverless inference (router returns 400).
 * Override with HF_CHAT_MODEL if you use a model that your account can route (or your own endpoint).
 */
const DEFAULT_HF_CHAT_MODEL = "meta-llama/Meta-Llama-3-8B-Instruct";

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

function providerErrorDetail(e: unknown): string {
  if (e instanceof InferenceClientProviderApiError) {
    const body = e.httpResponse?.body;
    if (body && typeof body === "object" && body !== null && "error" in body) {
      const errObj = (body as { error: unknown }).error;
      return typeof errObj === "string" ? errObj : JSON.stringify(errObj);
    }
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
  const providerEnv = process.env.HF_CHAT_PROVIDER?.trim();
  const provider = providerEnv ? (providerEnv as InferenceProviderOrPolicy) : undefined;

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

    /** No `system` role — some chat templates (e.g. Gemma) reject it; this matches “instructions in first user turn”. */
    const hfMessages: { role: "user" | "assistant"; content: string }[] = [];
    let prependedSystem = false;
    for (const m of messages) {
      if (m.role === "user") {
        const content = !prependedSystem ? `${systemText}\n\n${m.text}` : m.text;
        prependedSystem = true;
        hfMessages.push({ role: "user", content });
      } else if (m.role === "model") {
        hfMessages.push({ role: "assistant", content: m.text });
      }
    }

    const client = new InferenceClient(token);
    const completion = await client.chatCompletion({
      model,
      ...(provider ? { provider } : {}),
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
    const base = e instanceof Error ? e.message : "Chat failed";
    const detail = providerErrorDetail(e);
    const error = detail ? `${base} — ${detail}` : base;
    return NextResponse.json({ error }, { status: 502 });
  }
}
