import { NextRequest, NextResponse } from "next/server";
import { fetchAllSubreddits } from "@/lib/redditFetcher";
import {
  classifyAll,
  buildStats,
  type ClassifiedPost,
  type RedditLiveStats,
} from "@/lib/redditClassifier";

/* ------------------------------------------------------------------ */
/*  In-memory cache (one entry per time range)                         */
/* ------------------------------------------------------------------ */

interface CacheEntry {
  stats: RedditLiveStats;
  posts: ClassifiedPost[];
  timestamp: number;
}

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const cache: Record<string, CacheEntry> = {};

function isFresh(entry: CacheEntry | undefined): entry is CacheEntry {
  return !!entry && Date.now() - entry.timestamp < CACHE_TTL_MS;
}

/* ------------------------------------------------------------------ */
/*  GET /api/insights/reddit/live?range=7d                             */
/* ------------------------------------------------------------------ */

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const range = (searchParams.get("range") ?? "7d") as "24h" | "7d" | "30d";

  if (!["24h", "7d", "30d"].includes(range)) {
    return NextResponse.json({ error: "Invalid range" }, { status: 400 });
  }

  // Return cached if fresh
  if (isFresh(cache[range])) {
    return NextResponse.json(cache[range].stats);
  }

  try {
    const posts = await fetchAllSubreddits(range);
    const classified = classifyAll(posts);

    // For trend comparison, use previous cached data if available
    const prevEntry = cache[range];
    const stats = buildStats(
      classified,
      range,
      prevEntry ? prevEntry.posts : undefined
    );

    // Update cache
    cache[range] = { stats, posts: classified, timestamp: Date.now() };

    return NextResponse.json(stats);
  } catch (err) {
    console.error("Reddit live insights error:", err);
    // Fall back to stale cache if available
    if (cache[range]) {
      return NextResponse.json({
        ...cache[range].stats,
        _stale: true,
      });
    }
    return NextResponse.json(
      { error: "Failed to fetch Reddit data" },
      { status: 502 }
    );
  }
}
