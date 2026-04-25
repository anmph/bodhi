import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { getSessionUserId } from "@/lib/apiAuth";
import { connectToDatabase } from "@/lib/mongodb";
import PracticeLog from "@/models/PracticeLog";
import {
  consecutiveStreakEndingToday,
  subtractPracticeDays,
  toPracticeDayKey,
} from "@/lib/practiceStreak";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();
  // Pull the last ~180 days of practice logs; more than enough for a streak
  // + current-month heat map.
  const since = subtractPracticeDays(new Date(), 180);
  const logs = await PracticeLog.find({
    userId: new Types.ObjectId(userId),
    date: { $gte: since },
  })
    .select({ date: 1, type: 1 })
    .sort({ date: -1 })
    .lean();

  const activeDays = new Set<string>();
  const dayActivityCounts: Record<string, number> = {};
  for (const log of logs) {
    const key = toPracticeDayKey(new Date(log.date));
    activeDays.add(key);
    dayActivityCounts[key] = (dayActivityCounts[key] ?? 0) + 1;
  }

  const streakDays = consecutiveStreakEndingToday(
    logs.map((l) => new Date(l.date))
  );

  // Build a current-month grid (Mon-start) so the client can render the heat map
  // without replicating calendar math.
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = (firstDay.getDay() + 6) % 7;

  const cells: Array<{
    key: string;
    dayNumber: number | null;
    isActive: boolean;
    activityCount: number;
  }> = [];
  for (let i = 0; i < leadingBlanks; i += 1) {
    cells.push({ key: `blank-${i}`, dayNumber: null, isActive: false, activityCount: 0 });
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    const dayKey = toPracticeDayKey(new Date(year, month, day));
    cells.push({
      key: dayKey,
      dayNumber: day,
      isActive: activeDays.has(dayKey),
      activityCount: dayActivityCounts[dayKey] ?? 0,
    });
  }

  return NextResponse.json({
    streakDays,
    totalActiveDays: activeDays.size,
    monthGrid: cells,
  });
}
