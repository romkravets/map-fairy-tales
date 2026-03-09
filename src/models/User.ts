// src/models/User.ts
import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUserStory {
  id: string;
  nameStory: string;
  link: string;
  imageUrl: string;
  countryId: string;
}

export interface IUser extends Document {
  firebaseUid: string;
  userName: string;
  email: string;
  credits: number;
  plan: "free" | "premium";
  stories: IUserStory[];
  createdAt: Date;
  updatedAt: Date;
}

const UserStorySchema = new Schema<IUserStory>(
  {
    id: { type: String, required: true },
    nameStory: { type: String, default: "" },
    link: { type: String, required: true },
    imageUrl: { type: String, default: "" },
    countryId: { type: String, default: "" },
  },
  { _id: false },
);

const UserSchema = new Schema<IUser>(
  {
    firebaseUid: { type: String, required: true, unique: true, index: true },
    userName: { type: String, default: "" },
    email: { type: String, default: "" },
    credits: { type: Number, default: 3 },
    plan: { type: String, enum: ["free", "premium"], default: "free" },
    stories: { type: [UserStorySchema], default: [] },
  },
  { timestamps: true },
);

const User: Model<IUser> =
  mongoose.models.User ?? mongoose.model<IUser>("User", UserSchema);

export default User;
