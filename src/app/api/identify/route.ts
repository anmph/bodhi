import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { Types } from "mongoose";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSessionUserId } from "@/lib/apiAuth";
import { connectToDatabase } from "@/lib/mongodb";
import PracticeLog from "@/models/PracticeLog";

const SYSTEM = `You are a Buddhist art scholar. Identify the Buddhist figure, deity, or symbol in this image. State: (1) Name and identity, (2) Tradition (Theravada/Mahayana/Vajrayana), (3) Iconographic clues you used (mudras, objects, posture, symbols), (4) Historical and spiritual significance. If uncertain, say so. If a follow-up question is provided, answer it in context of the image.

Your entire reply must be ONLY valid JSON (no markdown, no prose outside JSON) with exactly these string keys: "name", "tradition", "clues", "significance". Use "clues" for iconographic clues and "significance" for historical and spiritual significance (and any follow-up answer should be woven into those fields as appropriate, or append clearly under significance).`;

function parseJsonResponse(raw: string): {
  name: string;
  tradition: string;
  clues: string;
  significance: string;
} {
  const trimmed = raw.trim();
  const fence = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const candidate = fence ? fence[1].trim() : trimmed;
  try {
    const o = JSON.parse(candidate) as Record<string, unknown>;
    return {
      name: typeof o.name === "string" ? o.name : "",
      tradition: typeof o.tradition === "string" ? o.tradition : "",
      clues: typeof o.clues === "string" ? o.clues : "",
      significance: typeof o.significance === "string" ? o.significance : "",
    };
  } catch {
    return {
      name: "Could not parse model output",
      tradition: "",
      clues: "",
      significance: trimmed,
    };
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured." },
      { status: 503 }
    );
  }

  let body: { image?: string; mediaType?: string; question?: string };
  try {
    body = (await request.json()) as {
      image?: string;
      mediaType?: string;
      question?: string;
    };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { image, mediaType, question } = body;
  if (!image || typeof image !== "string") {
    return NextResponse.json({ error: "image (base64 string) is required." }, { status: 400 });
  }
  if (!mediaType || typeof mediaType !== "string" || !mediaType.startsWith("image/")) {
    return NextResponse.json(
      { error: "mediaType (e.g. image/jpeg) is required." },
      { status: 400 }
    );
  }

  const visionMediaTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
  type VisionMediaType = (typeof visionMediaTypes)[number];
  if (!visionMediaTypes.includes(mediaType as VisionMediaType)) {
    return NextResponse.json(
      {
        error:
          "Unsupported mediaType for vision. Use image/jpeg, image/png, image/gif, or image/webp.",
      },
      { status: 400 }
    );
  }
  const anthropicMediaType = mediaType as VisionMediaType;

  const anthropic = new Anthropic({ apiKey: key });

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: anthropicMediaType, data: image },
            },
            {
              type: "text",
              text: question || "Identify this Buddhist figure.",
            },
          ],
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const fullResponse =
      textBlock && textBlock.type === "text" ? textBlock.text : "";
    const parsed = parseJsonResponse(fullResponse);

    const uid = await getSessionUserId();
    if (uid) {
      try {
        await connectToDatabase();
        await PracticeLog.create({
          userId: new Types.ObjectId(uid),
          type: "identify",
          detail: parsed.name,
          date: new Date(),
        });
      } catch (logErr) {
        console.error("[api/identify] practice log save failed:", logErr);
      }
    }

    return NextResponse.json({
      name: parsed.name,
      tradition: parsed.tradition,
      clues: parsed.clues,
      significance: parsed.significance,
      fullResponse,
    });
  } catch (err) {
    console.error("[api/identify]", err);
    return NextResponse.json(
      {
        error: "Vision request failed.",
        detail: process.env.NODE_ENV === "development" ? (err as Error).message : undefined,
      },
      { status: 500 }
    );
  }
}
