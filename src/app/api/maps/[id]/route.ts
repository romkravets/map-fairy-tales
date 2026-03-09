// src/app/api/maps/[id]/route.ts
// GET  → returns map entry { info, stories }
// PUT  → replaces map entry (after saving / deleting a story)
// PATCH → atomic update for a single story (viewCount, likes)

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/db/mongodb";
import MapEntry from "@/models/MapEntry";

export const runtime = "nodejs";

type Params = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Params) {
  await connectDB();
  const entry = await MapEntry.findOne({ mapId: params.id }).lean();
  if (!entry) return NextResponse.json({ info: null, stories: [] });
  return NextResponse.json({ info: entry.info, stories: entry.stories });
}

export async function PUT(req: NextRequest, { params }: Params) {
  let body: { info?: unknown; stories?: unknown[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  await connectDB();

  const update: Record<string, unknown> = {};
  if (body.stories !== undefined) update.stories = body.stories;
  if (body.info !== undefined) update.info = body.info;

  await MapEntry.findOneAndUpdate(
    { mapId: params.id },
    { $set: update },
    { upsert: true, new: true },
  );

  return NextResponse.json({ ok: true });
}

// PATCH: update a single story inside the map (viewCount, likes)
export async function PATCH(req: NextRequest, { params }: Params) {
  let body: { storyId?: string; viewCount?: number; likes?: Record<string, boolean> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.storyId) return NextResponse.json({ error: "Missing storyId" }, { status: 400 });

  await connectDB();

  const setFields: Record<string, unknown> = {};
  if (body.viewCount !== undefined)
    setFields["stories.$[elem].viewCount"] = body.viewCount;
  if (body.likes !== undefined)
    setFields["stories.$[elem].likes"] = body.likes;

  await MapEntry.findOneAndUpdate(
    { mapId: params.id },
    { $set: setFields },
    { arrayFilters: [{ "elem.id": body.storyId }] },
  );

  return NextResponse.json({ ok: true });
}
