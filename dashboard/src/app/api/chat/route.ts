import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const GEMINI_MODEL = "gemini-2.0-flash";

type ChatMessage = { role: "user" | "model"; text: string };

const SYSTEM = `You are the assistant for the Smart Eco-Monitoring Platform (SEMP), a garden monitoring system.
Data path: LoRaWAN sensors → The Things Network → Supabase → this Next.js dashboard.
Metrics: air temperature & humidity, soil moisture, soil pH, water flow, water depth (and related devices).
Help users interpret readings, irrigation, alerts, and how the system is wired. Be concise and practical.
If a "Current sensor & weather context" block is provided, use it to tailor answers. If something is unknown, say so.`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Chat not configured. Add GEMINI_API_KEY to .env.local" },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();
    const messages = body.messages as ChatMessage[] | undefined;
    const context = typeof body.context === "string" ? body.context : "";

    if (!messages?.length || !messages.some((m) => m.role === "user")) {
      return NextResponse.json({ error: "Provide messages with at least one user turn" }, { status: 400 });
    }

    const parts: { role: string; parts: { text: string }[] }[] = [];
    for (const m of messages) {
      if (m.role !== "user" && m.role !== "model") continue;
      parts.push({
        role: m.role,
        parts: [{ text: m.text }],
      });
    }

    const systemText = context.trim()
      ? `${SYSTEM}\n\n[Current sensor & weather context]\n${context.trim()}`
      : SYSTEM;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemText }] },
        contents: parts,
        generationConfig: { maxOutputTokens: 1024, temperature: 0.6 },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Gemini error", res.status, errText);
      return NextResponse.json(
        { error: `Gemini API error (${res.status}). Check model access and API key.` },
        { status: 502 }
      );
    }

    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
      error?: { message?: string };
    };

    const text =
      data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ??
      data.error?.message ??
      "";

    if (!text) {
      return NextResponse.json({ error: "Empty response from model" }, { status: 502 });
    }

    return NextResponse.json({ text: text.trim() });
  } catch (e) {
    console.error("Chat route:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Chat failed" },
      { status: 500 }
    );
  }
}
