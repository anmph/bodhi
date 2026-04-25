import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { getSessionUserId } from "@/lib/apiAuth";
import { connectToDatabase } from "@/lib/mongodb";
import ScriptureReading from "@/models/ScriptureReading";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();
  const readings = await ScriptureReading.find({
    userId: new Types.ObjectId(userId),
  })
    .sort({ completedAt: -1 })
    .limit(200)
    .lean();

  // Roll up reads per scripture for the history section.
  const grouped = new Map<
    string,
    { title: string; slug: string; count: number; lastRead: string }
  >();
  for (const reading of readings) {
    const existing = grouped.get(reading.scriptureSlug);
    const completedAt = new Date(reading.completedAt).toISOString();
    if (!existing) {
      grouped.set(reading.scriptureSlug, {
        title: reading.scriptureTitle,
        slug: reading.scriptureSlug,
        count: 1,
        lastRead: completedAt,
      });
    } else {
      existing.count += 1;
      if (new Date(completedAt).getTime() > new Date(existing.lastRead).getTime()) {
        existing.lastRead = completedAt;
      }
    }
  }

  const summary = Array.from(grouped.values()).sort(
    (a, b) => new Date(b.lastRead).getTime() - new Date(a.lastRead).getTime()
  );

  return NextResponse.json({
    totalReads: readings.length,
    summary,
    readings,
  });
}
