// src/app/api/user/data/route.ts
// GET  → returns { userName, stories, credits, plan }
// PUT  → updates user's stories array (called after saving a story)

import { NextRequest, NextResponse } from "next/server";
import { getAdmin } from "@/db/firebaseAdmin";
import { connectDB } from "@/db/mongodb";
import User from "@/models/User";

export const runtime = "nodejs";

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

export async function GET(req: NextRequest) {
  const uid = await verifyUser(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const user = await User.findOne({ firebaseUid: uid }).lean();
  if (!user) {
    return NextResponse.json({
      userName: "",
      stories: [],
      credits: 3,
      plan: "free",
    });
  }

  return NextResponse.json({
    userName: user.userName,
    stories: user.stories,
    credits: user.credits,
    plan: user.plan,
  });
}

export async function PUT(req: NextRequest) {
  const uid = await verifyUser(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { stories?: unknown[]; userName?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  await connectDB();

  const update: Record<string, unknown> = {};
  if (Array.isArray(body.stories)) update.stories = body.stories;
  if (typeof body.userName === "string") update.userName = body.userName;

  const user = await User.findOneAndUpdate(
    { firebaseUid: uid },
    { $set: update },
    { new: true, upsert: true },
  ).lean();

  return NextResponse.json({ ok: true, stories: user?.stories ?? [] });
}

// DELETE a single story by id
export async function DELETE(req: NextRequest) {
  const uid = await verifyUser(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { storyId } = await req.json().catch(() => ({}));
  if (!storyId) return NextResponse.json({ error: "Missing storyId" }, { status: 400 });

  await connectDB();

  await User.findOneAndUpdate(
    { firebaseUid: uid },
    { $pull: { stories: { id: storyId } } },
  );

  return NextResponse.json({ ok: true });
}
