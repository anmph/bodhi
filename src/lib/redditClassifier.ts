/**
 * Keyword-based topic & sentiment classifier for Reddit posts.
 * Fast, free, zero API calls — good enough for a demo dashboard.
 */

import type { RedditPost } from "./redditFetcher";

/* ------------------------------------------------------------------ */
/*  Topic classification                                               */
/* ------------------------------------------------------------------ */

export type Topic =
  | "Beginner Questions"
  | "Meditation Practice"
  | "Buddhist Philosophy"
  | "Mental Health & Wellbeing"
  | "Book/Resource Recommendations"
  | "Community & Sangha"
  | "Other";

interface TopicRule {
  topic: Topic;
  patterns: RegExp[];
  /** Higher = checked first (tie-break). */
  priority: number;
}

const TOPIC_RULES: TopicRule[] = [
  {
    topic: "Beginner Questions",
    priority: 10,
    patterns: [
      /\bbeginner\b/i,
      /\bnew to buddhis/i,
      /\bjust start(ed|ing)\b/i,
      /\bwhere (do|should) i start/i,
      /\bhow (do|can) i (begin|start)/i,
      /\bnewbie\b/i,
      /\bnew practitioner/i,
      /\bfirst time\b/i,
      /\bgetting started/i,
      /\bintroduc(tion|e me)\b/i,
    ],
  },
  {
    topic: "Book/Resource Recommendations",
    priority: 9,
    patterns: [
      /\bbook(s)?\b/i,
      /\brecommend(ation|ed)?\b/i,
      /\bresource(s)?\b/i,
      /\breading list/i,
      /\bpodcast/i,
      /\bapp(s)?\b.*meditat/i,
      /\byoutube\b/i,
      /\bcourse(s)?\b/i,
    ],
  },
  {
    topic: "Meditation Practice",
    priority: 8,
    patterns: [
      /\bmeditat(e|ion|ing|ive)\b/i,
      /\bmindful(ness)?\b/i,
      /\bbreath(ing)?\s*(practice|exercise|technique)/i,
      /\bsit(ting)?\s*practice/i,
      /\bvipassana\b/i,
      /\bsamatha\b/i,
      /\bzen\b.*\bpractice\b/i,
      /\bzazen\b/i,
      /\bconcentration\s*practice/i,
      /\bmetta\b/i,
      /\bloving.?kindness/i,
    ],
  },
  {
    topic: "Mental Health & Wellbeing",
    priority: 7,
    patterns: [
      /\banxi(ety|ous)\b/i,
      /\bdepress(ion|ed)\b/i,
      /\bmental health\b/i,
      /\bstress(ed|ful)?\b/i,
      /\bwell.?being\b/i,
      /\bgrief\b/i,
      /\btrauma\b/i,
      /\bloneli(ness|ly)\b/i,
      /\bsuffer(ing)?\b/i,
      /\bheal(ing)?\b/i,
      /\btherapy\b/i,
      /\bpanic\b/i,
      /\boverwhelm/i,
    ],
  },
  {
    topic: "Buddhist Philosophy",
    priority: 6,
    patterns: [
      /\bsutra\b/i,
      /\bsutta\b/i,
      /\bdharma\b/i,
      /\bdhamma\b/i,
      /\bnirvana\b/i,
      /\bnibbana\b/i,
      /\bkarma\b/i,
      /\bkamma\b/i,
      /\brebirth\b/i,
      /\breincarnation\b/i,
      /\bfour noble truth/i,
      /\beightfold path/i,
      /\bdependent origination/i,
      /\bpaticcasamupp/i,
      /\bdukkha\b/i,
      /\banatta\b/i,
      /\banicca\b/i,
      /\bsamsara\b/i,
      /\benlightenment\b/i,
      /\bbodhisattva\b/i,
      /\bmahayana\b/i,
      /\btheravad/i,
      /\bvajrayana\b/i,
      /\btibetan buddhis/i,
      /\bpali canon/i,
      /\bprecept/i,
      /\bfive aggregate/i,
      /\bshunyata\b/i,
      /\bemptiness\b/i,
    ],
  },
  {
    topic: "Community & Sangha",
    priority: 5,
    patterns: [
      /\bsangha\b/i,
      /\btemple\b/i,
      /\bmonastery\b/i,
      /\bmonk\b/i,
      /\bteacher\b/i,
      /\bretreat\b/i,
      /\bcommunity\b/i,
      /\bordination\b/i,
      /\bdharma center/i,
    ],
  },
];

export function classifyTopic(post: RedditPost): Topic {
  const text = `${post.title} ${post.selftext}`;
  // Check rules in priority order (highest first)
  const sorted = [...TOPIC_RULES].sort((a, b) => b.priority - a.priority);
  for (const rule of sorted) {
    if (rule.patterns.some((p) => p.test(text))) {
      return rule.topic;
    }
  }
  return "Other";
}

/* ------------------------------------------------------------------ */
/*  Sentiment classification                                           */
/* ------------------------------------------------------------------ */

export type Sentiment = "positive" | "neutral" | "seeking-help" | "negative";

const SEEKING_HELP_PATTERNS = [
  /\bhelp\b/i,
  /\bhow (do|can|should) i\b/i,
  /\bstruggl/i,
  /\badvice\b/i,
  /\bwhat (should|can|do) i\b/i,
  /\banyone (else|know|have)/i,
  /\btips?\b/i,
  /\bguide me\b/i,
  /\bi('?m| am) (confused|lost|unsure|stuck)/i,
  /\bplease\b/i,
];

const POSITIVE_PATTERNS = [
  /\bthank/i,
  /\bgrateful\b/i,
  /\bgratitude\b/i,
  /\blove\b/i,
  /\bamazin/i,
  /\bbeautiful\b/i,
  /\bbreakthrough\b/i,
  /\bjoy(ful|ous)?\b/i,
  /\bpeace(ful)?\b/i,
  /\bhappy\b/i,
  /\bbliss\b/i,
  /\binsight\b/i,
  /\bprogress\b/i,
  /\bsharing\b.*\bexperience/i,
];

const NEGATIVE_PATTERNS = [
  /\bfrustr/i,
  /\bangr/i,
  /\bwrong\b/i,
  /\bhate\b/i,
  /\bdisappoin/i,
  /\bbad experience/i,
  /\bconfus(ed|ing)\b/i,
  /\bfail(ed|ing|ure)?\b/i,
  /\bgave up\b/i,
  /\bcan'?t\b.*\b(meditate|practice|focus)/i,
];

export function classifySentiment(post: RedditPost): Sentiment {
  const text = `${post.title} ${post.selftext}`;

  let seekingScore = 0;
  let positiveScore = 0;
  let negativeScore = 0;

  for (const p of SEEKING_HELP_PATTERNS) if (p.test(text)) seekingScore++;
  for (const p of POSITIVE_PATTERNS) if (p.test(text)) positiveScore++;
  for (const p of NEGATIVE_PATTERNS) if (p.test(text)) negativeScore++;

  // Pick the strongest signal
  const max = Math.max(seekingScore, positiveScore, negativeScore);
  if (max === 0) return "neutral";
  if (seekingScore === max) return "seeking-help";
  if (positiveScore === max) return "positive";
  return "negative";
}

/* ------------------------------------------------------------------ */
/*  Full analysis pipeline                                             */
/* ------------------------------------------------------------------ */

export interface ClassifiedPost extends RedditPost {
  topic: Topic;
  sentiment: Sentiment;
}

export interface RedditLiveStats {
  post_count: number;
  range: string;
  last_updated: string;
  subreddit_counts: Record<string, number>;
  most_common_topics: { topic: string; count: number }[];
  sentiment_distribution: Record<string, number>;
  average_score_by_topic: Record<string, number>;
  sample_posts_by_topic: Record<string, { title: string; permalink: string; score: number }[]>;
  /** Previous-period topic counts for trend arrows. */
  trend_vs_previous: Record<string, "up" | "down" | "stable">;
}

export function classifyAll(posts: RedditPost[]): ClassifiedPost[] {
  return posts.map((p) => ({
    ...p,
    topic: classifyTopic(p),
    sentiment: classifySentiment(p),
  }));
}

/**
 * Build summary stats from classified posts.
 * `previousPosts` (optional) are used to compute trend arrows.
 */
export function buildStats(
  posts: ClassifiedPost[],
  range: string,
  previousPosts?: ClassifiedPost[]
): RedditLiveStats {
  // --- subreddit counts ---
  const subredditCounts: Record<string, number> = {};
  for (const p of posts) {
    subredditCounts[p.subreddit] = (subredditCounts[p.subreddit] ?? 0) + 1;
  }

  // --- topic counts ---
  const topicCounts: Record<string, number> = {};
  const topicScores: Record<string, number[]> = {};
  const topicSamples: Record<string, { title: string; permalink: string; score: number }[]> = {};

  for (const p of posts) {
    topicCounts[p.topic] = (topicCounts[p.topic] ?? 0) + 1;
    if (!topicScores[p.topic]) topicScores[p.topic] = [];
    topicScores[p.topic].push(p.score);

    if (!topicSamples[p.topic]) topicSamples[p.topic] = [];
    if (topicSamples[p.topic].length < 5) {
      topicSamples[p.topic].push({
        title: p.title,
        permalink: p.permalink,
        score: p.score,
      });
    }
  }

  // Sort topics by count desc
  const sortedTopics = Object.entries(topicCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([topic, count]) => ({ topic, count }));

  // Average score per topic
  const avgScores: Record<string, number> = {};
  for (const [topic, scores] of Object.entries(topicScores)) {
    avgScores[topic] =
      Math.round((scores.reduce((s, v) => s + v, 0) / scores.length) * 10) / 10;
  }

  // Sort samples by score desc
  for (const topic of Object.keys(topicSamples)) {
    topicSamples[topic].sort((a, b) => b.score - a.score);
  }

  // --- sentiment ---
  const sentimentCounts: Record<string, number> = {
    positive: 0,
    neutral: 0,
    "seeking-help": 0,
    negative: 0,
  };
  for (const p of posts) {
    sentimentCounts[p.sentiment] = (sentimentCounts[p.sentiment] ?? 0) + 1;
  }

  // --- trends vs previous period ---
  const trends: Record<string, "up" | "down" | "stable"> = {};
  if (previousPosts && previousPosts.length > 0) {
    const prevCounts: Record<string, number> = {};
    for (const p of previousPosts) {
      prevCounts[p.topic] = (prevCounts[p.topic] ?? 0) + 1;
    }
    // Normalize by total to compare percentages
    const curTotal = posts.length || 1;
    const prevTotal = previousPosts.length || 1;
    for (const topic of Object.keys(topicCounts)) {
      const curPct = (topicCounts[topic] ?? 0) / curTotal;
      const prevPct = (prevCounts[topic] ?? 0) / prevTotal;
      const diff = curPct - prevPct;
      if (diff > 0.03) trends[topic] = "up";
      else if (diff < -0.03) trends[topic] = "down";
      else trends[topic] = "stable";
    }
  }

  return {
    post_count: posts.length,
    range,
    last_updated: new Date().toISOString(),
    subreddit_counts: subredditCounts,
    most_common_topics: sortedTopics,
    sentiment_distribution: sentimentCounts,
    average_score_by_topic: avgScores,
    sample_posts_by_topic: topicSamples,
    trend_vs_previous: trends,
  };
}
