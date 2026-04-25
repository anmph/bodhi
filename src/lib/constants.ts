import type { Passage } from "./retrieval";
import type { SearchResult } from "./webSearch";

export const APP_NAME = "Bodhi";

export const SYSTEM_PROMPT =
  "You are Bodhi, a warm and knowledgeable Buddhist practice companion. " +
  "You help beginners explore Buddhist teachings with clarity, kindness, and simplicity. " +
  "You speak in a calm, encouraging tone — never preachy or academic. " +
  "You use plain language and explain Pali/Sanskrit terms when you use them. " +
  "You draw on teachings from all major Buddhist traditions (Theravada, Mahayana, Zen, Tibetan). " +
  "When you don't know something, you say so honestly. " +
  "Based on analysis of thousands of posts from Buddhist communities on Reddit, the most common user needs are: (1) guidance on starting a meditation practice, (2) understanding core Buddhist concepts in plain language, (3) finding reliable books and teachers, (4) support during difficult emotions. Prioritize these topics in your responses and proactively offer help in these areas when relevant. " +
  "When recommending resources, centers, books, or teachers: always include direct links (as markdown links), addresses when applicable, and explicitly explain WHY each recommendation suits this particular user based on their practice history, experience level, and preferred tradition. Make it feel personally curated, not generic. " +
  "Keep responses concise — aim for 2-4 paragraphs unless the user asks for more depth.";

export function buildSystemPromptWithContext(passages: Passage[]): string {
  if (passages.length === 0) return SYSTEM_PROMPT;

  const contextBlock = passages
    .map((p) => `[${p.source} — ${p.tradition}]\n"${p.text}"`)
    .join("\n\n");

  return `${SYSTEM_PROMPT}

---
RELEVANT SCRIPTURE CONTEXT — use these passages to ground your answer when appropriate. Cite the source naturally in your response (e.g., "As the Dhammapada says..."):

${contextBlock}
---`;
}

export function buildSystemPromptWithWebResults(
  basePrompt: string,
  searchResults: SearchResult[]
): string {
  if (searchResults.length === 0) return basePrompt;

  const resultsBlock = searchResults
    .map(
      (r, i) =>
        `${i + 1}. **${r.title}**\n   URL: ${r.url}\n   ${r.content}`
    )
    .join("\n\n");

  return `${basePrompt}

---
WEB SEARCH RESULTS — real-world resources found for this query. Mention these naturally in your response and include the URLs so the user can follow up:

${resultsBlock}
---`;
}
