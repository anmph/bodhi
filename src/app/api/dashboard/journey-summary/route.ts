import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { Types } from "mongoose";
import { getSessionUserId } from "@/lib/apiAuth";
import { connectToDatabase } from "@/lib/mongodb";
import ChatSession from "@/models/ChatSession";
import PracticeLog from "@/models/PracticeLog";
import User from "@/models/User";
import { rankedTopicAndToolLabels } from "@/lib/personalization";
import { consecutiveStreakEndingToday, subtractPracticeDays } from "@/lib/practiceStreak";

const TEACHER_LABEL: Record<string, string> = {
  buddha: "Siddhartha Gautama (Buddha)",
  avalokiteshvara: "Avalokiteshvara",
  bodhidharma: "Bodhidharma",
};

const SYSTEM = `You are Bodhi, a warm Buddhist practice companion. Based on this user's practice data, write a personalized 4-5 sentence reflection. Include: (1) acknowledge what they've been exploring, (2) identify a pattern in their interests, (3) give encouraging feedback on their journey, (4) suggest one specific thing they could explore next. Be warm, specific to their data, not generic. No bullet points — flowing prose only.`;

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

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured." },
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
      charAgg,
      scriptureCount,
      prayerCount,
      identifyCount,
      meditationCount,
      streakLogs,
      chatSessions,
    ] = await Promise.all([
      User.findById(userObjectId).lean(),
      ChatSession.countDocuments({ userId: userObjectId }),
      ChatSession.aggregate<{ _id: string | null; n: number }>([
        { $match: { userId: userObjectId, character: { $nin: [null, ""] } } },
        { $group: { _id: "$character", n: { $sum: 1 } } },
        { $sort: { n: -1 } },
        { $limit: 1 },
      ]),
      PracticeLog.countDocuments({ userId: userObjectId, type: "scripture" }),
      PracticeLog.countDocuments({ userId: userObjectId, type: "prayer" }),
      PracticeLog.countDocuments({ userId: userObjectId, type: "identify" }),
      PracticeLog.countDocuments({ userId: userObjectId, type: "meditation" }),
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

    const topChar = charAgg[0]?._id;
    const favoriteTeacher =
      topChar && typeof topChar === "string"
        ? TEACHER_LABEL[topChar] ?? topChar
        : "Not yet chosen";

    const chatDetailsForTools = streakLogs
      .filter((l) => l.type === "chat")
      .map((l) => l.detail ?? "");

    const topTopics = rankedTopicAndToolLabels(chatSessions, chatDetailsForTools, 3);

    const currentStreak = consecutiveStreakEndingToday(
      streakLogs.map((l) => new Date(l.date))
    );

    const memberSince = user?.createdAt
      ? new Date(user.createdAt).toISOString()
      : "";

    const anthropic = new Anthropic({ apiKey: key });
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 400,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: JSON.stringify({
            totalConversations,
            topTopics,
            scripturesRead: scriptureCount,
            prayerCount,
            identifyCount,
            meditationCount,
            streak: currentStreak,
            favoriteTeacher,
            memberSince,
          }),
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const summary = textBlock && textBlock.type === "text" ? textBlock.text.trim() : "";

    return NextResponse.json({ summary });
  } catch (err) {
    console.error("[api/dashboard/journey-summary] error:", err);
    return NextResponse.json(
      {
        error: "Could not generate journey summary.",
        detail: process.env.NODE_ENV === "development" ? (err as Error)?.message : undefined,
      },
      { status: 503 }
    );
  }
}
