import { NextResponse } from "next/server";
import type { Types } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import Prayer from "@/models/Prayer";

const MAX_LIST = 200;
const MAX_NAME_LEN = 120;

type LeanPrayer = {
  _id: Types.ObjectId;
  text: string;
  name: string;
  createdAt: Date;
};

function serializePrayer(p: LeanPrayer | { _id: Types.ObjectId; text: string; name: string; createdAt: Date }) {
  return {
    id: p._id.toHexString(),
    text: p.text,
    name: p.name || "Anonymous",
    createdAt: new Date(p.createdAt).toISOString(),
  };
}

export async function GET() {
  if (!process.env.MONGODB_URI) {
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 503 }
    );
  }

  try {
    await connectToDatabase();
    const docs = await Prayer.find({})
      .sort({ createdAt: -1 })
      .limit(MAX_LIST)
      .select("text name createdAt")
      .lean<LeanPrayer[]>();

    return NextResponse.json(docs.map(serializePrayer));
  } catch (err) {
    console.error("[api/prayers] GET error:", err);
    return NextResponse.json(
      { error: "Failed to load prayers" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  if (!process.env.MONGODB_URI) {
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 503 }
    );
  }

  try {
    let body: { text?: string; name?: string };
    try {
      body = (await req.json()) as { text?: string; name?: string };
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const text = (body.text ?? "").trim();
    let name = (body.name ?? "").trim();
    if (!name) name = "Anonymous";
    if (name.length > MAX_NAME_LEN) name = name.slice(0, MAX_NAME_LEN);

    if (!text || text.length > 500) {
      return NextResponse.json({ error: "Invalid prayer text" }, { status: 400 });
    }

    await connectToDatabase();
    const doc = await Prayer.create({ text, name });

    return NextResponse.json(serializePrayer(doc), { status: 201 });
  } catch (err) {
    console.error("[api/prayers] POST error:", err);
    return NextResponse.json(
      { error: "Failed to save prayer" },
      { status: 500 }
    );
  }
}
