import mongoose, { Schema, Model, Document, Types } from "mongoose";

export type VoiceCharacter = "buddha" | "avalokiteshvara" | "bodhidharma";

export type ConversationMood = "positive" | "curious" | "struggling";

export interface IChatMessage {
  role: string;
  content: string;
  timestamp: Date;
}

export interface IChatSession {
  userId: Types.ObjectId;
  messages: IChatMessage[];
  character: VoiceCharacter | null;
  /** Optional aggregate insight: Claude-labeled tone of the user’s messages. */
  conversationMood?: ConversationMood | null;
  conversationMoodAnalyzedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IChatSessionDocument extends IChatSession, Document {
  _id: Types.ObjectId;
}

const ChatMessageSchema = new Schema<IChatMessage>(
  {
    role: { type: String, required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: () => new Date() },
  },
  { _id: false }
);

const ChatSessionSchema = new Schema<IChatSessionDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    messages: { type: [ChatMessageSchema], default: [] },
    character: {
      type: String,
      enum: ["buddha", "avalokiteshvara", "bodhidharma", null],
      default: null,
    },
    conversationMood: {
      type: String,
      enum: ["positive", "curious", "struggling"],
      required: false,
    },
    conversationMoodAnalyzedAt: { type: Date, required: false },
  },
  { timestamps: true, collection: "chatSessions" }
);

const ChatSession: Model<IChatSessionDocument> =
  (mongoose.models.ChatSession as Model<IChatSessionDocument>) ||
  mongoose.model<IChatSessionDocument>("ChatSession", ChatSessionSchema);

export default ChatSession;
