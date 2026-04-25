import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { getSessionUserId } from "@/lib/apiAuth";
import { connectToDatabase } from "@/lib/mongodb";
import ChatSession from "@/models/ChatSession";
import {
  buildSentimentTimeline,
  topInsightTermsFromSessions,
  type LeanSessionForInsights,
} from "@/lib/chatInsights";

const COMMUNITY_SAMPLE = 400;
const PERSONAL_SAMPLE = 200;
const MOOD_QUERY_LIMIT = 600;

function asLeanSessions(docs: unknown[]): LeanSessionForInsights[] {
  return docs as LeanSessionForInsights[];
}

export async function GET() {
  const userId = await getSessionUserId();

  if (!process.env.MONGODB_URI) {
    return NextResponse.json({
      ok: false,
      dbConfigured: false,
      communityTerms: [],
      personalTerms: null,
      sentimentTimeline: [],
      unclassifiedSessionCount: 0,
      classifiedSessionCount: 0,
      communitySessionSampleSize: 0,
      personalSessionSampleSize: 0,
      communityExcludesYou: false,
      canClassify: Boolean(process.env.ANTHROPIC_API_KEY),
      signedIn: Boolean(userId),
    });
  }

  try {
    await connectToDatabase();

    const communityFilter =
      userId && Types.ObjectId.isValid(userId)
        ? { userId: { $ne: new Types.ObjectId(userId) } }
        : {};

    const [communitySessions, personalSessions, moodSessions, unclassifiedCount] =
      await Promise.all([
        ChatSession.find(communityFilter)
          .sort({ updatedAt: -1 })
          .limit(COMMUNITY_SAMPLE)
          .select("messages userId updatedAt conversationMood")
          .lean(),
        userId
          ? ChatSession.find({ userId: new Types.ObjectId(userId) })
              .sort({ updatedAt: -1 })
              .limit(PERSONAL_SAMPLE)
              .select("messages userId updatedAt conversationMood")
              .lean()
          : Promise.resolve([]),
        ChatSession.find({
          conversationMood: { $in: ["positive", "curious", "struggling"] },
        })
          .sort({ updatedAt: -1 })
          .limit(MOOD_QUERY_LIMIT)
          .select("messages userId updatedAt conversationMood")
          .lean(),
        ChatSession.countDocuments({
          conversationMood: { $nin: ["positive", "curious", "struggling"] },
          messages: {
            $elemMatch: {
              role: "user",
              content: { $exists: true, $nin: ["", null] },
            },
          },
        }),
      ]);

    const communityLean = asLeanSessions(communitySessions);
    const personalLean = asLeanSessions(personalSessions);
    const moodLean = asLeanSessions(moodSessions);

    const communityExcludesYou = Boolean(userId && Types.ObjectId.isValid(userId));

    const communityTerms = topInsightTermsFromSessions(communityLean, {
      limit: 10,
    });
    const personalTerms = userId
      ? topInsightTermsFromSessions(personalLean, {
          limit: 10,
          userIdOnly: userId,
        })
      : null;

    const sentimentTimeline = buildSentimentTimeline(moodLean);
    const classifiedSessionCount = moodLean.filter((s) =>
      ["positive", "curious", "struggling"].includes(String(s.conversationMood))
    ).length;

    return NextResponse.json({
      ok: true,
      dbConfigured: true,
      communityTerms,
      personalTerms,
      sentimentTimeline,
      unclassifiedSessionCount: unclassifiedCount,
      classifiedSessionCount,
      communitySessionSampleSize: communityLean.length,
      personalSessionSampleSize: userId ? personalLean.length : 0,
      communityExcludesYou,
      canClassify: Boolean(process.env.ANTHROPIC_API_KEY),
      signedIn: Boolean(userId),
    });
  } catch (err) {
    console.error("[api/insights/bodhi-chat] GET error:", err);
    return NextResponse.json(
      {
        ok: false,
        dbConfigured: true,
        communityTerms: [],
        personalTerms: null,
        sentimentTimeline: [],
        unclassifiedSessionCount: 0,
        classifiedSessionCount: 0,
        communitySessionSampleSize: 0,
        personalSessionSampleSize: 0,
        communityExcludesYou: false,
        canClassify: Boolean(process.env.ANTHROPIC_API_KEY),
        signedIn: Boolean(userId),
        error: "Failed to load Bodhi chat insights",
      },
      { status: 500 }
    );
  }
}
