/**
 * Database diagnostic endpoint.
 * 
 * Returns connection status and document counts for all collections.
 * Also returns the current user's session info for debugging auth issues.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";
import ChatSession from "@/models/ChatSession";
import ScriptureReading from "@/models/ScriptureReading";
import PracticeLog from "@/models/PracticeLog";
import { getMongoClient } from "@/lib/mongoClient";

export const dynamic = "force-dynamic";

export async function GET() {
  const report: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
  };

  // 1. Get the current session
  try {
    const session = await getServerSession(authOptions);
    report.session = session
      ? {
          user: {
            id: session.user?.id ?? null,
            email: session.user?.email ?? null,
            name: session.user?.name ?? null,
          },
        }
      : null;
    report.isAuthenticated = !!session;
    report.hasUserId = !!session?.user?.id;
  } catch (err) {
    report.sessionError = (err as Error).message;
  }

  // 2. Check Mongoose connection
  try {
    await connectToDatabase();
    report.mongooseConnected = true;
  } catch (err) {
    report.mongooseConnected = false;
    report.mongooseError = (err as Error).message;
  }

  // 3. Check MongoClient connection (used by NextAuth adapter)
  try {
    const client = await getMongoClient();
    const db = client.db("bodhi");
    
    // List all collections
    const collections = await db.listCollections().toArray();
    report.collections = collections.map((c) => c.name);

    // Count documents in each relevant collection
    const counts: Record<string, number> = {};
    
    // NextAuth adapter collections
    try {
      counts.users_adapter = await db.collection("users").countDocuments();
    } catch { counts.users_adapter = -1; }
    
    try {
      counts.accounts = await db.collection("accounts").countDocuments();
    } catch { counts.accounts = -1; }
    
    try {
      counts.sessions_adapter = await db.collection("sessions").countDocuments();
    } catch { counts.sessions_adapter = -1; }

    // App collections (Mongoose)
    try {
      counts.users_mongoose = await User.countDocuments();
    } catch { counts.users_mongoose = -1; }
    
    try {
      counts.chatSessions = await ChatSession.countDocuments();
    } catch { counts.chatSessions = -1; }
    
    try {
      counts.scriptureReadings = await ScriptureReading.countDocuments();
    } catch { counts.scriptureReadings = -1; }
    
    try {
      counts.practiceLogs = await PracticeLog.countDocuments();
    } catch { counts.practiceLogs = -1; }

    report.documentCounts = counts;
    report.mongoClientConnected = true;
  } catch (err) {
    report.mongoClientConnected = false;
    report.mongoClientError = (err as Error).message;
  }

  // 4. If user is authenticated, check if we can find them in the database
  const session = report.session as { user?: { id?: string; email?: string } } | null;
  if (session?.user?.email) {
    try {
      // Check in Mongoose User collection
      const mongooseUser = await User.findOne({ email: session.user.email }).lean();
      report.mongooseUser = mongooseUser
        ? {
            _id: String(mongooseUser._id),
            email: mongooseUser.email,
            name: mongooseUser.name,
            experienceLevel: mongooseUser.experienceLevel,
            createdAt: mongooseUser.createdAt,
          }
        : null;

      // Check in NextAuth adapter users collection
      const client = await getMongoClient();
      const db = client.db("bodhi");
      const adapterUser = await db.collection("users").findOne({ email: session.user.email });
      report.adapterUser = adapterUser
        ? {
            _id: String(adapterUser._id),
            email: adapterUser.email,
            name: adapterUser.name,
          }
        : null;

      // Check if IDs match
      if (report.mongooseUser && report.adapterUser) {
        const mongooseId = (report.mongooseUser as { _id: string })._id;
        const adapterId = (report.adapterUser as { _id: string })._id;
        report.userIdMatch = mongooseId === adapterId;
        report.sessionIdMatchesMongoose = session.user.id === mongooseId;
        report.sessionIdMatchesAdapter = session.user.id === adapterId;
      }

      // If user has an ID, check their practice data
      if (session.user.id) {
        try {
          const { Types } = await import("mongoose");
          const userId = new Types.ObjectId(session.user.id);
          
          const [chatCount, readingCount, practiceCount] = await Promise.all([
            ChatSession.countDocuments({ userId }),
            ScriptureReading.countDocuments({ userId }),
            PracticeLog.countDocuments({ userId }),
          ]);
          
          report.userDataCounts = {
            chatSessions: chatCount,
            scriptureReadings: readingCount,
            practiceLogs: practiceCount,
          };
        } catch (err) {
          report.userDataError = (err as Error).message;
        }
      }
    } catch (err) {
      report.userLookupError = (err as Error).message;
    }
  }

  return NextResponse.json(report, {
    headers: { "Cache-Control": "no-store" },
  });
}
