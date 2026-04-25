import mongoose, { Schema, Model, Document, Types } from "mongoose";

export type ExperienceLevel = "beginner" | "intermediate" | "advanced";

export interface IUser {
  email: string;
  name: string;
  image: string;
  experienceLevel: ExperienceLevel;
  topicsExplored: string[];
  practicesStarted: string[];
  preferredTradition: string | null;
  createdAt: Date;
  lastActiveDate: Date;
}

export interface IUserDocument extends IUser, Document {
  _id: Types.ObjectId;
}

const UserSchema = new Schema<IUserDocument>(
  {
    email: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    image: { type: String, default: "" },
    experienceLevel: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      default: "beginner",
    },
    topicsExplored: { type: [String], default: [] },
    practicesStarted: { type: [String], default: [] },
    preferredTradition: { type: String, default: null },
    createdAt: { type: Date, default: () => new Date() },
    lastActiveDate: { type: Date, default: () => new Date() },
  },
  { collection: "users" }
);

const User: Model<IUserDocument> =
  (mongoose.models.User as Model<IUserDocument>) ||
  mongoose.model<IUserDocument>("User", UserSchema);

export default User;
