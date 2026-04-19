// src/models/User.ts
import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUserStory {
  id: string;
  nameStory: string;
  link: string;
  imageUrl: string;
  countryId: string;
  isPublic: boolean;
}

export interface ILikedStory {
  storyId: string;
  countryId: string;
  title: string;
  imageUrl: string;
}

export interface IRewardClaim {
  type: string;
  claimedAt: Date;
}

export interface IUser extends Document {
  firebaseUid: string;
  userName: string;
  email: string;
  credits: number;
  plan: "free" | "premium";
  stories: IUserStory[];
  visitedCountries: string[];
  likedStories: ILikedStory[];
  rewardsClaimed: IRewardClaim[];
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
    isPublic: { type: Boolean, default: true },
  },
  { _id: false },
);

const LikedStorySchema = new Schema<ILikedStory>(
  {
    storyId: { type: String, required: true },
    countryId: { type: String, required: true },
    title: { type: String, default: "" },
    imageUrl: { type: String, default: "" },
  },
  { _id: false },
);

const RewardClaimSchema = new Schema<IRewardClaim>(
  {
    type: { type: String, required: true },
    claimedAt: { type: Date, required: true },
  },
  { _id: false },
);

const UserSchema = new Schema<IUser>(
  {
    firebaseUid: { type: String, required: true, unique: true, index: true },
    userName: { type: String, default: "" },
    email: { type: String, default: "" },
    credits: { type: Number, default: 2 },
    plan: { type: String, enum: ["free", "premium"], default: "free" },
    stories: { type: [UserStorySchema], default: [] },
    visitedCountries: { type: [String], default: [] },
    likedStories: { type: [LikedStorySchema], default: [] },
    rewardsClaimed: { type: [RewardClaimSchema], default: [] },
  },
  { timestamps: true },
);

const User: Model<IUser> =
  mongoose.models.User ?? mongoose.model<IUser>("User", UserSchema);

export default User;
