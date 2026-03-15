// src/app/api/maps/[id]/route.ts
// GET   → returns map entry { info, stories } — filters by isPublic for guests
// PUT   → replaces map entry (requires auth)
// PATCH → atomic update for a single story (viewCount, likes); likes also sync to User

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/db/mongodb";
import MapEntry from "@/models/MapEntry";
import User from "@/models/User";
import { getAdmin } from "@/db/firebaseAdmin";

export const runtime = "nodejs";

type Params = { params: { id: string } };

async function optionalAuth(req: NextRequest): Promise<string | null> {
  const token = req.headers.get("authorization")?.split("Bearer ")[1];
  if (!token) return null;
  try {
    const { adminAuth } = getAdmin();
    const decoded = await adminAuth.verifyIdToken(token);
    return decoded.uid;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest, { params }: Params) {
  await connectDB();
  const entry = await MapEntry.findOne({ mapId: params.id }).lean();
  if (!entry) return NextResponse.json({ info: null, stories: [] });

  // Optional auth — authenticated users can also see their own private stories
  const uid = await optionalAuth(req);

  const stories = (entry.stories ?? []).filter((s: any) => {
    // isPublic undefined = old story (had status:false as a technical flag, not privacy)
    // → treat as public. Only respect isPublic when explicitly set.
    const pub = s.isPublic ?? true;
    if (pub) return true;
    // Private story: only visible to its author
    return uid && s.userId === uid;
  });

  return NextResponse.json({ info: entry.info, stories });
}

export async function PUT(req: NextRequest, { params }: Params) {
  // Require auth for writes
  const uid = await optionalAuth(req);
  if (!uid)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

// PATCH: update a single story inside the map (viewCount, likes, isPublic)
export async function PATCH(req: NextRequest, { params }: Params) {
  let body: {
    storyId?: string;
    viewCount?: number;
    likes?: Record<string, boolean>;
    isPublic?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.storyId)
    return NextResponse.json({ error: "Missing storyId" }, { status: 400 });

  await connectDB();

  const setFields: Record<string, unknown> = {};
  if (body.viewCount !== undefined)
    setFields["stories.$[elem].viewCount"] = body.viewCount;
  if (body.likes !== undefined) setFields["stories.$[elem].likes"] = body.likes;
  if (body.isPublic !== undefined)
    setFields["stories.$[elem].isPublic"] = body.isPublic;

  await MapEntry.findOneAndUpdate(
    { mapId: params.id },
    { $set: setFields },
    { arrayFilters: [{ "elem.id": body.storyId }] },
  );

  // Sync likes → User.likedStories
  if (body.likes !== undefined) {
    const uid = await optionalAuth(req);
    if (uid) {
      const isLiked = body.likes[uid] === true;

      if (isLiked) {
        // Fetch story metadata to store in likedStories
        const entry = await MapEntry.findOne(
          { mapId: params.id, "stories.id": body.storyId },
          { "stories.$": 1 },
        ).lean();
        const story = (entry?.stories as any[])?.[0];
        if (story) {
          await User.findOneAndUpdate(
            { firebaseUid: uid, "likedStories.storyId": { $ne: body.storyId } },
            {
              $addToSet: {
                likedStories: {
                  storyId: body.storyId,
                  countryId: params.id,
                  title: story.story?.title ?? "",
                  imageUrl: story.story?.imageUrl ?? "",
                },
              },
            },
          );
        }
      } else {
        await User.findOneAndUpdate(
          { firebaseUid: uid },
          { $pull: { likedStories: { storyId: body.storyId } } },
        );
      }
    }
  }

  return NextResponse.json({ ok: true });
}
