import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { getSessionUserId } from "@/lib/apiAuth";
import { connectToDatabase } from "@/lib/mongodb";
import ChatSession from "@/models/ChatSession";

// Returns up to 20 of the user's most recent chat sessions, including messages
// so the chat history drawer can load a past conversation in one click.
export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();
  const sessions = await ChatSession.find({
    userId: new Types.ObjectId(userId),
  })
    .sort({ updatedAt: -1 })
    .limit(20)
    .lean();

  return NextResponse.json({ sessions });
}
