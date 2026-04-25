import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { getSessionUserId } from "@/lib/apiAuth";
import { connectToDatabase } from "@/lib/mongodb";
import PracticeLog from "@/models/PracticeLog";

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { prayerId, prayerTitle } = body as {
    prayerId?: string;
    prayerTitle?: string;
  };
  if (!prayerTitle) {
    return NextResponse.json({ error: "prayerTitle is required" }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const log = await PracticeLog.create({
      userId: new Types.ObjectId(userId),
      type: "prayer",
      detail: prayerId ? `${prayerTitle} (${prayerId})` : prayerTitle,
      date: new Date(),
    });
    return NextResponse.json({ log: log.toObject() });
  } catch (err) {
    console.error("[api/prayer-complete]", err);
    return NextResponse.json(
      {
        error: "Could not save prayer completion.",
        detail: process.env.NODE_ENV === "development" ? (err as Error)?.message : undefined,
      },
      { status: 500 }
    );
  }
}
