// src/models/MapEntry.ts
import mongoose, { Schema, Document, Model } from "mongoose";

export interface IMapStory {
  id: string;
  userId: string;
  regionId: string;
  story: {
    title: string;
    imageUrl: string;
    paragraphs: Array<{ paragraph: string }>;
    english?: { title: string; paragraphs: Array<{ paragraph: string }> };
    native?: { title: string; paragraphs: Array<{ paragraph: string }> };
  };
  region: string;
  likes: Record<string, boolean>;
  status: boolean;
  viewCount: number;
}

export interface IMapEntry extends Document {
  mapId: string;
  info: Record<string, unknown> | null;
  stories: IMapStory[];
}

const MapStorySchema = new Schema<IMapStory>(
  {
    id: { type: String, required: true },
    userId: { type: String, default: "" },
    regionId: { type: String, default: "" },
    story: { type: Schema.Types.Mixed, default: {} },
    region: { type: String, default: "" },
    likes: { type: Schema.Types.Mixed, default: {} },
    status: { type: Boolean, default: false },
    viewCount: { type: Number, default: 0 },
  },
  { _id: false },
);

const MapEntrySchema = new Schema<IMapEntry>(
  {
    mapId: { type: String, required: true, unique: true, index: true },
    info: { type: Schema.Types.Mixed, default: null },
    stories: { type: [MapStorySchema], default: [] },
  },
  { timestamps: true },
);

const MapEntry: Model<IMapEntry> =
  mongoose.models.MapEntry ??
  mongoose.model<IMapEntry>("MapEntry", MapEntrySchema);

export default MapEntry;
