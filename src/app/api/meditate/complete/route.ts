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
  const { duration, type } = body as {
    duration?: number;
    type?: string;
  };

  if (!Number.isFinite(duration) || Number(duration) <= 0 || !type || typeof type !== "string") {
    return NextResponse.json({ error: "duration and type are required" }, { status: 400 });
  }

  try {
    await connectToDatabase();
    await PracticeLog.create({
      userId: new Types.ObjectId(userId),
      type: "meditation",
      detail: type,
      date: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api/meditate/complete]", err);
    return NextResponse.json(
      {
        error: "Could not save meditation session.",
        detail: process.env.NODE_ENV === "development" ? (err as Error)?.message : undefined,
      },
      { status: 500 }
    );
  }
}
