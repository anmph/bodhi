"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
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

/** Gold-toned palette from pale straw to deep amber — all shades stay on-theme. */
const DONUT_COLORS = [
  "#C8A96E", // primary gold
  "#E2CC90", // light straw
  "#A08050", // dark gold
  "#D4B87A", // warm mid-gold
  "#8A6E3A", // deep amber
  "#DEC87C", // bright gold
  "#B89060", // tan gold
  "#F0DDA0", // pale cream-gold
  "#967040", // rich amber
  "#CAB482", // soft gold
];

function percentage(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 1000) / 10;
}

function capitalize(s: string) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function renderPctLabel(props: {
  cx?: number; cy?: number; midAngle?: number;
  innerRadius?: number; outerRadius?: number; percent?: number;
}) {
  const { cx = 0, cy = 0, midAngle = 0, innerRadius = 0, outerRadius = 0, percent = 0 } = props;
  if (percent < 0.06) return null; // skip slices too small to label
  const pct = Math.round(percent * 1000) / 10;
  const RADIAN = Math.PI / 180;
  const r = innerRadius + (outerRadius - innerRadius) * 0.52;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      dominantBaseline="central"
      fill="#1A1200"
      fontSize={10}
      fontWeight="700"
    >
      {`${pct}%`}
    </text>
  );
}

/* ─── Donut chart for topic mix ─── */
function TopicDonut({
  terms,
  total,
  emptyMessage,
}: {
  terms: TermRow[];
  total: number;
  emptyMessage: React.ReactNode;
}) {
  if (terms.length === 0) {
    return (
      <p style={{ color: "#6E6A62", fontSize: "0.84rem", padding: "1rem 0" }}>
        {emptyMessage}
      </p>
    );
  }

  const chartData = terms.map((r) => ({
    name: r.term,
    value: r.count,
    pct: percentage(r.count, total),
  }));

  return (
    <>
      <div style={{ width: "100%", height: 210 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={52}
              outerRadius={84}
              paddingAngle={2}
              stroke="#181818"
              strokeWidth={1}
              labelLine={false}
              label={renderPctLabel}
            >
              {chartData.map((_, i) => (
                <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "#1C1C1C",
                border: "1px solid #3A3020",
                borderRadius: 8,
                color: "#E8E1D6",
                fontSize: 12,
              }}
              formatter={(value, name) => {
                const n =
                  typeof value === "number"
                    ? value
                    : typeof value === "string"
                      ? Number(value) || 0
                      : 0;
                const pct = percentage(n, total);
                return [`${n} sessions (${pct}%)`, capitalize(String(name))];
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2 px-1">
        {chartData.map((d, i) => (
          <div key={d.name} className="flex items-center gap-1.5">
            <span
              className="inline-block w-2.5 h-2.5 rounded-sm shrink-0"
              style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }}
            />
            <span style={{ color: "#C4BDB2", fontSize: "0.73rem" }}>
              {capitalize(d.name)} ({d.pct}%)
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

export default function BodhiChatInsights() {
  const { status } = useSession();
  const [data, setData] = useState<BodhiChatPayload | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [classifyBusy, setClassifyBusy] = useState(false);
  const [classifyMessage, setClassifyMessage] = useState<string | null>(null);
  const autoClassifyDone = useRef(false);

  const load = useCallback(async (): Promise<BodhiChatPayload | null> => {
    setLoadError(null);
    try {
      const res = await fetch("/api/insights/bodhi-chat", { cache: "no-store" });
      const json = (await res.json()) as BodhiChatPayload;
      setData(json);
      if (!res.ok || json.ok === false) {
        setLoadError(json.error ?? "Could not load Bodhi chat insights.");
      }
      return json;
    } catch {
      setLoadError("Could not reach the server.");
      setData(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      const json = await load();
      // Auto-classify any pending sessions so the chart always reflects the
      // latest conversations without requiring a manual button click.
      if (
        !autoClassifyDone.current &&
        json?.ok &&
        json.signedIn &&
        json.canClassify &&
        json.unclassifiedSessionCount > 0
      ) {
        autoClassifyDone.current = true;
        setClassifyBusy(true);
        setClassifyMessage("Updating chart with your latest conversations…");
        try {
          const res = await fetch("/api/insights/bodhi-chat/classify", { method: "POST" });
          const result = (await res.json()) as { ok?: boolean; classified?: number; error?: string };
          if (res.ok && result.classified) {
            await load();
            setClassifyMessage(null);
          } else {
            setClassifyMessage(null);
          }
        } catch {
          setClassifyMessage(null);
        } finally {
          setClassifyBusy(false);
        }
      }
    })();
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
          json.classified != null && json.classified > 0
            ? `Labeled ${json.classified} conversation(s). Chart updated.`
            : "All conversations are already labeled — chart is up to date."
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
      {/* ── Intro ── */}
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

      {/* ── Loading ── */}
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

      {/* ── Error ── */}
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
          {/* ═══════════ 1. KEY INSIGHTS SUMMARY CARDS ═══════════ */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                label: "Sessions Analyzed",
                value:
                  data.communitySessionSampleSize +
                  (data.personalSessionSampleSize || 0),
              },
              { label: "Topics Tracked", value: data.communityTerms.length },
              { label: "Mood Labeled", value: data.classifiedSessionCount },
              { label: "Awaiting Analysis", value: data.unclassifiedSessionCount },
            ].map((card) => (
              <div
                key={card.label}
                className="rounded-xl px-4 py-4 text-center"
                style={{
                  backgroundColor: "#1E1E1E",
                  border: "1px solid #2A2A2A",
                }}
              >
                <p
                  className="text-2xl font-semibold mb-1"
                  style={{ color: "#C8A96E" }}
                >
                  {card.value}
                </p>
                <p className="text-xs" style={{ color: "#8F8A81" }}>
                  {card.label}
                </p>
              </div>
            ))}
          </div>

          {/* ═══════════ 2. TOPIC MIX — DONUT CHARTS ═══════════ */}
          <div
            className="rounded-[14px] p-5"
            style={{ backgroundColor: "#242424", border: "1px solid #323232" }}
          >
            <h3
              className="font-display text-[1.35rem] mb-1"
              style={{ color: "#F0EDE6" }}
            >
              Topic mix: others vs you
            </h3>
            <p className="mb-4 text-[0.82rem]" style={{ color: "#8F8A81" }}>
              How conversation themes are distributed — other practitioners beside
              your own chats.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Community donut */}
              <div
                className="rounded-[10px] p-4"
                style={{ backgroundColor: "#202020", border: "1px solid #2F2F2F" }}
              >
                <h4
                  className="font-display text-[1.05rem] mb-2"
                  style={{ color: "#E8D5A8" }}
                >
                  {data.communityExcludesYou ? "Other practitioners" : "All users"}
                </h4>
                <TopicDonut
                  terms={data.communityTerms}
                  total={communityTotal}
                  emptyMessage="No data yet."
                />
              </div>

              {/* Personal donut */}
              <div
                className="rounded-[10px] p-4"
                style={{ backgroundColor: "#202020", border: "1px solid #2F2F2F" }}
              >
                <h4
                  className="font-display text-[1.05rem] mb-2"
                  style={{ color: "#E8D5A8" }}
                >
                  You
                </h4>
                {status !== "authenticated" && (
                  <p
                    style={{
                      color: "#A8A49C",
                      fontSize: "0.86rem",
                      lineHeight: 1.6,
                    }}
                  >
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
                    <p
                      className="mb-2 text-[0.76rem]"
                      style={{ color: "#6E6A62" }}
                    >
                      Sample: {data.personalSessionSampleSize} of your recent
                      sessions.
                    </p>
                    <TopicDonut
                      terms={data.personalTerms}
                      total={personalTotal}
                      emptyMessage={
                        <>
                          No chats yet. Start a{" "}
                          <Link
                            href="/chat"
                            className="underline"
                            style={{ color: "#C8A96E" }}
                          >
                            conversation
                          </Link>{" "}
                          and check back.
                        </>
                      }
                    />
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ═══════════ 3. WHAT PEOPLE ASK MOST — HORIZONTAL BAR CHART ═══════════ */}
          <div
            className="rounded-[14px] p-5"
            style={{ backgroundColor: "#242424", border: "1px solid #323232" }}
          >
            <h3
              className="font-display text-[1.35rem] mb-1"
              style={{ color: "#F0EDE6" }}
            >
              What people ask most
            </h3>
            <p className="mb-4 text-[0.82rem]" style={{ color: "#8F8A81" }}>
              {data.communityExcludesYou
                ? `Themes and phrases from other practitioners' chats (your sessions are excluded). Sample: up to ${data.communitySessionSampleSize || "—"} recent sessions.`
                : `Themes and phrases from user messages across up to ${data.communitySessionSampleSize || "—"} recent sessions (all users). Sign in to compare with your own mix.`}
            </p>
            {data.communityTerms.length === 0 ? (
              <p style={{ color: "#A8A49C", fontSize: "0.88rem" }}>
                {data.communityExcludesYou &&
                (data.communitySessionSampleSize ?? 0) === 0
                  ? "No chats from other accounts in this sample yet. When someone else uses Bodhi, their themes will appear here — your personal column still reflects only you."
                  : "No on-topic user messages in the sample yet. As people chat, recurring themes will appear here."}
              </p>
            ) : (
              <div
                className="w-full"
                style={{
                  height: Math.max(280, data.communityTerms.length * 38),
                }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.communityTerms.map((r) => ({
                      ...r,
                      pct: percentage(r.count, communityTotal),
                    }))}
                    layout="vertical"
                    margin={{ top: 4, right: 30, left: 10, bottom: 4 }}
                  >
                    <CartesianGrid
                      stroke="#2A2A2A"
                      strokeDasharray="3 3"
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      tick={{ fill: "#8F8A81", fontSize: 11 }}
                      allowDecimals={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="term"
                      width={130}
                      tick={{ fill: "#D4CFC7", fontSize: 12 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1C1C1C",
                        border: "1px solid #333",
                        borderRadius: 8,
                        color: "#E8E1D6",
                        fontSize: 12,
                      }}
                      formatter={(value, _name, props: { payload?: { pct?: number } }) => {
                        const n =
                          typeof value === "number"
                            ? value
                            : typeof value === "string"
                              ? Number(value) || 0
                              : 0;
                        const pct = props.payload?.pct ?? 0;
                        return [`${n} mentions (${pct}%)`, "Count"];
                      }}
                    />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {data.communityTerms.map((_, i) => (
                        <Cell
                          key={i}
                          fill={DONUT_COLORS[i % DONUT_COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* ═══════════ 4. SENTIMENT OVER TIME — LINE CHART (unchanged) ═══════════ */}
          <div
            className="rounded-[14px] p-5"
            style={{ backgroundColor: "#242424", border: "1px solid #323232" }}
          >
            <h3
              className="font-display text-[1.35rem] mb-1"
              style={{ color: "#F0EDE6" }}
            >
              Sentiment over time
            </h3>
            <p
              className="mb-4 text-[0.82rem] leading-relaxed"
              style={{ color: "#8F8A81" }}
            >
              Each line counts sessions labeled{" "}
              <span style={{ color: "#9BC99B" }}>positive</span>,{" "}
              <span style={{ color: "#8FB8D4" }}>curious</span>, or{" "}
              <span style={{ color: "#D49B9B" }}>struggling</span> (Claude), grouped
              by the day the session last updated. Labels are stored on the session so
              the chart stays fast after the first pass.
            </p>

            {data.sentimentTimeline.length === 0 ? (
              <p
                className="mb-3"
                style={{ color: "#A8A49C", fontSize: "0.88rem" }}
              >
                No labeled conversations yet. When you&apos;re signed in, you can run
                a small batch analysis (up to 10 sessions per click) to seed the chart.
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
                        const row = data.sentimentTimeline.find(
                          (r) => r.weekStart === v
                        );
                        return row?.weekLabel ?? v;
                      }}
                    />
                    <YAxis
                      tick={{ fill: "#8F8A81", fontSize: 11 }}
                      allowDecimals={false}
                    />
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
                    <Legend
                      wrapperStyle={{ color: "#A8A49C", fontSize: 12 }}
                    />
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
                disabled={classifyBusy || !data.canClassify}
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
                    : data.unclassifiedSessionCount > 0
                      ? `Analyze next 10 conversations (${data.unclassifiedSessionCount} waiting)`
                      : "Refresh chart"}
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
        </>
      )}
    </section>
  );
}
