import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/apiAuth";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();
  const user = await User.findById(userId).lean();
  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ user });
}

export async function PATCH(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const update: Record<string, unknown> = {
    lastActiveDate: new Date(),
  };

  if (
    typeof body.experienceLevel === "string" &&
    ["beginner", "intermediate", "advanced"].includes(body.experienceLevel)
  ) {
    update.experienceLevel = body.experienceLevel;
  }
  if (Array.isArray(body.topicsExplored)) {
    update.topicsExplored = body.topicsExplored.filter(
      (t: unknown) => typeof t === "string"
    );
  }
  if (Array.isArray(body.practicesStarted)) {
    update.practicesStarted = body.practicesStarted.filter(
      (p: unknown) => typeof p === "string"
    );
  }
  if (body.preferredTradition === null || typeof body.preferredTradition === "string") {
    update.preferredTradition = body.preferredTradition;
  }

  await connectToDatabase();
  const user = await User.findByIdAndUpdate(
    userId,
    { $set: update },
    { new: true }
  ).lean();
  return NextResponse.json({ user });
}
