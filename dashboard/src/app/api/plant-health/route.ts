import { NextRequest, NextResponse } from "next/server";
import { InferenceClient } from "@huggingface/inference";

const HF_MODEL = "linkanjarad/mobilenet_v2_1.0_224-plant-disease-identification";

export async function POST(req: NextRequest) {
  const token = process.env.HUGGINGFACE_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "Plant health API not configured. Add HUGGINGFACE_TOKEN to .env.local" },
      { status: 503 }
    );
  }

  try {
    const contentType = req.headers.get("content-type") ?? "";
    let imageData: Blob;

    if (contentType.includes("application/json")) {
      const body = await req.json();
      const imageUrl = body.imageUrl as string | undefined;
      if (!imageUrl || typeof imageUrl !== "string") {
        return NextResponse.json(
          { error: "Please provide imageUrl in the request body" },
          { status: 400 }
        );
      }
      const imgRes = await fetch(imageUrl);
      if (!imgRes.ok) {
        return NextResponse.json(
          { error: "Could not fetch image from URL" },
          { status: 400 }
        );
      }
      imageData = await imgRes.blob();
    } else {
      const formData = await req.formData();
      const file = formData.get("image") as File | null;
      if (!file || !file.type.startsWith("image/")) {
        return NextResponse.json(
          { error: "Please upload an image file or provide imageUrl (JPEG, PNG)" },
          { status: 400 }
        );
      }
      imageData = file;
    }

    const client = new InferenceClient(token);
    const predictions = await client.imageClassification({
      model: HF_MODEL,
      data: imageData,
      parameters: { top_k: 5 },
    });

    return NextResponse.json({ predictions });
  } catch (e) {
    console.error("Plant health API error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Request failed" },
      { status: 500 }
    );
  }
}
