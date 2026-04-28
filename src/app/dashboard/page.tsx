"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import NavBar from "@/components/NavBar";
import AuthGate from "@/components/auth/AuthGate";

interface MonthGridCell {
  key: string;
  dayNumber: number | null;
  isActive: boolean;
  activityCount: number;
}

interface StreakResponse {
  streakDays: number;
  bestStreak: number;
  totalActiveDays: number;
  monthGrid: MonthGridCell[];
}

interface ReadingSummary {
  title: string;
  slug: string;
  count: number;
  lastRead: string;
}

interface ReadingsResponse {
  totalReads: number;
  summary: ReadingSummary[];
  readings: unknown[];
}

interface PrayerSummary {
  title: string;
  count: number;
  lastPrayed: string;
}

interface IdentifySummary {
  title: string;
  count: number;
  lastIdentified: string;
}

interface MeditationSummary {
  title: string;
  count: number;
  lastSession: string;
}

interface StatsResponse {
  totalConversations: number;
  totalMessages: number;
  favoriteTeacher: string;
  topTopics: string[];
  scripturesRead: number;
  prayerCount: number;
  identifyCount: number;
  meditationCount: number;
  currentStreak: number;
  memberSince: string;
  user: {
    name?: string;
    email?: string;
    image?: string | null;
    experienceLevel?: "beginner" | "intermediate" | "advanced";
    preferredTradition?: string | null;
    lastActiveDate?: string;
    createdAt?: string;
  } | null;
  prayerSummary: PrayerSummary[];
  identifySummary: IdentifySummary[];
  meditationSummary: MeditationSummary[];
  practicesStarted: string[];
}

const ENCOURAGEMENTS = [
  "Every moment of practice plants a seed of peace.",
  "The path of a thousand miles begins with a single step.",
  "You showed up today. That is enough.",
  "Even a single breath, taken with awareness, is practice.",
  "Stillness is not the absence of movement — it is the presence of peace.",
];

function formatDate(date: string) {
  return new Date(date).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type ExperienceLevel = "beginner" | "intermediate" | "advanced";

function levelLabel(level: ExperienceLevel) {
  if (level === "advanced") return "Dedicated Student";
  if (level === "intermediate") return "Growing Practitioner";
  return "Beginner";
}

function intensityCardStyle(count: number, maxCount: number): React.CSSProperties {
  if (maxCount === 0 || count === 0) {
    return { backgroundColor: "#202020", border: "1px solid #2F2F2F" };
  }
  const ratio = count / maxCount;
  const bgAlpha = 0.06 + 0.28 * ratio;
  const borderAlpha = 0.18 + 0.42 * ratio;
  return {
    backgroundColor: `rgba(200, 169, 110, ${bgAlpha})`,
    border: `1px solid rgba(200, 169, 110, ${borderAlpha})`,
  };
}

function intensityTitleColor(count: number, maxCount: number): string {
  if (maxCount === 0 || count === 0) return "#D4CFC7";
  const ratio = count / maxCount;
  if (ratio >= 0.75) return "#C8A96E";
  if (ratio >= 0.4) return "#D4B87A";
  return "#E8D5A8";
}

function intensityBadgeColor(count: number, maxCount: number): string {
  if (maxCount === 0 || count === 0) return "#8F8A81";
  const ratio = count / maxCount;
  if (ratio >= 0.75) return "#C8A96E";
  if (ratio >= 0.4) return "#B8973A";
  return "#A89060";
}

export default function DashboardPage() {
  return (
    <AuthGate message="Sign in with Google to see your practice streak, chat history, and reading progress.">
      <DashboardPageInner />
    </AuthGate>
  );
}

function DashboardPageInner() {
  const { status: authStatus } = useSession();
  const [streak, setStreak] = useState<StreakResponse | null>(null);
  const [readings, setReadings] = useState<ReadingsResponse | null>(null);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isAiSummaryLoading, setIsAiSummaryLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [encouragementIdx, setEncouragementIdx] = useState(0);

  useEffect(() => {
    if (authStatus !== "authenticated") return;
    let cancelled = false;
    setIsLoading(true);
    setIsAiSummaryLoading(true);
    setAiSummary(null);

    (async () => {
      setLoadError(null);
      try {
        const [streakRes, readingsRes, statsRes, journeySummaryRes] = await Promise.all([
          fetch("/api/dashboard/streak", { cache: "no-store", credentials: "same-origin" }),
          fetch("/api/dashboard/readings", { cache: "no-store", credentials: "same-origin" }),
          fetch("/api/dashboard/stats", { cache: "no-store", credentials: "same-origin" }),
          fetch("/api/dashboard/journey-summary", { cache: "no-store", credentials: "same-origin" }),
        ]);

        if (cancelled) return;

        if (streakRes.ok) setStreak((await streakRes.json()) as StreakResponse);
        if (readingsRes.ok) setReadings((await readingsRes.json()) as ReadingsResponse);
        if (statsRes.ok) setStats((await statsRes.json()) as StatsResponse);
        if (journeySummaryRes.ok) {
          const journeyPayload = (await journeySummaryRes.json()) as { summary?: string };
          setAiSummary(
            typeof journeyPayload.summary === "string" && journeyPayload.summary.trim().length > 0
              ? journeyPayload.summary
              : null
          );
        }

        if (!streakRes.ok && !readingsRes.ok && !statsRes.ok) {
          if (streakRes.status === 401 && readingsRes.status === 401 && statsRes.status === 401) {
            setLoadError("The server could not verify your account. Sign out, sign in again, then reload.");
          } else {
            setLoadError("Couldn't load your dashboard. Please refresh.");
          }
        } else if (!statsRes.ok) {
          let msg = `Could not load practice summary (${statsRes.status}).`;
          try {
            const j = (await statsRes.json()) as { error?: string };
            if (typeof j.error === "string") msg = j.error;
          } catch { /* ignore */ }
          setLoadError(msg);
        }
      } catch {
        if (!cancelled) setLoadError("Couldn't reach the server. Please check your connection.");
      } finally {
        if (!cancelled) {
          setIsLoading(false);
          setIsAiSummaryLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [authStatus]);

  useEffect(() => {
    const timer = setInterval(() => {
      setEncouragementIdx((idx) => (idx + 1) % ENCOURAGEMENTS.length);
    }, 7000);
    return () => clearInterval(timer);
  }, []);

  const streakDaysFromLogs = streak?.streakDays ?? 0;
  const bestStreak = streak?.bestStreak ?? 0;
  const monthGrid = streak?.monthGrid ?? [];

  const scriptureStats = useMemo(
    () => [...(readings?.summary ?? [])].sort((a, b) => b.count - a.count),
    [readings]
  );
  const prayerStats = useMemo(
    () => [...(stats?.prayerSummary ?? [])].sort((a, b) => b.count - a.count),
    [stats]
  );
  const meditationStats = useMemo(
    () => [...(stats?.meditationSummary ?? [])].sort((a, b) => b.count - a.count),
    [stats]
  );
  const identifyStats = useMemo(
    () => [...(stats?.identifySummary ?? [])].sort((a, b) => b.count - a.count),
    [stats]
  );

  const streakDays          = stats?.currentStreak ?? streakDaysFromLogs;
  const chatCount           = stats?.totalConversations ?? 0;
  const prayerCount         = stats?.prayerCount ?? 0;
  const meditationCount     = stats?.meditationCount ?? 0;
  const scripturesReadCount = stats?.scripturesRead ?? 0;
  const topTopics           = stats?.topTopics ?? [];
  const experienceLevel     = stats?.user?.experienceLevel ?? "beginner";

  const scriptureMax  = scriptureStats[0]?.count ?? 0;
  const prayerMax     = prayerStats[0]?.count ?? 0;
  const meditationMax = meditationStats[0]?.count ?? 0;
  const identifyMax   = identifyStats[0]?.count ?? 0;

  const isBrandNewUser =
    !isLoading &&
    streakDays === 0 &&
    (readings?.totalReads ?? 0) === 0 &&
    chatCount === 0 &&
    prayerCount === 0 &&
    meditationCount === 0 &&
    scripturesReadCount === 0;

  // Pattern-focused fallback (shown only when AI summary is unavailable)
  const journeySummaryFallback = useMemo((): string | null => {
    if (chatCount === 0 && (readings?.totalReads ?? 0) === 0 && prayerCount === 0 && scripturesReadCount === 0) {
      return null;
    }
    const counts = [
      { label: "scripture reading", n: scripturesReadCount },
      { label: "prayer", n: prayerCount },
      { label: "meditation", n: meditationCount },
    ].filter((x) => x.n > 0).sort((a, b) => b.n - a.n);
    const dominant = counts[0];
    const topTopic = topTopics[0] ?? null;
    if (dominant && topTopic) {
      return `You return most often to ${dominant.label} and consistently explore themes of ${topTopic} — a clear sign of where your practice is taking root. Try deepening this by sitting with one teaching from that theme for a full week rather than moving on.`;
    }
    if (dominant) {
      return `${dominant.label.charAt(0).toUpperCase() + dominant.label.slice(1)} is clearly where your practice is anchored. Consider pairing it with a short meditation session to let each practice reinforce the other.`;
    }
    return `Your conversations point toward ${topTopic ?? "inner exploration"} — try logging a prayer or meditation around that theme to anchor it in daily practice.`;
  }, [chatCount, meditationCount, prayerCount, readings?.totalReads, scripturesReadCount, topTopics]);

  function EmptyState({ label }: { label: string }) {
    return (
      <p style={{ color: "#6E6A62", fontSize: "0.82rem", lineHeight: 1.6 }}>
        No {label} logged yet.
      </p>
    );
  }

  function HistoryList({
    items,
    maxCount,
    countLabel,
    dateLabel,
    getDate,
  }: {
    items: Array<{ title: string; count: number }>;
    maxCount: number;
    countLabel: string;
    dateLabel: string;
    getDate: (item: { title: string; count: number }) => string;
  }) {
    return (
      <div className="space-y-2">
        {items.map((entry) => (
          <div
            key={entry.title}
            className="rounded-[9px] px-3 py-2.5"
            style={intensityCardStyle(entry.count, maxCount)}
          >
            <div className="flex items-start justify-between gap-2">
              <span
                className="text-[0.82rem] font-semibold leading-snug"
                style={{ color: intensityTitleColor(entry.count, maxCount) }}
              >
                {entry.title}
              </span>
              <span
                className="shrink-0 text-[0.72rem] font-bold"
                style={{ color: intensityBadgeColor(entry.count, maxCount) }}
              >
                {entry.count}x {countLabel}
              </span>
            </div>
            <p style={{ color: "#5A5650", fontSize: "0.7rem", marginTop: 3 }}>
              {dateLabel}: {formatDate(getDate(entry))}
            </p>
          </div>
        ))}
      </div>
    );
  }

  function SkeletonRows() {
    return (
      <div className="space-y-2 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 rounded-[9px]" style={{ backgroundColor: "#1E1E1E" }} />
        ))}
      </div>
    );
  }

  const insightText = aiSummary ?? journeySummaryFallback;

  return (
    <div className="relative z-10 max-w-[1080px] mx-auto px-4 sm:px-8 pt-8 sm:pt-[52px] pb-12 min-h-screen">
      <NavBar />

      {loadError && (
        <div
          className="rounded-[12px] px-4 py-3 mb-4"
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

      {isLoading && !loadError && (
        <div
          className="rounded-[14px] p-5 mb-4 space-y-3"
          style={{ backgroundColor: "#242424", border: "1px solid #323232" }}
        >
          <div className="h-4 rounded w-1/3 animate-pulse" style={{ backgroundColor: "#2F2F2F" }} />
          <div className="h-3 rounded w-full animate-pulse" style={{ backgroundColor: "#2A2A2A" }} />
          <p className="text-center text-[0.8rem] pt-1" style={{ color: "#6E6A62" }}>
            Gathering your practice history...
          </p>
        </div>
      )}

      {isBrandNewUser && (
        <div
          className="rounded-[14px] px-5 py-5 mb-4 text-center"
          style={{
            backgroundColor: "rgba(200, 169, 110, 0.08)",
            border: "1px solid rgba(200, 169, 110, 0.25)",
          }}
        >
          <p className="font-display italic text-[1.1rem] mb-1" style={{ color: "#E8D5A8" }}>
            Welcome, friend. Your journey starts today.
          </p>
          <p style={{ color: "#A8A49C", fontSize: "0.88rem", lineHeight: 1.6 }}>
            Chat with Bodhi, read a scripture, or complete a prayer.
          </p>
        </div>
      )}

      {/* ROW 1: Practice Streak + Your Journey So Far */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">

        {/* Practice Streak */}
        <section
          className="rounded-[14px] p-5"
          style={{ backgroundColor: "#242424", border: "1px solid #323232" }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-[1.15rem]" style={{ color: "#F0EDE6" }}>
              Practice Streak
            </h2>
            {!isLoading && (
              <div className="flex gap-2">
                {[
                  { label: "Current streak", value: streakDays },
                  { label: "Best streak", value: bestStreak },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="rounded-[9px] px-3 py-2 text-center"
                    style={{ backgroundColor: "#1C1C1C", border: "1px solid #2A2A2A" }}
                  >
                    <div className="font-semibold text-[1.05rem]" style={{ color: "#C8A96E" }}>
                      {value}
                    </div>
                    <div style={{ color: "#6E6A62", fontSize: "0.6rem", marginTop: 1 }}>{label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="grid grid-cols-7 gap-1.5">
              {Array.from({ length: 35 }).map((_, i) => (
                <div key={i} className="h-7 rounded-[4px] animate-pulse" style={{ backgroundColor: "#1E1E1E" }} />
              ))}
            </div>
          ) : (
            <>
              {streakDays === 0 && (
                <p style={{ color: "#6E6A62", fontSize: "0.78rem", marginBottom: 10 }}>
                  Complete any practice today to begin your streak.
                </p>
              )}
              <div className="grid grid-cols-7 gap-1.5" style={{ marginTop: 4 }}>
                {monthGrid.map((cell) => (
                  <div
                    key={cell.key}
                    className="h-7 rounded-[4px] text-[0.65rem] flex items-center justify-center"
                    title={
                      cell.isActive
                        ? `${cell.activityCount} practice${cell.activityCount === 1 ? "" : "s"}`
                        : undefined
                    }
                    style={{
                      backgroundColor: cell.dayNumber
                        ? cell.isActive ? "rgba(200, 169, 110, 0.72)" : "#1B1B1B"
                        : "transparent",
                      color: cell.isActive ? "#1A1A1A" : "#6E6A62",
                      border: cell.dayNumber ? "1px solid #313131" : "none",
                    }}
                  >
                    {cell.dayNumber}
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        {/* Your Journey So Far */}
        <section
          className="rounded-[14px] p-5 flex flex-col"
          style={{ backgroundColor: "#242424", border: "1px solid #323232" }}
        >
          <div className="flex items-center gap-3 mb-4">
            <h2 className="font-display text-[1.15rem]" style={{ color: "#F0EDE6" }}>
              Your Journey So Far
            </h2>
            {!isLoading && (
              <span
                className="px-2.5 py-0.5 rounded-full text-[0.72rem] font-semibold"
                style={{
                  backgroundColor: "rgba(200, 169, 110, 0.16)",
                  border: "1px solid rgba(200, 169, 110, 0.35)",
                  color: "#E8D5A8",
                }}
              >
                {levelLabel(experienceLevel)}
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-3 animate-pulse flex-1">
              <div className="flex gap-2">
                {[1,2,3,4].map((i) => (
                  <div key={i} className="h-10 flex-1 rounded-[8px]" style={{ backgroundColor: "#1E1E1E" }} />
                ))}
              </div>
              <div className="h-24 rounded-[10px]" style={{ backgroundColor: "#1A1A1A" }} />
            </div>
          ) : (
            <div className="flex-1 flex flex-col gap-3">

              {/* Compact stat strip */}
              <div className="flex gap-2">
                {[
                  { label: "Chats", value: chatCount },
                  { label: "Scriptures", value: scripturesReadCount },
                  { label: "Prayers", value: prayerCount },
                  { label: "Meditations", value: meditationCount },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="flex-1 rounded-[9px] px-2 py-2 text-center"
                    style={{ backgroundColor: "#1C1C1C", border: "1px solid #2A2A2A" }}
                  >
                    <div className="font-semibold text-[1.05rem]" style={{ color: "#C8A96E" }}>
                      {value}
                    </div>
                    <div style={{ color: "#6E6A62", fontSize: "0.6rem", marginTop: 1 }}>{label}</div>
                  </div>
                ))}
              </div>

              {/* Bodhi notices — pattern insight card */}
              <div
                className="rounded-[10px] px-4 py-3 flex-1"
                style={{
                  backgroundColor: "rgba(200, 169, 110, 0.05)",
                  border: "1px solid rgba(200, 169, 110, 0.15)",
                }}
              >
                <p
                  className="uppercase tracking-widest mb-2"
                  style={{ color: "#8F7A52", fontSize: "0.6rem" }}
                >
                  Bodhi notices
                </p>
                {isAiSummaryLoading ? (
                  <div className="space-y-2 animate-pulse">
                    <div className="h-2.5 rounded w-full" style={{ backgroundColor: "#2A2A2A" }} />
                    <div className="h-2.5 rounded w-5/6" style={{ backgroundColor: "#252525" }} />
                    <div className="h-2.5 rounded w-3/5" style={{ backgroundColor: "#222222" }} />
                  </div>
                ) : insightText ? (
                  <p style={{ color: "#C9C3B9", fontSize: "0.83rem", lineHeight: 1.7 }}>
                    {insightText}
                  </p>
                ) : (
                  <p style={{ color: "#5A5650", fontSize: "0.82rem" }}>
                    Start a practice and Bodhi will recognize your patterns here.
                  </p>
                )}
              </div>

            </div>
          )}
        </section>
      </div>

      {/* ROW 2: Scripture Reading + Meditation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <section
          className="rounded-[14px] p-5"
          style={{ backgroundColor: "#242424", border: "1px solid #323232" }}
        >
          <h2
            className="font-display text-[1.15rem] mb-4"
            style={{ color: "#F0EDE6", borderBottom: "1px solid #2C2C2C", paddingBottom: 10 }}
          >
            Scripture Reading
          </h2>
          {isLoading ? <SkeletonRows /> : scriptureStats.length === 0 ? (
            <EmptyState label="readings" />
          ) : (
            <HistoryList
              items={scriptureStats}
              maxCount={scriptureMax}
              countLabel="read"
              dateLabel="Last read"
              getDate={(e) => (e as ReadingSummary).lastRead}
            />
          )}
        </section>

        <section
          className="rounded-[14px] p-5"
          style={{ backgroundColor: "#242424", border: "1px solid #323232" }}
        >
          <h2
            className="font-display text-[1.15rem] mb-4"
            style={{ color: "#F0EDE6", borderBottom: "1px solid #2C2C2C", paddingBottom: 10 }}
          >
            Meditation
          </h2>
          {isLoading ? <SkeletonRows /> : meditationStats.length === 0 ? (
            <EmptyState label="meditation sessions" />
          ) : (
            <HistoryList
              items={meditationStats}
              maxCount={meditationMax}
              countLabel="sessions"
              dateLabel="Last session"
              getDate={(e) => (e as MeditationSummary).lastSession}
            />
          )}
        </section>
      </div>

      {/* ROW 3: Prayer + Identify */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section
          className="rounded-[14px] p-5"
          style={{ backgroundColor: "#242424", border: "1px solid #323232" }}
        >
          <h2
            className="font-display text-[1.15rem] mb-4"
            style={{ color: "#F0EDE6", borderBottom: "1px solid #2C2C2C", paddingBottom: 10 }}
          >
            Prayer
          </h2>
          {isLoading ? <SkeletonRows /> : prayerStats.length === 0 ? (
            <EmptyState label="prayers" />
          ) : (
            <HistoryList
              items={prayerStats}
              maxCount={prayerMax}
              countLabel="completed"
              dateLabel="Last prayed"
              getDate={(e) => (e as PrayerSummary).lastPrayed}
            />
          )}
        </section>

        <section
          className="rounded-[14px] p-5"
          style={{ backgroundColor: "#242424", border: "1px solid #323232" }}
        >
          <h2
            className="font-display text-[1.15rem] mb-4"
            style={{ color: "#F0EDE6", borderBottom: "1px solid #2C2C2C", paddingBottom: 10 }}
          >
            Identify
          </h2>
          {isLoading ? <SkeletonRows /> : identifyStats.length === 0 ? (
            <EmptyState label="identifications" />
          ) : (
            <HistoryList
              items={identifyStats}
              maxCount={identifyMax}
              countLabel="identified"
              dateLabel="Last identified"
              getDate={(e) => (e as IdentifySummary).lastIdentified}
            />
          )}
        </section>
      </div>

      {/* Encouragement banner */}
      <div
        className="mt-6 text-center py-3 px-6 rounded-full mx-auto max-w-fit"
        style={{
          background: "linear-gradient(135deg, rgba(200, 169, 110, 0.10) 0%, rgba(200, 169, 110, 0.03) 100%)",
          border: "1px solid rgba(200, 169, 110, 0.18)",
        }}
      >
        <p className="font-display italic text-[0.9rem] leading-[1.6]" style={{ color: "#E8D5A8" }}>
          {ENCOURAGEMENTS[encouragementIdx]}
        </p>
      </div>
    </div>
  );
}
