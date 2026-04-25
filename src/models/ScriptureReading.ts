import mongoose, { Schema, Model, Document, Types } from "mongoose";

export interface IScriptureReading {
  userId: Types.ObjectId;
  scriptureSlug: string;
  scriptureTitle: string;
  completedAt: Date;
  readingTimeSeconds: number;
}

export interface IScriptureReadingDocument
  extends IScriptureReading,
    Document {
  _id: Types.ObjectId;
}

const ScriptureReadingSchema = new Schema<IScriptureReadingDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    scriptureSlug: { type: String, required: true, index: true },
    scriptureTitle: { type: String, required: true },
    completedAt: { type: Date, default: () => new Date() },
    readingTimeSeconds: { type: Number, default: 0, min: 0 },
  },
  { collection: "scriptureReadings" }
);

ScriptureReadingSchema.index({ userId: 1, completedAt: -1 });

const ScriptureReading: Model<IScriptureReadingDocument> =
  (mongoose.models.ScriptureReading as Model<IScriptureReadingDocument>) ||
  mongoose.model<IScriptureReadingDocument>(
    "ScriptureReading",
    ScriptureReadingSchema
  );

export default ScriptureReading;
