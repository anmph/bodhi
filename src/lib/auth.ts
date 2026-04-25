import type { NextAuthOptions } from "next-auth";
import { MongoDBAdapter } from "@next-auth/mongodb-adapter";
import GoogleProvider from "next-auth/providers/google";
import mongoClientPromise from "./mongoClient";
import { isLikelyMongoObjectId } from "./mongoId";

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const nextAuthSecret = process.env.NEXTAUTH_SECRET;

if (!googleClientId || !googleClientSecret) {
  console.warn(
    "[auth] Missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET. Google sign-in will fail until these are set."
  );
}
if (!nextAuthSecret) {
  console.warn("[auth] Missing NEXTAUTH_SECRET. Set it in .env.local for production-grade JWT signing.");
}

// Prefer ESM imports here: `require()` in this module can break App Router’s
// server bundle (webpack) and surface as TypeError: Cannot read properties of
// undefined (reading 'call') on /api/auth/[...nextauth].
let mongoAdapter: NextAuthOptions["adapter"] | undefined;
try {
  mongoAdapter = MongoDBAdapter(mongoClientPromise, { databaseName: "bodhi" });
  console.log("[auth] MongoDBAdapter loaded successfully.");
} catch (err) {
  console.warn(
    "[auth] MongoDBAdapter could not load — running without persistence:",
    (err as Error)?.message
  );
}

export const authOptions: NextAuthOptions = {
  ...(mongoAdapter ? { adapter: mongoAdapter } : {}),
  secret: nextAuthSecret,
  providers: [
    GoogleProvider({
      clientId: googleClientId ?? "",
      clientSecret: googleClientSecret ?? "",
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user && "id" in user && user.id) {
        token.userId = String(user.id);
      } else if (!token.userId && typeof token.sub === "string" && isLikelyMongoObjectId(token.sub)) {
        token.userId = token.sub;
      } else if (!token.userId && token.email) {
        try {
          const { connectToDatabase } = await import("./mongodb");
          const User = (await import("@/models/User")).default;
          await connectToDatabase();
          const esc = token.email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const found = await User.findOne({
            email: { $regex: new RegExp(`^${esc}$`, "i") },
          })
            .select("_id")
            .lean();
          if (found?._id) token.userId = String(found._id);
        } catch {
          // DB unavailable — session works, just no userId
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (!session.user) return session;

      let id: string | undefined;
      if (isLikelyMongoObjectId(token.userId)) {
        id = token.userId;
      } else if (isLikelyMongoObjectId(token.sub)) {
        id = token.sub;
      } else {
        const email = session.user.email ?? token.email;
        if (typeof email === "string" && email.trim()) {
          try {
            const { connectToDatabase } = await import("./mongodb");
            const User = (await import("@/models/User")).default;
            await connectToDatabase();
            const esc = email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const found = await User.findOne({
              email: { $regex: new RegExp(`^${esc}$`, "i") },
            })
              .select("_id")
              .lean();
            if (found?._id) id = String(found._id);
          } catch {
            /* DB unavailable */
          }
        }
      }

      session.user.id = id;
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      if (!user?.email) return;
      try {
        const { connectToDatabase } = await import("./mongodb");
        const User = (await import("@/models/User")).default;
        await connectToDatabase();
        await User.updateOne(
          { email: user.email },
          {
            $set: {
              name: user.name ?? "",
              image: user.image ?? "",
            },
            $setOnInsert: {
              experienceLevel: "beginner",
              topicsExplored: [],
              practicesStarted: [],
              preferredTradition: null,
              createdAt: new Date(),
              lastActiveDate: new Date(),
            },
          },
          { upsert: true }
        );
      } catch (err) {
        console.error("[auth.createUser] failed to seed extended user profile", err);
      }
    },
    async signIn({ user }) {
      if (!user?.email) return;
      try {
        const { connectToDatabase } = await import("./mongodb");
        const User = (await import("@/models/User")).default;
        await connectToDatabase();
        await User.updateOne(
          { email: user.email },
          { $set: { lastActiveDate: new Date() } }
        );
      } catch (err) {
        console.error("[auth.signIn] failed to bump lastActiveDate", err);
      }
    },
  },
  pages: {
    signIn: "/",
  },
  debug: process.env.NODE_ENV === "development",
};
