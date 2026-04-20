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
  if (body.info !== undefined) update.info = body.info;

  // Security: only allow user to add/update their own stories
  if (body.stories !== undefined && Array.isArray(body.stories)) {
    const existing = await MapEntry.findOne({ mapId: params.id }).lean();
    const existingStories = ((existing as any)?.stories ?? []) as any[];

    // Keep all stories NOT owned by this user, then add user's submitted stories
    const otherStories = existingStories.filter(
      (s: any) => s.userId && s.userId !== uid,
    );
    const userStories = body.stories.filter(
      (s: any) => !s.userId || s.userId === uid,
    );
    update.stories = [...otherStories, ...userStories];
  }

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
    incrementView?: boolean;
    likes?: Record<string, boolean>;
    ratings?: Record<string, number>;
    isPublic?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.storyId)
    return NextResponse.json({ error: "Missing storyId" }, { status: 400 });

  // Require auth for likes, ratings, isPublic — prevent anonymous manipulation
  const needsAuth =
    body.likes !== undefined ||
    body.ratings !== undefined ||
    body.isPublic !== undefined;

  const uid = await optionalAuth(req);
  if (needsAuth && !uid)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await connectDB();

    const setFields: Record<string, unknown> = {};
    const incFields: Record<string, number> = {};

    // viewCount: server-side increment only (prevents arbitrary values)
    if (body.incrementView)
      incFields["stories.$[elem].viewCount"] = 1;

    // likes: only allow the authenticated user to toggle their own like
    if (body.likes !== undefined && uid) {
      // Sanitize: only accept the caller's own uid key
      const userLikeValue = body.likes[uid];
      if (typeof userLikeValue === "boolean") {
        setFields[`stories.$[elem].likes.${uid}`] = userLikeValue;
      }
    }

    if (body.ratings !== undefined && uid) {
      // Sanitize: only accept the caller's own uid rating (1-5)
      const userRating = body.ratings[uid];
      if (typeof userRating === "number" && userRating >= 1 && userRating <= 5) {
        setFields[`stories.$[elem].ratings.${uid}`] = userRating;
      }
    }

    // isPublic: require ownership of the story
    if (body.isPublic !== undefined && uid) {
      const owns = await MapEntry.countDocuments({
        mapId: params.id,
        stories: { $elemMatch: { id: body.storyId, userId: uid } },
      });
      if (owns) {
        setFields["stories.$[elem].isPublic"] = body.isPublic;
      }
    }

    const updateOps: Record<string, unknown> = {};
    if (Object.keys(setFields).length > 0) updateOps.$set = setFields;
    if (Object.keys(incFields).length > 0) updateOps.$inc = incFields;

    if (Object.keys(updateOps).length > 0) {
      await MapEntry.findOneAndUpdate(
        { mapId: params.id },
        updateOps,
        { arrayFilters: [{ "elem.id": body.storyId }], strict: false },
      );
    }

    // Recalculate ratings avg after individual rating update
    if (body.ratings !== undefined && uid) {
      const entry = await MapEntry.findOne(
        { mapId: params.id, "stories.id": body.storyId },
        { "stories.$": 1 },
      ).lean();
      const story = (entry?.stories as any[])?.[0];
      if (story?.ratings) {
        const rKeys = Object.keys(story.ratings);
        const count = rKeys.length;
        const avg = count
          ? rKeys.reduce((sum: number, k: string) => sum + (story.ratings[k] ?? 0), 0) / count
          : 0;
        await MapEntry.findOneAndUpdate(
          { mapId: params.id },
          {
            $set: {
              "stories.$[elem].ratingCount": count,
              "stories.$[elem].avgRating": Math.round(avg * 10) / 10,
            },
          },
          { arrayFilters: [{ "elem.id": body.storyId }], strict: false },
        );
      }
    }

    // Sync likes → User.likedStories
    if (body.likes !== undefined && uid) {
      const isLiked = body.likes[uid] === true;

      if (isLiked) {
        const entry = await MapEntry.findOne(
          { mapId: params.id, "stories.id": body.storyId },
          { "stories.$": 1 },
        ).lean();
        const story = (entry?.stories as any[])?.[0];
        if (story) {
          await User.findOneAndUpdate(
            {
              firebaseUid: uid,
              "likedStories.storyId": { $ne: body.storyId },
            },
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

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("PATCH /api/maps/[id] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
