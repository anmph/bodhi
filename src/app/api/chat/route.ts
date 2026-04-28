import Anthropic from "@anthropic-ai/sdk";
import { Types } from "mongoose";
import { SYSTEM_PROMPT } from "@/lib/constants";
import { TOOLS, executeTool } from "@/lib/tools";
import { getSessionUserId } from "@/lib/apiAuth";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";
import ChatSession from "@/models/ChatSession";
import PracticeLog from "@/models/PracticeLog";
import {
  buildPersonalizationContext,
  deriveProfileFromSessions,
} from "@/lib/personalization";
import { classifyAndSaveSession } from "@/lib/classifySession";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/** Race a promise against a timeout. Resolves to the fallback on timeout. */
function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

const VALID_CHARACTERS = ["buddha", "avalokiteshvara", "bodhidharma"] as const;
type VoiceCharacter = (typeof VALID_CHARACTERS)[number];

interface IncomingMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await req.json();
    const {
      messages,
      systemPrompt,
      sessionId: incomingSessionId,
      character: incomingCharacter,
    } = body as {
      messages: IncomingMessage[];
      systemPrompt?: string;
      sessionId?: string;
      character?: string;
    };

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "messages array required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Keep the Anthropic request bounded: very long threads can exceed context
    // limits and fail mid-stream after tools run.
    const MAX_MESSAGES_FOR_MODEL = 40;
    const apiMessages =
      messages.length > MAX_MESSAGES_FOR_MODEL
        ? messages.slice(-MAX_MESSAGES_FOR_MODEL)
        : messages;

    const userObjectId = new Types.ObjectId(userId);
    const character: VoiceCharacter | null =
      typeof incomingCharacter === "string" &&
      (VALID_CHARACTERS as readonly string[]).includes(incomingCharacter)
        ? (incomingCharacter as VoiceCharacter)
        : null;

    // Resolve (or mint) the ChatSession id upfront so we can return it in a
    // response header and upsert in one write when the stream completes.
    const resolvedSessionId =
      incomingSessionId && Types.ObjectId.isValid(incomingSessionId)
        ? new Types.ObjectId(incomingSessionId)
        : new Types.ObjectId();

    // Build the personalization context from server-side data (user profile
    // + most recent chat sessions). Guarded by a 4-second timeout so a slow
    // or cold MongoDB connection never blocks the chat. Falls back to the
    // base system prompt on timeout or error.
    const personalizationContext = await withTimeout(
      (async () => {
        try {
          await connectToDatabase();
          const [userDoc, priorSessions] = await Promise.all([
            User.findById(userObjectId).lean(),
            ChatSession.find({ userId: userObjectId })
              .sort({ updatedAt: -1 })
              .limit(6)
              .lean(),
          ]);
          if (!userDoc) return "";
          const derived = deriveProfileFromSessions(priorSessions);
          return buildPersonalizationContext(
            {
              experienceLevel: userDoc.experienceLevel,
              preferredTradition:
                userDoc.preferredTradition ?? derived.preferredTradition,
              topicsExplored:
                userDoc.topicsExplored?.length
                  ? userDoc.topicsExplored
                  : derived.topicsExplored,
              practicesStarted:
                userDoc.practicesStarted?.length
                  ? userDoc.practicesStarted
                  : derived.practicesStarted,
            },
            priorSessions
          );
        } catch (err) {
          console.error("[api/chat] failed to build personalization context", err);
          return "";
        }
      })(),
      4_000,
      "" // fallback: empty string means we use the base prompt
    );

    const activeSystemPrompt =
      typeof systemPrompt === "string" && systemPrompt.trim().length > 0
        ? systemPrompt
        : SYSTEM_PROMPT;
    const personalizedSystemPrompt = personalizationContext
      ? `${activeSystemPrompt}\n\n${personalizationContext}`
      : activeSystemPrompt;

    const persistSession = async (assistantText: string, toolsUsed: string[]) => {
      if (!assistantText.trim()) return;
      const finalMessages = [
        ...messages.map((m) => ({
          role: m.role,
          content: m.content,
          timestamp: new Date(),
        })),
        {
          role: "assistant" as const,
          content: assistantText,
          timestamp: new Date(),
        },
      ];
      try {
        await connectToDatabase();
        await ChatSession.updateOne(
          { _id: resolvedSessionId, userId: userObjectId },
          {
            $set: {
              messages: finalMessages,
              character,
            },
            $setOnInsert: {
              userId: userObjectId,
            },
          },
          { upsert: true }
        );
        const lastUser = [...messages].reverse().find((m) => m.role === "user");
        await PracticeLog.create({
          userId: userObjectId,
          type: "chat",
          detail:
            (lastUser?.content ?? "chat").slice(0, 140) +
            (toolsUsed.length ? ` [tools: ${toolsUsed.join(", ")}]` : ""),
          date: new Date(),
        });
        // Classify mood in the background so the Insights chart always
        // reflects the latest conversations without a manual trigger.
        const anthropicKey = process.env.ANTHROPIC_API_KEY;
        if (anthropicKey) {
          void classifyAndSaveSession(
            resolvedSessionId,
            finalMessages as { role: string; content: string }[],
            anthropicKey
          ).catch((err: unknown) => {
            console.error("[api/chat] background mood classify failed:", err);
          });
        }
      } catch (err) {
        console.error("[api/chat] failed to persist session", err);
      }
    };

    // ── Single-pass streaming with inline tool handling ──
    // Instead of a blocking create() followed by a separate streaming call,
    // we stream from the very first Claude call. For simple questions (no
    // tools), the user sees tokens immediately — no double round-trip.
    // When Claude decides to use tools, we execute them mid-stream and
    // continue with a second streaming call.

    const encoder = new TextEncoder();
    const preamble = JSON.stringify({ tools: [] }) + "\n---STREAM---\n";

    const readableStream = new ReadableStream({
      async start(controller) {
        let assistantText = "";
        let toolsUsed: string[] = [];

        try {
          // Send preamble immediately so the client knows streaming has begun.
          controller.enqueue(encoder.encode(preamble));

          // Pass 1: stream with tools available
          const stream1 = client.messages.stream({
            model: "claude-sonnet-4-20250514",
            max_tokens: 2048,
            system: personalizedSystemPrompt,
            tools: TOOLS,
            tool_choice: { type: "auto" },
            messages: apiMessages,
          });

          // Forward text deltas to the client in real time.
          for await (const event of stream1) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              assistantText += event.delta.text;
              controller.enqueue(encoder.encode(event.delta.text));
            }
          }

          // Check if tools were invoked in this response.
          const finalMsg = await stream1.finalMessage();
          const toolBlocks = finalMsg.content.filter(
            (b) => b.type === "tool_use"
          );

          if (toolBlocks.length === 0) {
            // No tools — text was already streamed. Done.
            controller.close();
            void persistSession(assistantText, []);
            return;
          }

          // ── Tool-use branch ──
          toolsUsed = toolBlocks
            .map((b) => (b.type === "tool_use" ? b.name : ""))
            .filter(Boolean);

          const toolResults = await Promise.all(
            toolBlocks.map(async (block) => {
              if (block.type !== "tool_use") return null;
              const result = await executeTool(
                block.name,
                block.input as Record<string, unknown>
              );
              return {
                type: "tool_result" as const,
                tool_use_id: block.id,
                content: result,
              };
            })
          );

          // If pass 1 emitted some text (e.g. "Let me look that up…"),
          // add a visual separator before the tool-informed answer.
          if (assistantText.trim()) {
            assistantText += "\n\n";
            controller.enqueue(encoder.encode("\n\n"));
          }

          // Pass 2: stream the follow-up with tool results
          const stream2 = client.messages.stream({
            model: "claude-sonnet-4-20250514",
            max_tokens: 4096,
            system: personalizedSystemPrompt,
            tools: TOOLS,
            messages: [
              ...apiMessages,
              { role: "assistant" as const, content: finalMsg.content },
              {
                role: "user" as const,
                content: toolResults.filter(
                  Boolean
                ) as Anthropic.ToolResultBlockParam[],
              },
            ],
          });

          for await (const event of stream2) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              assistantText += event.delta.text;
              controller.enqueue(encoder.encode(event.delta.text));
            }
          }

          controller.close();
        } catch (err) {
          console.error("[api/chat] stream error:", err);
          try {
            const tail =
              "\n\n_I could not finish that reply. Please try again._";
            controller.enqueue(encoder.encode(tail));
            controller.close();
          } catch {
            try {
              controller.error(err);
            } catch {
              /* stream already closed */
            }
          }
        } finally {
          void persistSession(assistantText, toolsUsed);
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "X-Session-Id": resolvedSessionId.toHexString(),
      },
    });
  } catch (error) {
    console.error("[api/chat] error", error);
    return new Response(
      JSON.stringify({ error: "Failed to generate response" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
