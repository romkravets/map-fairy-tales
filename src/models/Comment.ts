import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IReply {
  _id: Types.ObjectId;
  authorUid: string;
  authorName: string;
  text: string;
  createdAt: Date;
}

export interface IComment extends Document {
  storyId: string;
  regionId: string;
  authorUid: string;
  authorName: string;
  text: string;
  replies: Types.DocumentArray<IReply>;
  createdAt: Date;
  updatedAt: Date;
}

const ReplySchema = new Schema<IReply>(
  {
    authorUid: { type: String, required: true },
    authorName: { type: String, default: "" },
    text: { type: String, required: true, maxlength: 1000, trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

const CommentSchema = new Schema<IComment>(
  {
    storyId: { type: String, required: true },
    regionId: { type: String, required: true },
    authorUid: { type: String, required: true },
    authorName: { type: String, default: "" },
    text: { type: String, required: true, maxlength: 2000, trim: true },
    replies: { type: [ReplySchema], default: [] },
  },
  { timestamps: true },
);

CommentSchema.index({ storyId: 1, createdAt: 1 });

const Comment: Model<IComment> =
  mongoose.models.Comment ?? mongoose.model<IComment>("Comment", CommentSchema);

export default Comment;
