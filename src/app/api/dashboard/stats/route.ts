import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { getSessionUserId } from "@/lib/apiAuth";
import { connectToDatabase } from "@/lib/mongodb";
import ChatSession from "@/models/ChatSession";
import PracticeLog from "@/models/PracticeLog";
import User from "@/models/User";
import {
  deriveProfileFromSessions,
  rankedTopicAndToolLabels,
} from "@/lib/personalization";
import { consecutiveStreakEndingToday, subtractPracticeDays } from "@/lib/practiceStreak";

const TEACHER_LABEL: Record<string, string> = {
  buddha: "Siddhartha Gautama (Buddha)",
  avalokiteshvara: "Avalokiteshvara",
  bodhidharma: "Bodhidharma",
};

const DEFAULT_STATS = {
  totalConversations: 0,
  totalMessages: 0,
  favoriteTeacher: "Not yet chosen",
  topTopics: [] as string[],
  scripturesRead: 0,
  prayerCount: 0,
  identifyCount: 0,
  meditationCount: 0,
  currentStreak: 0,
  memberSince: "",
  user: null as {
    name?: string;
    email?: string;
    image?: string | null;
    experienceLevel?: string;
    preferredTradition?: string | null;
    lastActiveDate?: Date;
    createdAt?: Date;
  } | null,
  prayerSummary: [] as Array<{ title: string; count: number; lastPrayed: string }>,
  identifySummary: [] as Array<{ title: string; count: number; lastIdentified: string }>,
  meditationSummary: [] as Array<{ title: string; count: number; lastSession: string }>,
  practicesStarted: [] as string[],
};

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json(
      { error: "Not signed in or session has no user id. Try signing out and back in." },
      { status: 401 }
    );
  }

  if (!process.env.MONGODB_URI) {
    return NextResponse.json(
      { error: "Server is not configured with MONGODB_URI." },
      { status: 503 }
    );
  }

  try {
    await connectToDatabase();
    const userObjectId = new Types.ObjectId(userId);
    const since = subtractPracticeDays(new Date(), 180);

    const [
      user,
      totalConversations,
      messageAgg,
      charAgg,
      scriptureCount,
      prayerCount,
      prayerLogs,
      identifyCount,
      identifyLogs,
      meditationCount,
      meditationLogs,
      streakLogs,
      chatSessions,
    ] = await Promise.all([
      User.findById(userObjectId).lean(),
      ChatSession.countDocuments({ userId: userObjectId }),
      ChatSession.aggregate<{ total: number }>([
        { $match: { userId: userObjectId } },
        { $group: { _id: null, total: { $sum: { $size: "$messages" } } } },
      ]),
      ChatSession.aggregate<{ _id: string | null; n: number }>([
        { $match: { userId: userObjectId, character: { $nin: [null, ""] } } },
        { $group: { _id: "$character", n: { $sum: 1 } } },
        { $sort: { n: -1 } },
        { $limit: 1 },
      ]),
      PracticeLog.countDocuments({ userId: userObjectId, type: "scripture" }),
      PracticeLog.countDocuments({ userId: userObjectId, type: "prayer" }),
      PracticeLog.find({ userId: userObjectId, type: "prayer" })
        .sort({ date: -1 })
        .limit(200)
        .lean(),
      PracticeLog.countDocuments({ userId: userObjectId, type: "identify" }),
      PracticeLog.find({ userId: userObjectId, type: "identify" })
        .sort({ date: -1 })
        .limit(200)
        .lean(),
      PracticeLog.countDocuments({ userId: userObjectId, type: "meditation" }),
      PracticeLog.find({ userId: userObjectId, type: "meditation" })
        .sort({ date: -1 })
        .limit(200)
        .lean(),
      PracticeLog.find({
        userId: userObjectId,
        date: { $gte: since },
      })
        .select({ date: 1, type: 1, detail: 1 })
        .sort({ date: -1 })
        .lean(),
      ChatSession.find({ userId: userObjectId })
        .sort({ updatedAt: -1 })
        .limit(200)
        .select("messages character")
        .lean(),
    ]);

    const totalMessages = messageAgg[0]?.total ?? 0;
    const topChar = charAgg[0]?._id;
    const favoriteTeacher =
      topChar && typeof topChar === "string"
        ? TEACHER_LABEL[topChar] ?? topChar
        : DEFAULT_STATS.favoriteTeacher;

    const chatDetailsForTools = streakLogs
      .filter((l) => l.type === "chat")
      .map((l) => l.detail ?? "");

    const topTopics = rankedTopicAndToolLabels(chatSessions, chatDetailsForTools, 3);

    const currentStreak = consecutiveStreakEndingToday(
      streakLogs.map((l) => new Date(l.date))
    );

    const derived = deriveProfileFromSessions(chatSessions);

    const prayerGrouped = new Map<
      string,
      { title: string; count: number; lastPrayed: string }
    >();
    for (const log of prayerLogs) {
      const title = (log.detail ?? "").replace(/\s*\([^)]+\)\s*$/, "").trim() || "Prayer";
      const existing = prayerGrouped.get(title);
      const prayedAt = new Date(log.date).toISOString();
      if (!existing) {
        prayerGrouped.set(title, { title, count: 1, lastPrayed: prayedAt });
      } else {
        existing.count += 1;
        if (new Date(prayedAt).getTime() > new Date(existing.lastPrayed).getTime()) {
          existing.lastPrayed = prayedAt;
        }
      }
    }
    const prayerSummary = Array.from(prayerGrouped.values()).sort(
      (a, b) => new Date(b.lastPrayed).getTime() - new Date(a.lastPrayed).getTime()
    );

    const identifyGrouped = new Map<
      string,
      { title: string; count: number; lastIdentified: string }
    >();
    for (const log of identifyLogs) {
      const title = (log.detail ?? "").replace(/\s*\([^)]+\)\s*$/, "").trim() || "Figure";
      const existing = identifyGrouped.get(title);
      const identifiedAt = new Date(log.date).toISOString();
      if (!existing) {
        identifyGrouped.set(title, { title, count: 1, lastIdentified: identifiedAt });
      } else {
        existing.count += 1;
        if (new Date(identifiedAt).getTime() > new Date(existing.lastIdentified).getTime()) {
          existing.lastIdentified = identifiedAt;
        }
      }
    }
    const identifySummary = Array.from(identifyGrouped.values()).sort(
      (a, b) =>
        new Date(b.lastIdentified).getTime() - new Date(a.lastIdentified).getTime()
    );

    const meditationGrouped = new Map<
      string,
      { title: string; count: number; lastSession: string }
    >();
    for (const log of meditationLogs) {
      const title = (log.detail ?? "").replace(/\s*\([^)]+\)\s*$/, "").trim() || "Meditation";
      const existing = meditationGrouped.get(title);
      const sessionAt = new Date(log.date).toISOString();
      if (!existing) {
        meditationGrouped.set(title, { title, count: 1, lastSession: sessionAt });
      } else {
        existing.count += 1;
        if (new Date(sessionAt).getTime() > new Date(existing.lastSession).getTime()) {
          existing.lastSession = sessionAt;
        }
      }
    }
    const meditationSummary = Array.from(meditationGrouped.values()).sort(
      (a, b) =>
        new Date(b.lastSession).getTime() - new Date(a.lastSession).getTime()
    );

    const memberSince = user?.createdAt
      ? new Date(user.createdAt).toISOString()
      : "";

    const practicesStarted =
      derived.practicesStarted.length > 0
        ? derived.practicesStarted
        : user?.practicesStarted ?? [];

    return NextResponse.json({
      totalConversations,
      totalMessages,
      favoriteTeacher,
      topTopics,
      scripturesRead: scriptureCount,
      prayerCount,
      identifyCount,
      meditationCount,
      currentStreak,
      memberSince,
      user: user
        ? {
            name: user.name,
            email: user.email,
            image: user.image,
            experienceLevel: user.experienceLevel,
            preferredTradition: user.preferredTradition,
            lastActiveDate: user.lastActiveDate,
            createdAt: user.createdAt,
          }
        : null,
      prayerSummary,
      identifySummary,
      meditationSummary,
      practicesStarted,
    });
  } catch (err) {
    console.error("[api/dashboard/stats] error:", err);
    return NextResponse.json(
      {
        error: "Could not load practice data from the database.",
        detail: process.env.NODE_ENV === "development" ? (err as Error)?.message : undefined,
      },
      { status: 503 }
    );
  }
}
