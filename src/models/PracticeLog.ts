import mongoose, { Schema, Model, Document, Types } from "mongoose";

export type PracticeType = "chat" | "scripture" | "prayer" | "identify" | "meditation";

export interface IPracticeLog {
  userId: Types.ObjectId;
  type: PracticeType;
  detail: string;
  date: Date;
}

export interface IPracticeLogDocument extends IPracticeLog, Document {
  _id: Types.ObjectId;
}

const PracticeLogSchema = new Schema<IPracticeLogDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["chat", "scripture", "prayer", "identify", "meditation"],
      required: true,
    },
    detail: { type: String, default: "" },
    date: { type: Date, default: () => new Date(), index: true },
  },
  { collection: "practiceLogs" }
);

PracticeLogSchema.index({ userId: 1, date: -1 });

// During dev hot-reloads Mongoose caches the first-registered model.
// If the schema changed (e.g. a new enum value was added) the stale
// cached model will reject the new values.  Delete and re-register
// so the running schema always matches this file.
if (mongoose.models.PracticeLog) {
  delete mongoose.models.PracticeLog;
}

const PracticeLog: Model<IPracticeLogDocument> =
  mongoose.model<IPracticeLogDocument>("PracticeLog", PracticeLogSchema);

export default PracticeLog;
