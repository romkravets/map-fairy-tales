// src/app/api/user/stories/[storyId]/route.ts
// PATCH → toggle isPublic for a story owned by the requesting user

import { NextRequest, NextResponse } from "next/server";
import { getAdmin } from "@/db/firebaseAdmin";
import { connectDB } from "@/db/mongodb";
import User from "@/models/User";
import MapEntry from "@/models/MapEntry";

export const runtime = "nodejs";

type Params = { params: { storyId: string } };

async function verifyUser(req: NextRequest): Promise<string | null> {
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

export async function PATCH(req: NextRequest, { params }: Params) {
  const uid = await verifyUser(req);
  if (!uid)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { isPublic: boolean; countryId: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body.isPublic !== "boolean" || !body.countryId)
    return NextResponse.json(
      { error: "Missing isPublic or countryId" },
      { status: 400 },
    );

  await connectDB();

  // Update in User.stories[]
  await User.findOneAndUpdate(
    { firebaseUid: uid, "stories.id": params.storyId },
    { $set: { "stories.$.isPublic": body.isPublic } },
  );

  // Update in MapEntry.stories[] — only if the story belongs to this user
  await MapEntry.findOneAndUpdate(
    {
      mapId: body.countryId,
      stories: { $elemMatch: { id: params.storyId, userId: uid } },
    },
    { $set: { "stories.$[elem].isPublic": body.isPublic } },
    { arrayFilters: [{ "elem.id": params.storyId, "elem.userId": uid }] },
  );

  return NextResponse.json({ ok: true });
}
