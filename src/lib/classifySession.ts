import Anthropic from "@anthropic-ai/sdk";
import { extractUserExcerpt, type LeanMessage } from "./chatInsights";
import ChatSession from "@/models/ChatSession";
import type { Types } from "mongoose";

const VALID_MOODS = ["positive", "curious", "struggling"] as const;
type ValidMood = (typeof VALID_MOODS)[number];

const EXCERPT_LEN = 420;

function extractJsonObject(text: string): Record<string, string> {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object found in model output");
  }
  return JSON.parse(text.slice(start, end + 1)) as Record<string, string>;
}

/**
 * Classify the mood of a single chat session and persist the result.
 * Uses claude-haiku for speed and cost-efficiency.
 * Errors are silently swallowed — this is a best-effort background operation.
 */
export async function classifyAndSaveSession(
  sessionId: Types.ObjectId,
  messages: LeanMessage[],
  apiKey: string
): Promise<void> {
  const excerpt = extractUserExcerpt(messages, EXCERPT_LEN);
  if (!excerpt.trim()) return;

  const id = sessionId.toHexString();

  const userPrompt = `You label Bodhi chat sessions by the user's overall tone in their own messages (not the assistant).

Labels (pick exactly one per id):
- "positive" — gratitude, joy, sharing progress, warmth, things going well
- "curious" — learning, neutral exploration, conceptual questions, open inquiry
- "struggling" — distress, strong doubt, crisis language, feeling stuck or overwhelmed

Sessions (JSON array):
${JSON.stringify([{ id, excerpt }])}

Return ONLY a single JSON object whose keys are session ids (strings) and values are one of: "positive", "curious", "struggling". No markdown, no commentary.`;

  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 60,
    messages: [{ role: "user", content: userPrompt }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  const rawText = textBlock?.type === "text" ? textBlock.text : "";
  const mapping = extractJsonObject(rawText);

  const label = mapping[id];
  if (!label || !VALID_MOODS.includes(label as ValidMood)) return;

  await ChatSession.updateOne(
    { _id: sessionId },
    {
      $set: {
        conversationMood: label as ValidMood,
        conversationMoodAnalyzedAt: new Date(),
      },
    }
  );
}
