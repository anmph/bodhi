import { cookies } from "next/headers";
import { getToken } from "next-auth/jwt";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { isLikelyMongoObjectId } from "./mongoId";

function nextAuthSecret(): string | undefined {
  return (
    (typeof authOptions.secret === "string" ? authOptions.secret : undefined) ??
    process.env.NEXTAUTH_SECRET ??
    process.env.AUTH_SECRET
  );
}

/**
 * Resolve Mongo `users._id` from the encrypted NextAuth JWT cookie.
 * More reliable than `getServerSession` alone in some App Router Route Handler cases.
 */
async function resolveUserIdFromJwtCookie(): Promise<string | null> {
  const secret = nextAuthSecret();
  if (!secret) return null;

  const cookieStore = cookies();
  const all = cookieStore.getAll();
  if (all.length === 0) return null;

  const cookieObj = Object.fromEntries(all.map((c) => [c.name, c.value]));
  const cookieHeader = all.map((c) => `${c.name}=${c.value}`).join("; ");

  let token: Record<string, unknown> | null = null;
  try {
    // getToken accepts a minimal req shape at runtime; NextAuth's types are Pages Router–centric.
    token = (await getToken({
      req: {
        headers: { cookie: cookieHeader },
        cookies: cookieObj,
      } as Parameters<typeof getToken>[0]["req"],
      secret,
    })) as Record<string, unknown> | null;
  } catch {
    return null;
  }

  if (!token) return null;

  if (isLikelyMongoObjectId(token.userId)) return token.userId as string;
  if (isLikelyMongoObjectId(token.sub)) return token.sub as string;

  const email = typeof token.email === "string" ? token.email.trim() : "";
  if (!email) return null;

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
    if (found?._id) return String(found._id);
  } catch {
    /* DB unavailable */
  }

  return null;
}

/** MongoDB `users._id` as string — rejects missing/invalid ids so APIs don’t throw or return misleading empty aggregates. */
export async function getSessionUserId(): Promise<string | null> {
  const fromCookie = await resolveUserIdFromJwtCookie();
  if (fromCookie) return fromCookie;

  const session = await getServerSession(authOptions);
  const id = session?.user?.id;
  return isLikelyMongoObjectId(id) ? id : null;
}
