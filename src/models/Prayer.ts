import mongoose, { Schema, Model, Document, Types } from "mongoose";

/**
 * A public entry on the prayer wall (user-submitted intention), distinct from
 * structured daily prayers on the Prayers page or PracticeLog prayer completions.
 */
export interface IPrayer {
  text: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPrayerDocument extends IPrayer, Document {
  _id: Types.ObjectId;
}

const PrayerSchema = new Schema<IPrayerDocument>(
  {
    text: { type: String, required: true, maxlength: 500, trim: true },
    name: { type: String, default: "Anonymous", maxlength: 120, trim: true },
  },
  { timestamps: true, collection: "prayerWall" }
);

PrayerSchema.index({ createdAt: -1 });

const Prayer: Model<IPrayerDocument> =
  (mongoose.models.Prayer as Model<IPrayerDocument>) ||
  mongoose.model<IPrayerDocument>("Prayer", PrayerSchema);

export default Prayer;
