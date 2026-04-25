import { MongoClient, type MongoClientOptions } from "mongodb";
import { ensureDnsBootstrapped } from "./dnsBootstrap";

ensureDnsBootstrapped();

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.warn(
    "[mongoClient] Missing MONGODB_URI — MongoDB features will be unavailable."
  );
}

const options: MongoClientOptions = {};

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function buildClientPromise(): Promise<MongoClient> {
  if (!uri) return Promise.reject(new Error("MONGODB_URI not set"));
  const client = new MongoClient(uri as string, options);
  const promise = client.connect();
  promise.catch((err) => {
    console.error("[mongoClient] MongoDB connection failed:", err?.message ?? err);
    if (process.env.NODE_ENV === "development" && global._mongoClientPromise === promise) {
      global._mongoClientPromise = undefined;
    }
  });
  return promise;
}

/** One shared promise per process (required by @next-auth/mongodb-adapter — must be a real Promise, not a thenable proxy). */
function getClientPromise(): Promise<MongoClient> {
  if (!global._mongoClientPromise) {
    global._mongoClientPromise = buildClientPromise();
  }
  return global._mongoClientPromise;
}

/**
 * Returns a live MongoClient. Clears the cached promise after failure so the
 * next caller can retry (useful in dev when Atlas allowlist or URI changes).
 */
export async function getMongoClient(): Promise<MongoClient> {
  try {
    return await getClientPromise();
  } catch (err) {
    global._mongoClientPromise = undefined;
    throw err;
  }
}

const clientPromise: Promise<MongoClient> = getClientPromise();

export default clientPromise;
