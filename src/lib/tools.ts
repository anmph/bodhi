import { Tool } from "@anthropic-ai/sdk/resources/messages";
import { retrievePassages } from "./retrieval";
import { webSearch } from "./webSearch";

export const TOOLS: Tool[] = [
  {
    name: "retrieve_scripture",
    description:
      "Search the Buddhist scripture knowledge base for passages relevant to the user's question. Use this when the user asks about Buddhist concepts, teachings, practices, or texts (e.g., karma, mindfulness, the Four Noble Truths, emptiness, meditation techniques).",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "The search query to find relevant scripture passages.",
        },
        top_k: {
          type: "number",
          description: "Number of passages to retrieve. Default 3, max 5.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "search_web",
    description:
      "Search the web for real-world Buddhist resources: meditation centers, YouTube videos, retreat centers, teachers, books, apps, or local sitting groups. Use this when the user is asking for recommendations, resources, or real-world connections — not just conceptual explanations.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description:
            "Search query. Be specific — include location if mentioned, add 'Buddhism' or 'meditation' context.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "suggest_learning_path",
    description:
      "Generate a structured next-steps learning path for the user based on their current interest or question. Learning path recommendations are informed by community data analysis from Buddhist forums, especially common beginner needs. Use this when the user seems to be just starting out, asks 'where do I begin', 'what should I learn next', or expresses a desire to deepen their practice.",
    input_schema: {
      type: "object" as const,
      properties: {
        topic: {
          type: "string",
          description:
            "The topic or practice the user wants to explore.",
        },
        experience_level: {
          type: "string",
          enum: ["beginner", "intermediate", "advanced"],
          description:
            "Infer from conversation context. Default to 'beginner' if unsure.",
        },
      },
      required: ["topic"],
    },
  },
];

export async function executeTool(
  toolName: string,
  toolInput: Record<string, unknown>
): Promise<string> {
  if (toolName === "retrieve_scripture") {
    const query = toolInput.query as string;
    const topK = Math.min((toolInput.top_k as number) ?? 3, 5);
    const passages = retrievePassages(query, topK);
    if (passages.length === 0) return "No relevant scripture passages found.";
    const MAX_TOOL_CHARS = 14_000;
    let out = passages
      .map((p) => `[${p.source} — ${p.tradition}]\n"${p.text}"`)
      .join("\n\n");
    if (out.length > MAX_TOOL_CHARS) {
      out =
        out.slice(0, MAX_TOOL_CHARS) +
        "\n\n[Additional passage text omitted to stay within model limits.]";
    }
    return out;
  }

  if (toolName === "search_web") {
    const query = toolInput.query as string;
    const results = await webSearch(query, 4);
    if (results.length === 0)
      return "No web results found. The web search service may be unavailable.";
    return results
      .map(
        (r, i) => `${i + 1}. ${r.title}\n   URL: ${r.url}\n   ${r.content}`
      )
      .join("\n\n");
  }

  if (toolName === "suggest_learning_path") {
    const topic = toolInput.topic as string;
    const level = (toolInput.experience_level as string) ?? "beginner";
    return `Topic: ${topic}, Level: ${level}. Generate a concrete 3-step learning path with specific texts, practices, and resources.`;
  }

  return "Unknown tool.";
}
