/**
 * Server-side personalization helpers. All heuristics run over Mongo documents
 * (authoritative server data), never localStorage. Used by `/api/chat` to
 * build the personalization system-prompt block, and by `/api/dashboard/stats`
 * to surface topics/practices on the dashboard.
 */

export interface ChatMessageLike {
  role: string;
  content: string;
}

export interface ChatSessionLike {
  messages: ChatMessageLike[];
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface UserProfileLike {
  experienceLevel?: "beginner" | "intermediate" | "advanced";
  preferredTradition?: string | null;
  topicsExplored?: string[];
  practicesStarted?: string[];
}

const TOPIC_HINTS: Record<string, string[]> = {
  "Four Noble Truths": ["four noble truths", "dukkha", "craving", "suffering"],
  Meditation: ["meditation", "mindfulness", "breathing", "breath", "zazen"],
  Karma: ["karma", "cause and effect", "karmic"],
  Compassion: ["compassion", "metta", "loving-kindness", "kindness"],
  "Eightfold Path": ["eightfold path", "right view", "right intention", "right speech"],
  Impermanence: ["impermanence", "anicca", "change", "letting go"],
};

const PRACTICE_HINTS: Array<{ name: string; patterns: string[] }> = [
  { name: "5-minute breathing meditation", patterns: ["5-minute", "five minute", "breathing meditation"] },
  { name: "loving-kindness practice", patterns: ["loving-kindness", "metta practice", "metta meditation"] },
  { name: "mindful walking", patterns: ["walking meditation", "mindful walk"] },
  { name: "daily sitting", patterns: ["sit daily", "daily sit", "daily meditation"] },
];

function dedupe(values: string[]) {
  return Array.from(new Set(values));
}

export function deriveProfileFromSessions(sessions: ChatSessionLike[]) {
  const combined = sessions
    .flatMap((session) => session.messages ?? [])
    .map((message) => (message.content ?? "").toLowerCase())
    .join(" ");

  const topicsExplored = Object.entries(TOPIC_HINTS)
    .filter(([, hints]) => hints.some((hint) => combined.includes(hint)))
    .map(([topic]) => topic);

  const practicesStarted = PRACTICE_HINTS.filter((entry) =>
    entry.patterns.some((pattern) => combined.includes(pattern))
  ).map((entry) => entry.name);

  const tradition = combined.includes("zen")
    ? "Zen"
    : combined.includes("theravada")
      ? "Theravada"
      : combined.includes("mahayana")
        ? "Mahayana"
        : null;

  return {
    topicsExplored: dedupe(topicsExplored),
    practicesStarted: dedupe(practicesStarted),
    preferredTradition: tradition,
  };
}

const TOOL_USAGE_LABELS: Record<string, string> = {
  retrieve_scripture: "Scripture in chat",
  search_web: "Web search in chat",
  suggest_learning_path: "Learning path in chat",
};

/**
 * Ranks hint-based topics (per session hit) and chat tool usage (from PracticeLog detail).
 */
export function rankedTopicAndToolLabels(
  sessions: ChatSessionLike[],
  chatPracticeLogDetails: string[],
  limit = 3
): string[] {
  const counts = new Map<string, number>();

  for (const session of sessions) {
    const userBlob = (session.messages ?? [])
      .filter((m) => m.role === "user")
      .map((m) => (m.content ?? "").toLowerCase())
      .join("\n");
    for (const [topic, hints] of Object.entries(TOPIC_HINTS)) {
      if (hints.some((hint) => userBlob.includes(hint))) {
        counts.set(topic, (counts.get(topic) ?? 0) + 1);
      }
    }
  }

  for (const detail of chatPracticeLogDetails) {
    const match = detail.match(/\[tools:\s*([^\]]*)\]/);
    if (!match) continue;
    const parts = match[1]
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    for (const raw of parts) {
      const label = TOOL_USAGE_LABELS[raw] ?? raw.replace(/_/g, " ");
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([label]) => label);
}

export function buildPersonalizationContext(
  profile: UserProfileLike,
  sessions: ChatSessionLike[],
  maxSessions = 4
) {
  const recent = sessions.slice(0, maxSessions);
  const priorQuestions = dedupe(
    recent
      .flatMap((session) => session.messages ?? [])
      .filter((message) => message.role === "user")
      .map((message) => (message.content ?? "").trim())
      .filter(Boolean)
  ).slice(0, 6);

  const topicsLine = profile.topicsExplored?.length
    ? profile.topicsExplored.join(", ")
    : "None yet";
  const practicesLine = profile.practicesStarted?.length
    ? profile.practicesStarted.join(", ")
    : "None yet";
  const tradition = profile.preferredTradition ?? "unspecified";
  const level = profile.experienceLevel ?? "beginner";

  return [
    "Here is what you know about this user from past conversations:",
    "",
    `Topics they've explored: ${topicsLine}`,
    `Their experience level: ${level}`,
    `Preferred tradition: ${tradition}`,
    `Practices they've tried: ${practicesLine}`,
    `Recent questions: ${priorQuestions.length > 0 ? priorQuestions.join(" | ") : "None yet"}`,
    "",
    "Use this context to personalize your advice. Reference past conversations naturally. Don't repeat teachings they've already learned unless they ask. Suggest next steps based on where they are on their journey.",
  ].join("\n");
}
