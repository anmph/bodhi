"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type TermRow = { term: string; count: number };

type SentimentRow = {
  weekStart: string;
  weekLabel: string;
  positive: number;
  curious: number;
  struggling: number;
};

interface BodhiChatPayload {
  ok: boolean;
  dbConfigured: boolean;
  communityTerms: TermRow[];
  personalTerms: TermRow[] | null;
  sentimentTimeline: SentimentRow[];
  unclassifiedSessionCount: number;
  classifiedSessionCount: number;
  communitySessionSampleSize: number;
  personalSessionSampleSize: number;
  /** When signed in, community stats exclude your sessions so the left column is truly other people. */
  communityExcludesYou?: boolean;
  canClassify: boolean;
  signedIn: boolean;
  error?: string;
}

function percentage(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 1000) / 10;
}

export default function BodhiChatInsights() {
  const { status } = useSession();
  const [data, setData] = useState<BodhiChatPayload | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [classifyBusy, setClassifyBusy] = useState(false);
  const [classifyMessage, setClassifyMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch("/api/insights/bodhi-chat", { cache: "no-store" });
      const json = (await res.json()) as BodhiChatPayload;
      setData(json);
      if (!res.ok || json.ok === false) {
        setLoadError(json.error ?? "Could not load Bodhi chat insights.");
      }
    } catch {
      setLoadError("Could not reach the server.");
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const runClassify = async () => {
    if (status !== "authenticated") {
      void signIn("google");
      return;
    }
    setClassifyBusy(true);
    setClassifyMessage(null);
    try {
      const res = await fetch("/api/insights/bodhi-chat/classify", {
        method: "POST",
      });
      const json = (await res.json()) as {
        ok?: boolean;
        classified?: number;
        error?: string;
        message?: string;
      };
      if (!res.ok) {
        setClassifyMessage(json.error ?? "Classification failed.");
      } else {
        setClassifyMessage(
          json.classified != null
            ? `Labeled ${json.classified} conversation(s). Refreshing chart…`
            : json.message ?? "Done."
        );
        await load();
      }
    } catch {
      setClassifyMessage("Network error while classifying.");
    } finally {
      setClassifyBusy(false);
    }
  };

  const communityTotal =
    data?.communityTerms?.reduce((s, r) => s + r.count, 0) ?? 0;
  const personalTotal =
    data?.personalTerms?.reduce((s, r) => s + r.count, 0) ?? 0;

  return (
    <section className="mb-6 space-y-5">
      <div
        className="rounded-[14px] px-6 py-6"
        style={{ backgroundColor: "#242424", border: "1px solid #333333" }}
      >
        <h2 className="font-display text-[1.55rem] mb-2" style={{ color: "#C8A96E" }}>
          From Bodhi conversations
        </h2>
        <p className="text-[0.95rem] leading-[1.75]" style={{ color: "#D4CFC7" }}>
          Signals from Bodhi&apos;s own chat data (not Reddit): curated themes and short
          phrases from user messages, optional Claude mood trends, and a personal column when
          you&apos;re signed in.
        </p>
      </div>

      {isLoading && (
        <div
          className="rounded-[14px] px-5 py-4 text-center animate-pulse"
          style={{
            backgroundColor: "#242424",
            border: "1px solid #323232",
            color: "#8F8A81",
            fontSize: "0.9rem",
          }}
        >
          Loading Bodhi chat insights…
        </div>
      )}

      {loadError && !isLoading && (
        <div
          className="rounded-[12px] px-4 py-3"
          style={{
            backgroundColor: "rgba(232, 160, 160, 0.08)",
            border: "1px solid rgba(232, 160, 160, 0.3)",
            color: "#E8A0A0",
            fontSize: "0.85rem",
          }}
        >
          {loadError}
        </div>
      )}

      {data && !data.dbConfigured && (
        <p style={{ color: "#8F8A81", fontSize: "0.88rem" }}>
          Database is not configured, so live chat insights are unavailable.
        </p>
      )}

      {data && data.dbConfigured && (
        <>
          {/* What people ask most */}
          <div
            className="rounded-[14px] p-5"
            style={{ backgroundColor: "#242424", border: "1px solid #323232" }}
          >
            <h3 className="font-display text-[1.35rem] mb-1" style={{ color: "#F0EDE6" }}>
              What people ask most
            </h3>
            <p className="mb-4 text-[0.82rem]" style={{ color: "#8F8A81" }}>
              {data.communityExcludesYou
                ? `Themes and phrases from other practitioners’ chats (your sessions are excluded). Sample: up to ${data.communitySessionSampleSize || "—"} recent sessions.`
                : `Themes and phrases from user messages across up to ${data.communitySessionSampleSize || "—"} recent sessions (all users). Sign in to compare with your own mix.`}
            </p>
            {data.communityTerms.length === 0 ? (
              <p style={{ color: "#A8A49C", fontSize: "0.88rem" }}>
                {data.communityExcludesYou && (data.communitySessionSampleSize ?? 0) === 0
                  ? "No chats from other accounts in this sample yet. When someone else uses Bodhi, their themes will appear here — your personal column still reflects only you."
                  : "No on-topic user messages in the sample yet. As people chat, recurring themes will appear here."}
              </p>
            ) : (
              <ol className="space-y-2.5">
                {data.communityTerms.map((row, idx) => {
                  const rank = idx + 1;
                  const pct = percentage(row.count, communityTotal);
                  const sizeRem = Math.max(0.78, 1.05 - idx * 0.045);
                  return (
                    <li
                      key={row.term}
                      className="flex items-center justify-between gap-3 rounded-[10px] px-3 py-2"
                      style={{ backgroundColor: "#202020", border: "1px solid #2F2F2F" }}
                    >
                      <div className="flex items-baseline gap-2 min-w-0">
                        <span
                          className="font-display shrink-0"
                          style={{ color: "#6E6A62", fontSize: "0.75rem" }}
                        >
                          {rank}.
                        </span>
                        <span
                          className="truncate font-medium"
                          style={{ color: "#E8D5A8", fontSize: `${sizeRem}rem` }}
                        >
                          {row.term}
                        </span>
                      </div>
                      <span
                        className="shrink-0 text-[0.78rem] font-semibold"
                        style={{ color: "#C8A96E" }}
                      >
                        {row.count} ({pct}%)
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>

          {/* Sentiment over time */}
          <div
            className="rounded-[14px] p-5"
            style={{ backgroundColor: "#242424", border: "1px solid #323232" }}
          >
            <h3 className="font-display text-[1.35rem] mb-1" style={{ color: "#F0EDE6" }}>
              Sentiment over time
            </h3>
            <p className="mb-4 text-[0.82rem] leading-relaxed" style={{ color: "#8F8A81" }}>
              Each line counts sessions labeled{" "}
              <span style={{ color: "#9BC99B" }}>positive</span>,{" "}
              <span style={{ color: "#8FB8D4" }}>curious</span>, or{" "}
              <span style={{ color: "#D49B9B" }}>struggling</span> (Claude), grouped by the
              week the session last updated. Labels are stored on the session so the chart
              stays fast after the first pass.
            </p>

            {data.sentimentTimeline.length === 0 ? (
              <p className="mb-3" style={{ color: "#A8A49C", fontSize: "0.88rem" }}>
                No labeled conversations yet. When you&apos;re signed in, you can run a small
                batch analysis (up to 10 sessions per click) to seed the chart.
              </p>
            ) : (
              <div className="w-full" style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={data.sentimentTimeline}
                    margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid stroke="#2A2A2A" strokeDasharray="3 3" />
                    <XAxis
                      dataKey="weekStart"
                      tick={{ fill: "#8F8A81", fontSize: 11 }}
                      tickFormatter={(v: string) => {
                        const row = data.sentimentTimeline.find((r) => r.weekStart === v);
                        return row?.weekLabel ?? v;
                      }}
                    />
                    <YAxis tick={{ fill: "#8F8A81", fontSize: 11 }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1C1C1C",
                        border: "1px solid #333",
                        borderRadius: 8,
                        color: "#E8E1D6",
                        fontSize: 12,
                      }}
                      labelFormatter={(_label, payload) => {
                        const row = payload?.[0]?.payload as
                          | SentimentRow
                          | undefined;
                        return row?.weekLabel ?? "";
                      }}
                    />
                    <Legend wrapperStyle={{ color: "#A8A49C", fontSize: 12 }} />
                    <Line
                      type="monotone"
                      dataKey="positive"
                      name="Positive"
                      stroke="#7CB97C"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="curious"
                      name="Curious"
                      stroke="#7CB8D9"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="struggling"
                      name="Struggling"
                      stroke="#C97C7C"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <button
                type="button"
                onClick={() => void runClassify()}
                disabled={
                  classifyBusy ||
                  !data.canClassify ||
                  data.unclassifiedSessionCount === 0
                }
                className="rounded-[10px] px-4 py-2 text-[0.82rem] font-semibold transition-opacity disabled:opacity-45"
                style={{
                  backgroundColor: "rgba(200, 169, 110, 0.2)",
                  border: "1px solid rgba(200, 169, 110, 0.45)",
                  color: "#E8D5A8",
                }}
              >
                {classifyBusy
                  ? "Analyzing…"
                  : status !== "authenticated"
                    ? "Sign in to run analysis"
                    : "Analyze next 10 conversations"}
              </button>
              <span style={{ color: "#6E6A62", fontSize: "0.78rem" }}>
                {data.canClassify
                  ? `${data.classifiedSessionCount} labeled · ${data.unclassifiedSessionCount} waiting`
                  : "Add ANTHROPIC_API_KEY to enable Claude labeling."}
              </span>
            </div>
            {classifyMessage && (
              <p className="mt-2 text-[0.8rem]" style={{ color: "#A8A49C" }}>
                {classifyMessage}
              </p>
            )}
          </div>

          {/* Community vs personal topic mix */}
          <div
            className="rounded-[14px] p-5"
            style={{ backgroundColor: "#242424", border: "1px solid #323232" }}
          >
            <h3 className="font-display text-[1.35rem] mb-1" style={{ color: "#F0EDE6" }}>
              Topic mix: others vs you
            </h3>
            <p className="mb-4 text-[0.82rem]" style={{ color: "#8F8A81" }}>
              Same ranking as above: other practitioners (excluding you when signed in) beside
              your own chats.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div
                className="rounded-[10px] p-4"
                style={{ backgroundColor: "#202020", border: "1px solid #2F2F2F" }}
              >
                <h4 className="font-display text-[1.05rem] mb-3" style={{ color: "#E8D5A8" }}>
                  {data.communityExcludesYou ? "Other practitioners" : "All users"}
                </h4>
                {data.communityTerms.length === 0 ? (
                  <p style={{ color: "#6E6A62", fontSize: "0.84rem" }}>No data yet.</p>
                ) : (
                  <div className="space-y-2.5">
                    {data.communityTerms.map((row) => {
                      const pct = percentage(row.count, communityTotal);
                      return (
                        <div key={`c-${row.term}`}>
                          <div className="flex items-center justify-between mb-1">
                            <span
                              className="truncate pr-2"
                              style={{ color: "#D4CFC7", fontSize: "0.82rem" }}
                            >
                              {row.term}
                            </span>
                            <span
                              style={{ color: "#C8A96E", fontSize: "0.76rem", fontWeight: 600 }}
                            >
                              {pct}%
                            </span>
                          </div>
                          <div
                            className="h-2 rounded-full"
                            style={{ backgroundColor: "#1C1C1C" }}
                          >
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${pct}%`, backgroundColor: "#C8A96E" }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div
                className="rounded-[10px] p-4"
                style={{ backgroundColor: "#202020", border: "1px solid #2F2F2F" }}
              >
                <h4 className="font-display text-[1.05rem] mb-3" style={{ color: "#E8D5A8" }}>
                  You
                </h4>
                {status !== "authenticated" && (
                  <p style={{ color: "#A8A49C", fontSize: "0.86rem", lineHeight: 1.6 }}>
                    <button
                      type="button"
                      onClick={() => void signIn("google")}
                      className="underline font-semibold"
                      style={{ color: "#C8A96E" }}
                    >
                      Sign in with Google
                    </button>{" "}
                    to see your personal themes next to other practitioners.
                  </p>
                )}
                {status === "authenticated" && data.personalTerms && (
                  <>
                    <p className="mb-3 text-[0.76rem]" style={{ color: "#6E6A62" }}>
                      Sample: {data.personalSessionSampleSize} of your recent sessions.
                    </p>
                    {data.personalTerms.length === 0 ? (
                      <p style={{ color: "#6E6A62", fontSize: "0.84rem" }}>
                        No chats yet. Start a{" "}
                        <Link href="/chat" className="underline" style={{ color: "#C8A96E" }}>
                          conversation
                        </Link>{" "}
                        and check back.
                      </p>
                    ) : (
                      <div className="space-y-2.5">
                        {data.personalTerms.map((row) => {
                          const pct = percentage(row.count, personalTotal);
                          return (
                            <div key={`p-${row.term}`}>
                              <div className="flex items-center justify-between mb-1">
                                <span
                                  className="truncate pr-2"
                                  style={{ color: "#D4CFC7", fontSize: "0.82rem" }}
                                >
                                  {row.term}
                                </span>
                                <span
                                  style={{
                                    color: "#C8A96E",
                                    fontSize: "0.76rem",
                                    fontWeight: 600,
                                  }}
                                >
                                  {pct}%
                                </span>
                              </div>
                              <div
                                className="h-2 rounded-full"
                                style={{ backgroundColor: "#1C1C1C" }}
                              >
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${pct}%`,
                                    backgroundColor: "rgba(200, 169, 110, 0.55)",
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
