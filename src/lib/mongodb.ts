import mongoose, { Mongoose } from "mongoose";
import { ensureDnsBootstrapped } from "./dnsBootstrap";

ensureDnsBootstrapped();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.warn(
    "[mongodb] Missing MONGODB_URI — Mongoose features will be unavailable."
  );
}

// Cache the connection across hot-reloads in development to avoid
// exhausting the Atlas connection pool.
type MongooseCache = {
  conn: Mongoose | null;
  promise: Promise<Mongoose> | null;
};

declare global {
  // eslint-disable-next-line no-var
  var _mongooseCache: MongooseCache | undefined;
}

const cache: MongooseCache =
  global._mongooseCache ?? { conn: null, promise: null };

if (!global._mongooseCache) {
  global._mongooseCache = cache;
}

export async function connectToDatabase(): Promise<Mongoose> {
  if (cache.conn) {
    return cache.conn;
  }

  if (!cache.promise) {
    if (!MONGODB_URI) return Promise.reject(new Error("MONGODB_URI not set")) as Promise<Mongoose>;
    cache.promise = mongoose
      .connect(MONGODB_URI as string, {
        bufferCommands: false,
        serverSelectionTimeoutMS: 10_000,
      });
    // Attach a noop catch so connection failures do not surface as
    // unhandled rejections that crash the dev server.
    cache.promise.catch((err) => {
      console.error(
        "[mongodb] Mongoose connection failed:",
        err?.message ?? err
      );
    });
  }

  try {
    cache.conn = await cache.promise;
  } catch (err) {
    cache.promise = null;
    throw err;
  }

  return cache.conn;
}

export default connectToDatabase;
