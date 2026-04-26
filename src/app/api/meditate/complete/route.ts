import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { getSessionUserId } from "@/lib/apiAuth";
import { connectToDatabase } from "@/lib/mongodb";
import PracticeLog from "@/models/PracticeLog";

export async function POST(request: Request) {
  let userId: string | null = null;
  try {
    userId = await getSessionUserId();
  } catch (err) {
    console.error("[api/meditate/complete] auth error:", err);
  }

  if (!userId) {
    return NextResponse.json(
      { error: "Not signed in or session has no user id. Try signing out and back in." },
      { status: 401 }
    );
  }

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const duration = body.duration as number | undefined;
  const type = body.type as string | undefined;

  if (!Number.isFinite(duration) || Number(duration) <= 0 || !type || typeof type !== "string") {
    return NextResponse.json(
      { error: "duration (positive number) and type (string) are required" },
      { status: 400 }
    );
  }

  try {
    console.log("[api/meditate/complete] userId:", userId, "duration:", duration, "type:", type);
    await connectToDatabase();
    console.log("[api/meditate/complete] DB connected, creating PracticeLog...");
    await PracticeLog.create({
      userId: new Types.ObjectId(userId),
      type: "meditation",
      detail: `${type} (${duration} min)`,
      date: new Date(),
    });
    console.log("[api/meditate/complete] PracticeLog created successfully");

    return NextResponse.json({ success: true });
  } catch (err) {
    const errMsg = (err as Error)?.message ?? String(err);
    console.error("[api/meditate/complete] FULL ERROR:", err);
    return NextResponse.json(
      {
        error: `Could not save meditation session: ${errMsg}`,
      },
      { status: 500 }
    );
  }
}
