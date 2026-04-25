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

interface StatsResponse {
  totalConversations: number;
  totalMessages: number;
  favoriteTeacher: string;
  topTopics: string[];
  scripturesRead: number;
  prayerCount: number;
  identifyCount: number;
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
  practicesStarted: string[];
}

const ENCOURAGEMENTS = [
  "Every moment of practice plants a seed of peace.",
  "The path of a thousand miles begins with a single step.",
  "You showed up today. That is enough.",
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
          fetch("/api/dashboard/streak", {
            cache: "no-store",
            credentials: "same-origin",
          }),
          fetch("/api/dashboard/readings", {
            cache: "no-store",
            credentials: "same-origin",
          }),
          fetch("/api/dashboard/stats", {
            cache: "no-store",
            credentials: "same-origin",
          }),
          fetch("/api/dashboard/journey-summary", {
            cache: "no-store",
            credentials: "same-origin",
          }),
        ]);

        if (cancelled) return;

        if (streakRes.ok) {
          setStreak((await streakRes.json()) as StreakResponse);
        }
        if (readingsRes.ok) {
          setReadings((await readingsRes.json()) as ReadingsResponse);
        }
        if (statsRes.ok) {
          setStats((await statsRes.json()) as StatsResponse);
        }
        if (journeySummaryRes.ok) {
          const journeyPayload = (await journeySummaryRes.json()) as { summary?: string };
          setAiSummary(
            typeof journeyPayload.summary === "string" && journeyPayload.summary.trim().length > 0
              ? journeyPayload.summary
              : null
          );
        }

        if (!streakRes.ok && !readingsRes.ok && !statsRes.ok) {
          if (
            streakRes.status === 401 &&
            readingsRes.status === 401 &&
            statsRes.status === 401
          ) {
            setLoadError(
              "The server could not verify your account for saved practice data. Sign out, sign in with Google again, then reload this page. If you opened the app on more than one address (for example localhost:3000 and localhost:3001), use only the same URL you used to sign in — session cookies do not carry across different ports."
            );
          } else {
            setLoadError("Couldn't load your dashboard. Please refresh.");
          }
        } else if (!statsRes.ok) {
          let msg = `Could not load practice summary (${statsRes.status}).`;
          try {
            const j = (await statsRes.json()) as { error?: string };
            if (typeof j.error === "string") msg = j.error;
          } catch {
            /* ignore non-JSON body */
          }
          setLoadError(msg);
        }
      } catch {
        if (!cancelled) {
          setLoadError(
            "Couldn't reach the server. Please check your connection."
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
          setIsAiSummaryLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authStatus]);

  useEffect(() => {
    const timer = setInterval(() => {
      setEncouragementIdx((idx) => (idx + 1) % ENCOURAGEMENTS.length);
    }, 7000);
    return () => clearInterval(timer);
  }, []);

  const streakDaysFromLogs = streak?.streakDays ?? 0;
  const monthGrid = streak?.monthGrid ?? [];
  const scriptureStats = readings?.summary ?? [];
  const streakDays = stats?.currentStreak ?? streakDaysFromLogs;
  const chatCount = stats?.totalConversations ?? 0;
  const totalMessages = stats?.totalMessages ?? 0;
  const prayerCount = stats?.prayerCount ?? 0;
  const scripturesReadCount = stats?.scripturesRead ?? 0;
  const prayerStats = stats?.prayerSummary ?? [];
  const identifyStats = stats?.identifySummary ?? [];
  const topTopics = stats?.topTopics ?? [];
  const practicesStarted = stats?.practicesStarted ?? [];
  const favoriteTeacher = stats?.favoriteTeacher ?? "Not yet chosen";
  const memberSince = stats?.memberSince ?? "";
  const experienceLevel = stats?.user?.experienceLevel ?? "beginner";
  const isBrandNewUser =
    !isLoading &&
    streakDays === 0 &&
    (readings?.totalReads ?? 0) === 0 &&
    chatCount === 0 &&
    prayerCount === 0 &&
    scripturesReadCount === 0 &&
    totalMessages === 0;

  const journeySummaryFallback = useMemo(() => {
    if (
      chatCount === 0 &&
      (readings?.totalReads ?? 0) === 0 &&
      prayerCount === 0 &&
      scripturesReadCount === 0
    ) {
      return "Your path begins with a single breath. Try a chat with Bodhi, read a scripture, or log a prayer — every small practice plants a seed.";
    }
    const topics =
      topTopics.length > 0
        ? topTopics.join(", ")
        : "mindfulness and inner peace";
    const practices =
      practicesStarted.length > 0
        ? practicesStarted.slice(0, 2).join(", ")
        : "gentle reflection";
    const msgHint =
      totalMessages > 0
        ? ` Across your saved chats, Bodhi has exchanged about ${totalMessages} message${totalMessages === 1 ? "" : "s"} with you.`
        : "";
    return `You have been exploring ${topics}. Your practice includes ${practices}.${msgHint} Keep taking one grounded step at a time.`;
  }, [
    chatCount,
    prayerCount,
    practicesStarted,
    readings?.totalReads,
    scripturesReadCount,
    topTopics,
    totalMessages,
  ]);

  return (
    <div className="relative z-10 max-w-[920px] mx-auto px-4 sm:px-8 pt-8 sm:pt-[52px] pb-12 min-h-screen">
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
          <div
            className="h-4 rounded w-1/3 animate-pulse"
            style={{ backgroundColor: "#2F2F2F" }}
          />
          <div
            className="h-3 rounded w-full animate-pulse"
            style={{ backgroundColor: "#2A2A2A" }}
          />
          <div
            className="h-3 rounded w-5/6 animate-pulse"
            style={{ backgroundColor: "#2A2A2A" }}
          />
          <p className="text-center text-[0.8rem] pt-1" style={{ color: "#6E6A62" }}>
            Gathering your practice history…
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
          <p
            className="font-display italic text-[1.1rem] mb-1"
            style={{ color: "#E8D5A8" }}
          >
            Welcome, friend. Your journey starts today. 🪷
          </p>
          <p
            style={{ color: "#A8A49C", fontSize: "0.88rem", lineHeight: 1.6 }}
          >
            Chat with Bodhi, read a scripture, or complete a prayer — whatever
            you practice will appear here.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section
          className="rounded-[14px] p-5"
          style={{ backgroundColor: "#242424", border: "1px solid #323232" }}
        >
          <h2
            className="font-display text-[1.25rem] mb-3"
            style={{ color: "#F0EDE6" }}
          >
            Practice Streak
          </h2>
          {isLoading ? (
            <div className="flex items-end gap-2 mb-2 animate-pulse">
              <span className="text-[1.5rem] opacity-40">🔥</span>
              <div
                className="h-12 w-16 rounded"
                style={{ backgroundColor: "#2F2F2F" }}
              />
              <div
                className="h-4 w-28 rounded mb-1"
                style={{ backgroundColor: "#2A2A2A" }}
              />
            </div>
          ) : (
            <div className="flex items-end gap-2 mb-2">
              <span className="text-[1.5rem]">🔥</span>
              <span
                className="font-display text-[2.4rem] leading-none"
                style={{ color: "#C8A96E" }}
              >
                {streakDays}
              </span>
              <span className="pb-1 text-[0.95rem]" style={{ color: "#D4CFC7" }}>
                day{streakDays === 1 ? "" : "s"} in a row
              </span>
            </div>
          )}
          {!isLoading && streakDays === 0 && (
            <p
              style={{
                color: "#8F8A81",
                fontSize: "0.82rem",
                lineHeight: 1.55,
                marginBottom: 12,
              }}
            >
              Complete any practice today to begin your streak.
            </p>
          )}

          <div className="grid grid-cols-7 gap-1.5" style={{ marginTop: 12 }}>
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
                    ? cell.isActive
                      ? "rgba(200, 169, 110, 0.72)"
                      : "#1B1B1B"
                    : "transparent",
                  color: cell.isActive ? "#1A1A1A" : "#6E6A62",
                  border: cell.dayNumber ? "1px solid #313131" : "none",
                }}
              >
                {cell.dayNumber}
              </div>
            ))}
          </div>
        </section>

        <section
          className="rounded-[14px] p-5"
          style={{ backgroundColor: "#242424", border: "1px solid #323232" }}
        >
          <h2
            className="font-display text-[1.25rem] mb-3"
            style={{ color: "#F0EDE6" }}
          >
            Scripture Reading History
          </h2>
          {isLoading ? (
            <p
              className="animate-pulse"
              style={{ color: "#8F8A81", fontSize: "0.9rem" }}
            >
              Loading reading history…
            </p>
          ) : scriptureStats.length === 0 ? (
            <div>
              <p
                style={{
                  color: "#D4CFC7",
                  lineHeight: 1.6,
                  marginBottom: 4,
                }}
              >
                No readings yet.
              </p>
              <p
                style={{
                  color: "#8F8A81",
                  fontSize: "0.84rem",
                  lineHeight: 1.6,
                }}
              >
                Open the scripture library and let a single passage meet you
                where you are.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {scriptureStats.map((entry) => (
                <div
                  key={entry.slug}
                  className="rounded-[10px] px-3 py-2.5"
                  style={{
                    backgroundColor: "#202020",
                    border: "1px solid #2F2F2F",
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span style={{ color: "#E8D5A8", fontWeight: 600 }}>
                      {entry.title}
                    </span>
                    <span
                      style={{ color: "#C8A96E", fontSize: "0.78rem" }}
                    >
                      {entry.count}x read
                    </span>
                  </div>
                  <p
                    style={{
                      color: "#8F8A81",
                      fontSize: "0.76rem",
                      marginTop: 2,
                    }}
                  >
                    Last read: {formatDate(entry.lastRead)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section
          className="rounded-[14px] p-5"
          style={{ backgroundColor: "#242424", border: "1px solid #323232" }}
        >
          <h2
            className="font-display text-[1.25rem] mb-3"
            style={{ color: "#F0EDE6" }}
          >
            Your Journey So Far
          </h2>
          {isLoading ? (
            <div className="space-y-3 mb-4 animate-pulse">
              <div className="flex gap-2 flex-wrap">
                <div className="h-7 w-28 rounded-full" style={{ backgroundColor: "#2F2F2F" }} />
                <div className="h-7 w-40 rounded-full" style={{ backgroundColor: "#2A2A2A" }} />
              </div>
              <div className="h-16 rounded-[10px]" style={{ backgroundColor: "#202020" }} />
              <div className="flex flex-wrap gap-2">
                <div className="h-7 w-24 rounded-full" style={{ backgroundColor: "#2A2A2A" }} />
                <div className="h-7 w-32 rounded-full" style={{ backgroundColor: "#2A2A2A" }} />
                <div className="h-7 w-20 rounded-full" style={{ backgroundColor: "#2A2A2A" }} />
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                <div
                  className="px-3 py-1 rounded-full text-[0.78rem] font-semibold"
                  style={{
                    backgroundColor: "rgba(200, 169, 110, 0.16)",
                    border: "1px solid rgba(200, 169, 110, 0.35)",
                    color: "#E8D5A8",
                  }}
                >
                  {levelLabel(experienceLevel)}
                </div>
                <span style={{ color: "#A8A49C", fontSize: "0.82rem" }}>
                  {chatCount} conversation{chatCount === 1 ? "" : "s"}
                  {totalMessages > 0 &&
                    ` · ${totalMessages} message${totalMessages === 1 ? "" : "s"}`}
                  {scripturesReadCount > 0 &&
                    ` · ${scripturesReadCount} scripture read${scripturesReadCount === 1 ? "" : "s"}`}
                  {prayerCount > 0 && ` · ${prayerCount} prayer${prayerCount === 1 ? "" : "s"}`}
                </span>
                {stats?.user?.preferredTradition && (
                  <span style={{ color: "#A8A49C", fontSize: "0.82rem" }}>
                    · {stats.user.preferredTradition} tradition
                  </span>
                )}
              </div>

              <p
                className="text-[0.8rem] mb-3"
                style={{ color: "#8F8A81", lineHeight: 1.65 }}
              >
                Favorite voice in chat:{" "}
                <span style={{ color: "#D4CFC7" }}>{favoriteTeacher}</span>
                {memberSince ? (
                  <>
                    {" "}
                    · Member since{" "}
                    <span style={{ color: "#D4CFC7" }}>{formatDate(memberSince)}</span>
                  </>
                ) : null}
              </p>

              <p className="mb-3" style={{ color: "#D4CFC7", lineHeight: 1.7 }}>
                {aiSummary ?? journeySummaryFallback}
              </p>
              {isAiSummaryLoading && (
                <p
                  className="animate-pulse mb-3"
                  style={{ color: "#8F8A81", fontSize: "0.76rem" }}
                >
                  Reflecting on your journey...
                </p>
              )}

              <div>
                <p
                  style={{
                    color: "#8F8A81",
                    fontSize: "0.78rem",
                    marginBottom: 6,
                  }}
                >
                  Top themes &amp; tools
                </p>
                <div className="flex flex-wrap gap-2">
                  {topTopics.length === 0 ? (
                    <span style={{ color: "#6E6A62", fontSize: "0.82rem" }}>
                      No topics yet — chat a little more and they will emerge.
                    </span>
                  ) : (
                    topTopics.map((topic) => (
                      <span
                        key={topic}
                        className="px-2.5 py-1 rounded-full text-[0.75rem]"
                        style={{
                          backgroundColor: "#1E1E1E",
                          border: "1px solid #333333",
                          color: "#C9C3B9",
                        }}
                      >
                        {topic}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </section>

        <section
          className="rounded-[14px] p-5"
          style={{ backgroundColor: "#242424", border: "1px solid #323232" }}
        >
          <h2
            className="font-display text-[1.25rem] mb-3"
            style={{ color: "#F0EDE6" }}
          >
            Prayer History
          </h2>
          {isLoading ? (
            <p
              className="animate-pulse"
              style={{ color: "#8F8A81", fontSize: "0.9rem" }}
            >
              Loading prayer history…
            </p>
          ) : prayerStats.length === 0 ? (
            <div>
              <p
                style={{
                  color: "#D4CFC7",
                  lineHeight: 1.6,
                  marginBottom: 4,
                }}
              >
                No prayers logged yet.
              </p>
              <p
                style={{
                  color: "#8F8A81",
                  fontSize: "0.84rem",
                  lineHeight: 1.6,
                }}
              >
                Visit the Prayers page and mark a prayer as completed to begin
                tracking your practice.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {prayerStats.map((entry) => (
                <div
                  key={entry.title}
                  className="rounded-[10px] px-3 py-2.5"
                  style={{
                    backgroundColor: "#202020",
                    border: "1px solid #2F2F2F",
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span style={{ color: "#E8D5A8", fontWeight: 600 }}>
                      {entry.title}
                    </span>
                    <span
                      style={{ color: "#C8A96E", fontSize: "0.78rem" }}
                    >
                      {entry.count}x completed
                    </span>
                  </div>
                  <p
                    style={{
                      color: "#8F8A81",
                      fontSize: "0.76rem",
                      marginTop: 2,
                    }}
                  >
                    Last prayed: {formatDate(entry.lastPrayed)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section
          className="rounded-[14px] p-5"
          style={{ backgroundColor: "#242424", border: "1px solid #323232" }}
        >
          <h2
            className="font-display text-[1.25rem] mb-3"
            style={{ color: "#F0EDE6" }}
          >
            Identification History
          </h2>
          {isLoading ? (
            <p
              className="animate-pulse"
              style={{ color: "#8F8A81", fontSize: "0.9rem" }}
            >
              Loading identification history…
            </p>
          ) : identifyStats.length === 0 ? (
            <div>
              <p
                style={{
                  color: "#D4CFC7",
                  lineHeight: 1.6,
                  marginBottom: 4,
                }}
              >
                No identifications yet.
              </p>
              <p
                style={{
                  color: "#8F8A81",
                  fontSize: "0.84rem",
                  lineHeight: 1.6,
                }}
              >
                Use Identify on the home page to save figures you explore.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {identifyStats.map((entry) => (
                <div
                  key={entry.title}
                  className="rounded-[10px] px-3 py-2.5"
                  style={{
                    backgroundColor: "#202020",
                    border: "1px solid #2F2F2F",
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span style={{ color: "#E8D5A8", fontWeight: 600 }}>
                      {entry.title}
                    </span>
                    <span
                      style={{ color: "#C8A96E", fontSize: "0.78rem" }}
                    >
                      {entry.count}x identified
                    </span>
                  </div>
                  <p
                    style={{
                      color: "#8F8A81",
                      fontSize: "0.76rem",
                      marginTop: 2,
                    }}
                  >
                    Last identified: {formatDate(entry.lastIdentified)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Encouragement — floating banner at the bottom */}
      <div
        className="mt-6 text-center py-4 px-6 rounded-full mx-auto max-w-fit"
        style={{
          background: "linear-gradient(135deg, rgba(200, 169, 110, 0.12) 0%, rgba(200, 169, 110, 0.04) 100%)",
          border: "1px solid rgba(200, 169, 110, 0.2)",
        }}
      >
        <p
          className="font-display italic text-[1rem] leading-[1.6]"
          style={{ color: "#E8D5A8" }}
        >
          🪷 {ENCOURAGEMENTS[encouragementIdx]}
        </p>
      </div>
    </div>
  );
}
