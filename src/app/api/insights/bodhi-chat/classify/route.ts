import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/apiAuth";
import { connectToDatabase } from "@/lib/mongodb";
import ChatSession from "@/models/ChatSession";
import { extractUserExcerpt, type LeanMessage } from "@/lib/chatInsights";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const BATCH_LIMIT = 10;
const EXCERPT_LEN = 420;

const VALID_MOODS = ["positive", "curious", "struggling"] as const;
type ValidMood = (typeof VALID_MOODS)[number];

function extractJsonObject(text: string): Record<string, string> {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object in model output");
  }
  return JSON.parse(text.slice(start, end + 1)) as Record<string, string>;
}

export async function POST() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "Classification is not configured (missing ANTHROPIC_API_KEY)." },
      { status: 503 }
    );
  }

  if (!process.env.MONGODB_URI) {
    return NextResponse.json(
      { error: "Database is not configured." },
      { status: 503 }
    );
  }

  try {
    await connectToDatabase();

    const sessions = await ChatSession.find({
      conversationMood: { $nin: ["positive", "curious", "struggling"] },
      messages: {
        $elemMatch: {
          role: "user",
          content: { $exists: true, $nin: ["", null] },
        },
      },
    })
      .sort({ updatedAt: -1 })
      .limit(BATCH_LIMIT)
      .select("messages")
      .lean();

    if (sessions.length === 0) {
      return NextResponse.json({
        ok: true,
        classified: 0,
        message: "No conversations need classification.",
      });
    }

    const payload = sessions.map((doc) => ({
      id: String(doc._id),
      excerpt: extractUserExcerpt(doc.messages as LeanMessage[], EXCERPT_LEN),
    }));

    const userPrompt = `You label each Bodhi chat session by the user's overall tone in their own messages (not the assistant).

Labels (pick exactly one per id):
- "positive" — gratitude, joy, sharing progress, warmth, things going well
- "curious" — learning, neutral exploration, conceptual questions, open inquiry
- "struggling" — distress, strong doubt, crisis language, feeling stuck or overwhelmed

Sessions (JSON array):
${JSON.stringify(payload, null, 0)}

Return ONLY a single JSON object whose keys are session ids (strings) and values are one of: "positive", "curious", "struggling". No markdown, no commentary.`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [{ role: "user", content: userPrompt }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const rawText =
      textBlock?.type === "text" ? textBlock.text : "";
    const mapping = extractJsonObject(rawText);

    const now = new Date();
    let classified = 0;

    for (const doc of sessions) {
      const id = String(doc._id);
      const label = mapping[id];
      if (!label || !VALID_MOODS.includes(label as ValidMood)) continue;
      await ChatSession.updateOne(
        { _id: doc._id },
        {
          $set: {
            conversationMood: label as ValidMood,
            conversationMoodAnalyzedAt: now,
          },
        }
      );
      classified += 1;
    }

    return NextResponse.json({
      ok: true,
      classified,
      attempted: sessions.length,
    });
  } catch (err) {
    console.error("[api/insights/bodhi-chat/classify] error:", err);
    return NextResponse.json(
      { error: "Classification failed. Try again in a moment." },
      { status: 500 }
    );
  }
}
