/**
 * Reddit public JSON API fetcher.
 * Pulls recent posts from Buddhist subreddits without requiring OAuth.
 */

export interface RedditPost {
  id: string;
  title: string;
  selftext: string;
  score: number;
  num_comments: number;
  created_utc: number;
  subreddit: string;
  permalink: string;
  url: string;
}

const SUBREDDITS = ["Buddhism", "Meditation", "zenbuddhism", "theravada"];
const USER_AGENT = "Bodhi-Insights/1.0 (Buddhist community analytics)";

/** Small delay to respect Reddit rate limits (public API ~60 req/min). */
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Map a time-range label to a Reddit "top" listing time parameter
 * and a created_utc floor so we can client-side filter /new as well.
 */
export function timeRangeToSeconds(range: "24h" | "7d" | "30d"): number {
  switch (range) {
    case "24h":
      return 60 * 60 * 24;
    case "7d":
      return 60 * 60 * 24 * 7;
    case "30d":
      return 60 * 60 * 24 * 30;
  }
}

export function timeRangeToRedditParam(range: "24h" | "7d" | "30d"): string {
  switch (range) {
    case "24h":
      return "day";
    case "7d":
      return "week";
    case "30d":
      return "month";
  }
}

/**
 * Fetch recent posts from a single subreddit.
 * Uses /new.json for recency and /top.json?t=<range> for engagement-based lists.
 */
async function fetchSubreddit(
  subreddit: string,
  sort: "new" | "top" = "new",
  topTime: string = "week",
  limit: number = 50
): Promise<RedditPost[]> {
  const base = `https://www.reddit.com/r/${subreddit}`;
  const url =
    sort === "top"
      ? `${base}/top.json?t=${topTime}&limit=${limit}`
      : `${base}/new.json?limit=${limit}`;

  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    cache: "no-store",
  });

  if (!res.ok) {
    console.warn(`Reddit fetch failed for r/${subreddit}: ${res.status}`);
    return [];
  }

  const json = await res.json();
  const children = json?.data?.children ?? [];

  return children.map((child: { data: Record<string, unknown> }) => {
    const d = child.data;
    return {
      id: d.id as string,
      title: d.title as string,
      selftext: (d.selftext as string) ?? "",
      score: (d.score as number) ?? 0,
      num_comments: (d.num_comments as number) ?? 0,
      created_utc: (d.created_utc as number) ?? 0,
      subreddit: (d.subreddit as string) ?? subreddit,
      permalink: `https://www.reddit.com${d.permalink as string}`,
      url: d.url as string,
    };
  });
}

/**
 * Fetch posts from all tracked subreddits.
 * @param range Time window to filter by.
 */
export async function fetchAllSubreddits(
  range: "24h" | "7d" | "30d" = "7d"
): Promise<RedditPost[]> {
  const allPosts: RedditPost[] = [];
  const cutoff = Date.now() / 1000 - timeRangeToSeconds(range);
  const topTime = timeRangeToRedditParam(range);

  for (const sub of SUBREDDITS) {
    // Fetch both /new and /top to get a broader sample
    const [newPosts, topPosts] = await Promise.all([
      fetchSubreddit(sub, "new", topTime, 50),
      fetchSubreddit(sub, "top", topTime, 50),
    ]);

    // Merge & deduplicate by id
    const seen = new Set<string>();
    for (const post of [...newPosts, ...topPosts]) {
      if (!seen.has(post.id) && post.created_utc >= cutoff) {
        seen.add(post.id);
        allPosts.push(post);
      }
    }

    // Brief pause between subreddits to stay under rate limit
    await sleep(600);
  }

  return allPosts;
}
