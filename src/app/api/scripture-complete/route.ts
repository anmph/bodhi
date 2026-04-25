import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { getSessionUserId } from "@/lib/apiAuth";
import { connectToDatabase } from "@/lib/mongodb";
import ScriptureReading from "@/models/ScriptureReading";
import PracticeLog from "@/models/PracticeLog";

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { scriptureSlug, scriptureTitle, readingTimeSeconds } = body as {
    scriptureSlug?: string;
    scriptureTitle?: string;
    readingTimeSeconds?: number;
  };

  if (!scriptureSlug || !scriptureTitle) {
    return NextResponse.json(
      { error: "scriptureSlug and scriptureTitle are required" },
      { status: 400 }
    );
  }

  await connectToDatabase();
  const userObjectId = new Types.ObjectId(userId);
  const now = new Date();

  const reading = await ScriptureReading.create({
    userId: userObjectId,
    scriptureSlug,
    scriptureTitle,
    completedAt: now,
    readingTimeSeconds: Math.max(0, Math.round(Number(readingTimeSeconds ?? 0))),
  });

  try {
    await PracticeLog.create({
      userId: userObjectId,
      type: "scripture",
      detail: scriptureTitle,
      date: now,
    });
  } catch {
    // log-only failure; reading record already persisted
  }

  return NextResponse.json({ reading: reading.toObject() });
}
