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

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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
    // + most recent chat sessions). Fall back to the base prompt if anything
    // fails so the chat never hard-breaks on a DB hiccup.
    let personalizationContext = "";
    try {
      await connectToDatabase();
      const [userDoc, priorSessions] = await Promise.all([
        User.findById(userObjectId).lean(),
        ChatSession.find({ userId: userObjectId })
          .sort({ updatedAt: -1 })
          .limit(6)
          .lean(),
      ]);
      if (userDoc) {
        const derived = deriveProfileFromSessions(priorSessions);
        personalizationContext = buildPersonalizationContext(
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
      }
    } catch (err) {
      console.error("[api/chat] failed to build personalization context", err);
    }

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
      } catch (err) {
        console.error("[api/chat] failed to persist session", err);
      }
    };

    // Step 1: Initial model call with tools available.
    const initialResponse = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: personalizedSystemPrompt,
      tools: TOOLS,
      tool_choice: { type: "auto" },
      messages: apiMessages,
    });

    const toolUseBlocks = initialResponse.content.filter(
      (b) => b.type === "tool_use"
    );

    // No-tool branch: stream the direct answer, persist at end.
    if (toolUseBlocks.length === 0) {
      const textContent = initialResponse.content.find(
        (b) => b.type === "text"
      );
      const text = textContent?.type === "text" ? textContent.text : "";
      const meta = JSON.stringify({ tools: [] }) + "\n---STREAM---\n";
      const encoder = new TextEncoder();

      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(meta + text));
          controller.close();
          // Fire and forget persistence.
          void persistSession(text, []);
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "X-Session-Id": resolvedSessionId.toHexString(),
        },
      });
    }

    // Tool-use branch: execute tools, then stream the final response.
    const toolsUsed = toolUseBlocks
      .map((b) => (b.type === "tool_use" ? b.name : ""))
      .filter(Boolean);

    const toolResults = await Promise.all(
      toolUseBlocks.map(async (block) => {
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

    const modelStream = client.messages.stream({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: personalizedSystemPrompt,
      tools: TOOLS,
      messages: [
        ...apiMessages,
        { role: "assistant" as const, content: initialResponse.content },
        {
          role: "user" as const,
          content: toolResults.filter(Boolean) as Anthropic.ToolResultBlockParam[],
        },
      ],
    });

    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        let assistantText = "";
        try {
          const meta = JSON.stringify({ tools: toolsUsed }) + "\n---STREAM---\n";
          controller.enqueue(encoder.encode(meta));

          for await (const event of modelStream) {
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
          console.error("[api/chat] tool follow-up stream error:", err);
          try {
            const tail =
              "\n\n_I could not finish that reply (model or connection issue). Please tap send again — your question is still saved._";
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
          // Persist regardless of any mid-stream error: partial text is still
          // useful history, and we never want the chat to lose the user's
          // message even if the tool pipeline misbehaves.
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
