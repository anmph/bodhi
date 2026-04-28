"use client";

import { useEffect, useState, useCallback } from "react";
import summaryStatsStatic from "@/data/reddit_summary_stats.json";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type TimeRange = "24h" | "7d" | "30d";
type Trend = "up" | "down" | "stable";

interface SamplePost {
  title: string;
  permalink: string;
  score: number;
}

interface LiveStats {
  post_count: number;
  range: string;
  last_updated: string;
  subreddit_counts: Record<string, number>;
  most_common_topics: { topic: string; count: number }[];
  sentiment_distribution: Record<string, number>;
  average_score_by_topic: Record<string, number>;
  sample_posts_by_topic: Record<string, SamplePost[]>;
  trend_vs_previous: Record<string, Trend>;
  _stale?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function percentage(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 1000) / 10;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function TrendArrow({ trend }: { trend?: Trend }) {
  if (!trend || trend === "stable") return <span style={{ color: "#8F8A81", fontSize: "0.75rem" }}>—</span>;
  if (trend === "up")
    return <span style={{ color: "#7EBF8E", fontSize: "0.8rem" }} title="Trending up vs previous period">▲</span>;
  return <span style={{ color: "#D4726A", fontSize: "0.8rem" }} title="Trending down vs previous period">▼</span>;
}

/** Build fallback stats from the static JSON so the page always renders something. */
function buildFallbackStats(): LiveStats {
  const topics = summaryStatsStatic.most_common_topics as { topic: string; count: number }[];
  const samples: Record<string, SamplePost[]> = {};
  topics.forEach((t) => { samples[t.topic] = []; });
  return {
    post_count: summaryStatsStatic.input_post_count,
    range: "static",
    last_updated: "",
    subreddit_counts: summaryStatsStatic.posts_per_subreddit,
    most_common_topics: topics,
    sentiment_distribution: summaryStatsStatic.sentiment_distribution,
    average_score_by_topic: summaryStatsStatic.average_score_by_topic,
    sample_posts_by_topic: samples,
    trend_vs_previous: {},
  };
}

/* ------------------------------------------------------------------ */
/*  Skeleton loader                                                    */
/* ------------------------------------------------------------------ */

function Skeleton({ width = "100%", height = "12px" }: { width?: string; height?: string }) {
  return (
    <div
      className="rounded"
      style={{
        width,
        height,
        backgroundColor: "#333",
        animation: "pulse 1.5s ease-in-out infinite",
      }}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Sentiment color helper                                             */
/* ------------------------------------------------------------------ */

function sentimentColor(label: string): string {
  switch (label) {
    case "positive": return "#7EBF8E";
    case "neutral": return "#8F8A81";
    case "seeking-help": return "#D4A24C";
    case "negative": return "#D4726A";
    default: return "#C8A96E";
  }
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export default function RedditInsightsSections() {
  const [range, setRange] = useState<TimeRange>("7d");
  const [stats, setStats] = useState<LiveStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);

  const fetchStats = useCallback(
    async (r: TimeRange) => {
      setLoading(true);
      try {
        const res = await fetch(`/api/insights/reddit/live?range=${r}`);
        if (!res.ok) throw new Error(`${res.status}`);
        const data: LiveStats = await res.json();
        setStats(data);
        setIsLive(true);
      } catch {
        // Fall back to static data
        setStats(buildFallbackStats());
        setIsLive(false);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchStats(range);
  }, [range, fetchStats]);

  const topicTotal = stats?.most_common_topics.reduce((s, r) => s + r.count, 0) ?? 0;
  const sentimentRows = stats
    ? Object.entries(stats.sentiment_distribution).map(([label, count]) => ({ label, count }))
    : [];
  const sentimentTotal = sentimentRows.reduce((s, r) => s + r.count, 0);
  const subredditEntries = stats ? Object.entries(stats.subreddit_counts) : [];
  const subredditTotal = subredditEntries.reduce((s, [, c]) => s + c, 0);

  return (
    <>
      {/* Inline pulse animation */}
      <style>{`@keyframes pulse{0%,100%{opacity:.4}50%{opacity:.8}}`}</style>

      {/* ─── Header + controls ─── */}
      <section
        className="rounded-[14px] px-6 py-7 mb-6"
        style={{ backgroundColor: "#242424", border: "1px solid #333333" }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
          <h2 className="font-display text-[2rem]" style={{ color: "#C8A96E" }}>
            Insights from the Sangha
          </h2>

          {/* Live badge + refresh */}
          <div className="flex items-center gap-3">
            {isLive && (
              <span
                className="flex items-center gap-1.5 text-[0.72rem] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full"
                style={{ backgroundColor: "rgba(126,191,142,0.15)", color: "#7EBF8E" }}
              >
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: "#7EBF8E", animation: "pulse 2s infinite" }}
                />
                Live
              </span>
            )}
            <button
              onClick={() => fetchStats(range)}
              disabled={loading}
              className="rounded-lg px-3 py-1.5 text-[0.78rem] font-medium transition-colors"
              style={{
                backgroundColor: loading ? "#1E1E1E" : "rgba(200,169,110,0.15)",
                border: "1px solid rgba(200,169,110,0.3)",
                color: "#C8A96E",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.5 : 1,
              }}
            >
              {loading ? "Refreshing…" : "↻ Refresh"}
            </button>
          </div>
        </div>

        {/* Time range toggles */}
        <div className="flex gap-2 mb-4">
          {(["24h", "7d", "30d"] as TimeRange[]).map((r) => {
            const active = range === r;
            return (
              <button
                key={r}
                onClick={() => setRange(r)}
                className="rounded-lg px-4 py-1.5 text-[0.78rem] font-semibold tracking-wide transition-colors"
                style={{
                  backgroundColor: active ? "rgba(200,169,110,0.22)" : "#1E1E1E",
                  border: active ? "1px solid rgba(200,169,110,0.5)" : "1px solid #333",
                  color: active ? "#E8D5A8" : "#8F8A81",
                  cursor: "pointer",
                }}
              >
                {r === "24h" ? "24 Hours" : r === "7d" ? "7 Days" : "30 Days"}
              </button>
            );
          })}
        </div>

        {/* Summary line */}
        <p className="text-[0.98rem] leading-[1.8]" style={{ color: "#D4CFC7" }}>
          {loading ? (
            <Skeleton width="70%" height="16px" />
          ) : (
            <>
              Analyzed{" "}
              <span style={{ color: "#F0EDE6", fontWeight: 600 }}>{stats?.post_count ?? 0}</span>{" "}
              posts from Buddhist communities on Reddit
              {isLive && stats?.range !== "static" && (
                <span style={{ color: "#8F8A81" }}>
                  {" "}
                  · last {stats?.range} · updated {stats?.last_updated ? timeAgo(stats.last_updated) : "—"}
                  {stats?._stale && " (cached)"}
                </span>
              )}
            </>
          )}
        </p>
      </section>

      {/* ─── Subreddit breakdown ─── */}
      <section
        className="rounded-[14px] p-5 mb-5"
        style={{ backgroundColor: "#242424", border: "1px solid #323232" }}
      >
        <h2 className="font-display text-[1.5rem] mb-4" style={{ color: "#F0EDE6" }}>
          Subreddit Breakdown
        </h2>
        {loading ? (
          <div className="space-y-3">{[1, 2, 3, 4].map((i) => <Skeleton key={i} height="32px" />)}</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {subredditEntries.map(([sub, count]) => {
              const pct = percentage(count, subredditTotal);
              return (
                <div
                  key={sub}
                  className="rounded-[10px] p-4 text-center"
                  style={{ backgroundColor: "#202020", border: "1px solid #2F2F2F" }}
                >
                  <a
                    href={`https://www.reddit.com/r/${sub}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-display text-[0.95rem] hover:underline"
                    style={{ color: "#E8D5A8" }}
                  >
                    r/{sub}
                  </a>
                  <div style={{ color: "#F0EDE6", fontSize: "1.6rem", fontWeight: 700 }} className="mt-1">
                    {count}
                  </div>
                  <div style={{ color: "#8F8A81", fontSize: "0.75rem" }}>{pct}% of sample</div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ─── Topic distribution (interactive) ─── */}
      <section
        className="rounded-[14px] p-5 mb-5"
        style={{ backgroundColor: "#242424", border: "1px solid #323232" }}
      >
        <h2 className="font-display text-[1.5rem] mb-4" style={{ color: "#F0EDE6" }}>
          Topic Distribution
        </h2>
        {loading ? (
          <div className="space-y-4">{[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} height="36px" />)}</div>
        ) : (
          <div className="space-y-1">
            {stats?.most_common_topics.map((row) => {
              const pct = percentage(row.count, topicTotal);
              const isExpanded = expandedTopic === row.topic;
              const samples = stats.sample_posts_by_topic[row.topic] ?? [];
              const trend = stats.trend_vs_previous[row.topic];
              const avgScore = stats.average_score_by_topic[row.topic];

              return (
                <div key={row.topic}>
                  <button
                    onClick={() => setExpandedTopic(isExpanded ? null : row.topic)}
                    className="w-full text-left rounded-lg px-3 py-2.5 transition-colors"
                    style={{
                      backgroundColor: isExpanded ? "rgba(200,169,110,0.08)" : "transparent",
                      cursor: "pointer",
                      border: "none",
                    }}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="flex items-center gap-2">
                        <span style={{ color: "#D4CFC7", fontSize: "0.88rem" }}>{row.topic}</span>
                        <TrendArrow trend={trend} />
                        {avgScore !== undefined && (
                          <span
                            style={{ color: "#8F8A81", fontSize: "0.7rem" }}
                            title="Average post score"
                          >
                            avg ↑{avgScore}
                          </span>
                        )}
                      </span>
                      <span className="flex items-center gap-2">
                        <span style={{ color: "#C8A96E", fontSize: "0.82rem", fontWeight: 600 }}>
                          {pct}%
                        </span>
                        <span
                          style={{
                            color: "#8F8A81",
                            fontSize: "0.7rem",
                            transform: isExpanded ? "rotate(180deg)" : "rotate(0)",
                            transition: "transform 0.2s",
                            display: "inline-block",
                          }}
                        >
                          ▼
                        </span>
                      </span>
                    </div>
                    <div className="h-2.5 rounded-full" style={{ backgroundColor: "#1C1C1C" }}>
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: "#C8A96E",
                          minWidth: pct > 0 ? "4px" : "0",
                        }}
                      />
                    </div>
                  </button>

                  {/* Expanded: sample posts */}
                  {isExpanded && samples.length > 0 && (
                    <div
                      className="ml-3 mr-3 mb-2 mt-1 rounded-lg p-3 space-y-2"
                      style={{ backgroundColor: "#1A1A1A", border: "1px solid #2A2A2A" }}
                    >
                      <div style={{ color: "#8F8A81", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Top posts
                      </div>
                      {samples.map((s, idx) => (
                        <a
                          key={idx}
                          href={s.permalink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-start gap-2 group"
                          style={{ textDecoration: "none" }}
                        >
                          <span
                            style={{
                              color: "#C8A96E",
                              fontSize: "0.72rem",
                              fontWeight: 600,
                              minWidth: "36px",
                              textAlign: "right",
                            }}
                          >
                            ↑{s.score}
                          </span>
                          <span
                            className="group-hover:underline"
                            style={{
                              color: "#D4CFC7",
                              fontSize: "0.84rem",
                              lineHeight: 1.5,
                            }}
                          >
                            {s.title}
                          </span>
                        </a>
                      ))}
                    </div>
                  )}
                  {isExpanded && samples.length === 0 && (
                    <div
                      className="ml-3 mr-3 mb-2 mt-1 rounded-lg p-3"
                      style={{ backgroundColor: "#1A1A1A", border: "1px solid #2A2A2A" }}
                    >
                      <span style={{ color: "#8F8A81", fontSize: "0.8rem", fontStyle: "italic" }}>
                        No sample posts available (static data mode)
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ─── Sentiment distribution ─── */}
      <section
        className="rounded-[14px] p-5 mb-5"
        style={{ backgroundColor: "#242424", border: "1px solid #323232" }}
      >
        <h2 className="font-display text-[1.5rem] mb-4" style={{ color: "#F0EDE6" }}>
          Sentiment Distribution
        </h2>
        {loading ? (
          <div className="space-y-3">{[1, 2, 3, 4].map((i) => <Skeleton key={i} height="32px" />)}</div>
        ) : (
          <>
            {/* Stacked bar overview */}
            <div className="h-6 rounded-full overflow-hidden flex mb-4" style={{ backgroundColor: "#1C1C1C" }}>
              {sentimentRows.map((row) => {
                const pct = percentage(row.count, sentimentTotal);
                return (
                  <div
                    key={row.label}
                    title={`${row.label}: ${pct}%`}
                    style={{
                      width: `${pct}%`,
                      backgroundColor: sentimentColor(row.label),
                      transition: "width 0.5s ease",
                      minWidth: pct > 0 ? "2px" : "0",
                    }}
                  />
                );
              })}
            </div>

            {/* Legend + bars */}
            <div className="space-y-3">
              {sentimentRows.map((row) => {
                const pct = percentage(row.count, sentimentTotal);
                return (
                  <div key={row.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="flex items-center gap-2">
                        <span
                          className="inline-block w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: sentimentColor(row.label) }}
                        />
                        <span style={{ color: "#D4CFC7", fontSize: "0.86rem", textTransform: "capitalize" }}>
                          {row.label.replace("-", " ")}
                        </span>
                      </span>
                      <span style={{ color: sentimentColor(row.label), fontSize: "0.8rem", fontWeight: 600 }}>
                        {pct}% ({row.count})
                      </span>
                    </div>
                    <div className="h-2.5 rounded-full" style={{ backgroundColor: "#1C1C1C" }}>
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: sentimentColor(row.label),
                          minWidth: pct > 0 ? "4px" : "0",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>

      {/* ─── Key findings ─── */}
      <section
        className="rounded-[14px] p-5 mb-5"
        style={{ backgroundColor: "#242424", border: "1px solid #323232" }}
      >
        <h2 className="font-display text-[1.5rem] mb-4" style={{ color: "#F0EDE6" }}>
          Key Findings
        </h2>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-[10px] p-4" style={{ backgroundColor: "#202020" }}>
                <Skeleton width="60%" height="18px" />
                <div className="mt-3"><Skeleton height="14px" /></div>
                <div className="mt-2"><Skeleton width="80%" height="14px" /></div>
              </div>
            ))}
          </div>
        ) : (
          (() => {
            const topics = stats?.most_common_topics ?? [];
            const beginnerPct = percentage(
              topics.find((r) => r.topic === "Beginner Questions")?.count ?? 0,
              topicTotal
            );
            const seekingPct = percentage(
              sentimentRows.find((r) => r.label === "seeking-help")?.count ?? 0,
              sentimentTotal
            );
            const meditationPct = percentage(
              topics.find((r) => r.topic === "Meditation Practice")?.count ?? 0,
              topicTotal
            );

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <article className="rounded-[10px] p-4" style={{ backgroundColor: "#202020", border: "1px solid #2F2F2F" }}>
                  <h3 className="font-display text-[1.14rem] mb-2" style={{ color: "#E8D5A8" }}>
                    Beginner support is a major need
                  </h3>
                  <p style={{ color: "#C9C3B9", lineHeight: 1.7, fontSize: "0.88rem" }}>
                    Beginner questions make up <strong style={{ color: "#F0EDE6" }}>{beginnerPct}%</strong> of posts,
                    with many asking where and how to start meditating.
                  </p>
                </article>
                <article className="rounded-[10px] p-4" style={{ backgroundColor: "#202020", border: "1px solid #2F2F2F" }}>
                  <h3 className="font-display text-[1.14rem] mb-2" style={{ color: "#E8D5A8" }}>
                    Help-seeking is consistently present
                  </h3>
                  <p style={{ color: "#C9C3B9", lineHeight: 1.7, fontSize: "0.88rem" }}>
                    <strong style={{ color: "#F0EDE6" }}>{seekingPct}%</strong> of posts carry a seeking-help tone,
                    signaling demand for practical and compassionate guided support.
                  </p>
                </article>
                <article className="rounded-[10px] p-4" style={{ backgroundColor: "#202020", border: "1px solid #2F2F2F" }}>
                  <h3 className="font-display text-[1.14rem] mb-2" style={{ color: "#E8D5A8" }}>
                    Practice questions are frequent
                  </h3>
                  <p style={{ color: "#C9C3B9", lineHeight: 1.7, fontSize: "0.88rem" }}>
                    Meditation-practice topics account for{" "}
                    <strong style={{ color: "#F0EDE6" }}>{meditationPct}%</strong> of discussions, often focused on
                    consistency, obstacles, and routine.
                  </p>
                </article>
                <article className="rounded-[10px] p-4" style={{ backgroundColor: "#202020", border: "1px solid #2F2F2F" }}>
                  <h3 className="font-display text-[1.14rem] mb-2" style={{ color: "#E8D5A8" }}>
                    Resource discovery remains important
                  </h3>
                  <p style={{ color: "#C9C3B9", lineHeight: 1.7, fontSize: "0.88rem" }}>
                    Book and resource recommendation requests remain active, especially among newcomers seeking trusted
                    starting points.
                  </p>
                </article>
              </div>
            );
          })()
        )}
      </section>

      {/* ─── How This Shaped Bodhi ─── */}
      <section
        className="rounded-[14px] p-5 mb-6"
        style={{ backgroundColor: "#242424", border: "1px solid #323232" }}
      >
        <h2 className="font-display text-[1.5rem] mb-4" style={{ color: "#F0EDE6" }}>
          How This Shaped Bodhi
        </h2>
        <div className="space-y-3">
          <div className="rounded-[10px] p-4" style={{ backgroundColor: "#202020", border: "1px solid #2F2F2F" }}>
            <h3 className="font-display text-[1.08rem] mb-1" style={{ color: "#E8D5A8" }}>
              RAG Scripture Retrieval for foundational questions
            </h3>
            <p style={{ color: "#C9C3B9", lineHeight: 1.7, fontSize: "0.88rem" }}>
              Because beginner questions are common, Bodhi emphasizes grounded answers linked to scripture passages and
              beginner-safe explanations.
            </p>
          </div>
          <div className="rounded-[10px] p-4" style={{ backgroundColor: "#202020", border: "1px solid #2F2F2F" }}>
            <h3 className="font-display text-[1.08rem] mb-1" style={{ color: "#E8D5A8" }}>
              Web Search for trusted recommendations
            </h3>
            <p style={{ color: "#C9C3B9", lineHeight: 1.7, fontSize: "0.88rem" }}>
              Since users ask for books and practical resources, Bodhi can fetch current recommendations rather than
              relying only on static references.
            </p>
          </div>
          <div className="rounded-[10px] p-4" style={{ backgroundColor: "#202020", border: "1px solid #2F2F2F" }}>
            <h3 className="font-display text-[1.08rem] mb-1" style={{ color: "#E8D5A8" }}>
              Learning Path guidance for &ldquo;where do I start?&rdquo;
            </h3>
            <p style={{ color: "#C9C3B9", lineHeight: 1.7, fontSize: "0.88rem" }}>
              High novice demand informed a progressive path design: simple first steps, gentle follow-ups, and
              consistency-oriented support.
            </p>
          </div>
          <div className="rounded-[10px] p-4" style={{ backgroundColor: "#202020", border: "1px solid #2F2F2F" }}>
            <h3 className="font-display text-[1.08rem] mb-1" style={{ color: "#E8D5A8" }}>
              Compassion-forward response tone
            </h3>
            <p style={{ color: "#C9C3B9", lineHeight: 1.7, fontSize: "0.88rem" }}>
              The seeking-help signal reinforced the need for emotionally safe guidance, reflected in character modes
              and supportive language throughout chat.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
