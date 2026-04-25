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

const PracticeLog: Model<IPracticeLogDocument> =
  (mongoose.models.PracticeLog as Model<IPracticeLogDocument>) ||
  mongoose.model<IPracticeLogDocument>("PracticeLog", PracticeLogSchema);

export default PracticeLog;
