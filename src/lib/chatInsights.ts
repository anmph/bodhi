import type { Types } from "mongoose";

export type ConversationMood = "positive" | "curious" | "struggling";

export interface LeanMessage {
  role: string;
  content: string;
}

export interface LeanSessionForInsights {
  _id: Types.ObjectId | string;
  userId: Types.ObjectId | string;
  messages: LeanMessage[];
  updatedAt?: Date | string;
  conversationMood?: ConversationMood | null;
}

const STOPWORDS = new Set(
  [
    "the", "and", "for", "are", "but", "not", "you", "all", "can", "had", "her",
    "was", "one", "our", "out", "has", "have", "been", "were", "they", "what",
    "with", "this", "that", "from", "your", "how", "why", "when", "who", "will",
    "would", "could", "should", "about", "into", "than", "then", "them", "these",
    "those", "there", "here", "just", "like", "also", "very", "some", "more",
    "most", "other", "such", "only", "over", "after", "before", "because",
    "while", "where", "which", "their", "them", "its", "his", "her", "she", "him",
    "his", "any", "each", "few", "may", "way", "even", "being", "does", "did",
    "doing", "done", "get", "got", "want", "need", "know", "think", "feel",
    "help", "please", "tell", "make", "much", "many", "really", "something",
    "anything", "everything", "nothing", "someone", "thanks", "thank", "hello",
    "hi", "hey", "yes", "yet", "too", "use", "using", "used", "well", "good",
    "bad", "day", "time", "today", "now", "still", "back", "come", "came",
    "going", "want", "wants", "able", "said", "says", "say", "ask", "asking",
    // Generic chat words (weak alone; still allowed inside strong multi-word phrases)
    "explain", "explaining", "look", "looking", "try", "tried", "start",
    "started", "begin", "beginner", "question", "questions", "answer", "answers",
    "people", "person", "somebody", "anybody", "users", "user", "chat", "app",
    "old", "year", "years", "child", "children", "kids", "kid", "early", "late",
    "anxious", "anxiety", "worry", "worried", "practice", "practices", "practicing",
  ].map((w) => w.toLowerCase())
);

/** Tokens that signal a phrase is likely on-topic (Buddhism / practice), not generic chit-chat. */
const LEXICON = new Set(
  [
    "noble", "truth", "truths", "dukkha", "suffering", "craving", "eightfold",
    "path", "meditation", "mindfulness", "breath", "karma", "dharma", "dhamma",
    "sutra", "zen", "mahayana", "theravada", "tibetan", "vipassana", "zazen",
    "koan", "emptiness", "nirvana", "nibbana", "buddha", "buddhas", "bodhi",
    "bodhisattva", "compassion", "metta", "loving", "kindness", "rebirth",
    "impermanence", "anicca", "dependent", "origination", "enlightenment",
    "awakening", "sangha", "precepts", "wheel", "four", "five", "eight",
    "wisdom", "insight", "samadhi", "jhana", "nembutsu", "mantra",
    "scripture", "pali", "sanskrit", "lotus", "heart", "diamond", "platform",
    "buddhism", "buddhist", "buddhists",
  ].map((w) => w.toLowerCase())
);

/** Words common in everyday chat; n-grams made only of these are dropped. */
const CHAT_NOISE_WORDS = new Set(
  [
    "four", "five", "six", "seven", "eight", "two", "three", "year", "years",
    "old", "child", "children", "kids", "kid", "early", "late", "day", "days",
    "week", "month", "time", "age", "young", "little",
  ].map((w) => w.toLowerCase())
);

/** Curated themes: count once per session if any pattern matches user text. */
const SESSION_TOPICS: { label: string; patterns: RegExp[] }[] = [
  {
    label: "Four Noble Truths",
    patterns: [/four\s+noble\s+truths?/i, /\bnoble\s+truths?\b/i],
  },
  {
    label: "Eightfold Path",
    patterns: [/eightfold\s+path/i, /\bright\s+(view|speech|action|livelihood|effort|mindfulness|concentration|intention)\b/i],
  },
  { label: "Meditation & mindfulness", patterns: [/meditation/i, /mindful/i, /\bzazen\b/i, /breath\s+awareness/i] },
  { label: "Karma & cause and effect", patterns: [/\bkarma\b/i, /cause\s+and\s+effect/i, /karmic/i] },
  { label: "Suffering & stress (dukkha)", patterns: [/\bdukkha\b/i, /\bsuffering\b/i, /\bstress(ed)?\b/i] },
  { label: "Compassion & metta", patterns: [/compassion/i, /\bmetta\b/i, /loving[\s-]?kindness/i] },
  { label: "Emptiness & interdependence", patterns: [/emptiness/i, /\bsunyata\b/i, /interdepend/i] },
  { label: "Rebirth & rebirth views", patterns: [/rebirth/i, /reincarnation/i, /next\s+life/i] },
  { label: "Teaching / explaining to others", patterns: [/explain.*(buddh|dharma|meditation|noble)/i, /four\s+year\s+old/i, /\bchild\b.*\b(buddh|teach|meditat)/i] },
  { label: "Getting started on the path", patterns: [/where\s+to\s+begin/i, /how\s+to\s+start/i, /\bbeginner\b/i, /new\s+to\s+buddh/i] },
];

function normalizeToken(raw: string): string | null {
  const t = raw.toLowerCase().replace(/[^a-z0-9'-]/g, "");
  if (t.length < 3) return null;
  if (STOPWORDS.has(t)) return null;
  return t;
}

function collectUserText(messages: LeanMessage[]): string {
  if (!Array.isArray(messages)) return "";
  const parts: string[] = [];
  for (const m of messages) {
    if (m.role === "user" && typeof m.content === "string" && m.content.trim()) {
      parts.push(m.content);
    }
  }
  return parts.join(" ");
}

function sessionUserId(s: LeanSessionForInsights): string {
  return typeof s.userId === "string"
    ? s.userId
    : (s.userId as Types.ObjectId).toString();
}

function filterSessions(
  sessions: LeanSessionForInsights[],
  opts: { userIdOnly?: string; excludeUserId?: string }
): LeanSessionForInsights[] {
  return sessions.filter((s) => {
    const uid = sessionUserId(s);
    if (opts.userIdOnly && uid !== opts.userIdOnly) return false;
    if (opts.excludeUserId && uid === opts.excludeUserId) return false;
    return true;
  });
}

function tokenizeForPhrases(text: string): string[] {
  const raw = text.toLowerCase().match(/[a-z0-9']+/g) ?? [];
  return raw.map((t) => t.replace(/^'+|'+$/g, "")).filter((t) => t.length >= 2);
}

function stripStopwordRun(tokens: string[]): string[] {
  const out: string[] = [];
  for (const t of tokens) {
    const norm = t.length >= 3 ? normalizeToken(t) : null;
    if (norm) out.push(norm);
  }
  return out;
}

function phraseIsSignal(phrase: string): boolean {
  const words = phrase.split(" ");
  if (words.length === 2 && words.every((w) => CHAT_NOISE_WORDS.has(w))) {
    return false;
  }
  if (words.length === 3 && words.every((w) => CHAT_NOISE_WORDS.has(w))) {
    return false;
  }
  const hasStrongLex = words.some((w) => LEXICON.has(w) && !CHAT_NOISE_WORDS.has(w));
  if (hasStrongLex) return true;
  if (words.length >= 3 && words.some((w) => LEXICON.has(w))) return true;
  if (phrase.replace(/\s/g, "").length >= 16) return true;
  return false;
}

function countNgramsFromTokens(tokens: string[], counts: Map<string, number>) {
  const t = stripStopwordRun(tokens);
  for (let i = 0; i < t.length - 1; i++) {
    const bigram = `${t[i]} ${t[i + 1]}`;
    if (phraseIsSignal(bigram)) {
      counts.set(bigram, (counts.get(bigram) ?? 0) + 1);
    }
    if (i < t.length - 2) {
      const tri = `${t[i]} ${t[i + 1]} ${t[i + 2]}`;
      if (phraseIsSignal(tri)) {
        counts.set(tri, (counts.get(tri) ?? 0) + 1);
      }
    }
  }
}

function countSessionTopics(text: string, counts: Map<string, number>) {
  const lower = text.toLowerCase();
  const hit = new Set<string>();
  for (const { label, patterns } of SESSION_TOPICS) {
    if (patterns.some((re) => re.test(lower))) hit.add(label);
  }
  hit.forEach((label) => {
    counts.set(label, (counts.get(label) ?? 0) + 1);
  });
}

/**
 * Thematic phrases + session topics (not raw repeating unigrams like "four", "old").
 */
export function topInsightTermsFromSessions(
  sessions: LeanSessionForInsights[],
  opts: {
    limit?: number;
    userIdOnly?: string;
    excludeUserId?: string;
  }
): { term: string; count: number }[] {
  const limit = opts.limit ?? 10;
  const filtered = filterSessions(sessions, {
    userIdOnly: opts.userIdOnly,
    excludeUserId: opts.excludeUserId,
  });

  const counts = new Map<string, number>();

  for (const s of filtered) {
    const text = collectUserText(s.messages ?? []);
    if (!text.trim()) continue;
    countSessionTopics(text, counts);
    const tokens = tokenizeForPhrases(text);
    countNgramsFromTokens(tokens, counts);
  }

  const ranked = Array.from(counts.entries()).sort(
    (a, b) => b[1] - a[1] || b[0].length - a[0].length || a[0].localeCompare(b[0])
  );

  const chosen: { term: string; count: number }[] = [];
  outer: for (const [term, count] of ranked) {
    if (chosen.length >= limit) break;
    const t = term.toLowerCase();
    for (let i = chosen.length - 1; i >= 0; i--) {
      const c = chosen[i].term.toLowerCase();
      if (c === t) continue outer;
      if (c.includes(t) && c.length > t.length) continue outer;
      if (t.includes(c) && t.length > c.length) chosen.splice(i, 1);
    }
    chosen.push({ term, count });
  }

  return chosen;
}

/** @deprecated Use topInsightTermsFromSessions; kept for any external imports. */
export function topTermsFromSessions(
  sessions: LeanSessionForInsights[],
  opts: { userIdFilter?: string; limit?: number }
): { term: string; count: number }[] {
  return topInsightTermsFromSessions(sessions, {
    limit: opts.limit,
    userIdOnly: opts.userIdFilter,
  });
}

/** @deprecated kept for any external callers */
export function startOfUtcWeekMonday(d: Date): string {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dow = x.getUTCDay();
  const diffToMonday = dow === 0 ? -6 : 1 - dow;
  x.setUTCDate(x.getUTCDate() + diffToMonday);
  return x.toISOString().slice(0, 10);
}

/** Returns a YYYY-MM-DD string for the UTC date of the given timestamp. */
export function toUtcDayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function labelDayKey(dayIso: string): string {
  const d = new Date(`${dayIso}T00:00:00.000Z`);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** @deprecated Use SentimentDayRow */
export type SentimentWeekRow = {
  weekStart: string;
  weekLabel: string;
  positive: number;
  curious: number;
  struggling: number;
};

export type SentimentDayRow = {
  weekStart: string;   // field name kept for API/UI compatibility
  weekLabel: string;   // holds the day label e.g. "Apr 28"
  positive: number;
  curious: number;
  struggling: number;
};

const MOODS: ConversationMood[] = ["positive", "curious", "struggling"];

export function buildSentimentTimeline(
  sessions: LeanSessionForInsights[]
): SentimentDayRow[] {
  const map = new Map<
    string,
    { positive: number; curious: number; struggling: number }
  >();

  for (const s of sessions) {
    const mood = s.conversationMood;
    if (!mood || !MOODS.includes(mood)) continue;
    const raw = s.updatedAt ? new Date(s.updatedAt) : null;
    if (!raw || Number.isNaN(raw.getTime())) continue;
    const dayKey = toUtcDayKey(raw);
    let row = map.get(dayKey);
    if (!row) {
      row = { positive: 0, curious: 0, struggling: 0 };
      map.set(dayKey, row);
    }
    row[mood] += 1;
  }

  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([dayKey, counts]) => ({
      weekStart: dayKey,
      weekLabel: labelDayKey(dayKey),
      ...counts,
    }));
}

export function extractUserExcerpt(messages: LeanMessage[], maxLen: number): string {
  const text = collectUserText(messages ?? []);
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen)}…`;
}
