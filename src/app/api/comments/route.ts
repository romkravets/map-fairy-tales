// GET  ?storyId=xxx  → returns all comments for a story (public)
// POST              → creates a new comment (requires auth)

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/db/mongodb";
import { getAdmin } from "@/db/firebaseAdmin";
import Comment from "@/models/Comment";
import { checkCommentRateLimit } from "@/lib/ratelimit";

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
  const storyId = req.nextUrl.searchParams.get("storyId");
  if (!storyId)
    return NextResponse.json({ error: "Missing storyId" }, { status: 400 });

  await connectDB();

  const comments = await Comment.find({ storyId })
    .sort({ createdAt: 1 })
    .lean();

  return NextResponse.json({ comments });
}

export async function POST(req: NextRequest) {
  const uid = await verifyUser(req);
  if (!uid)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rateLimit = await checkCommentRateLimit(uid);
  if (!rateLimit.success)
    return NextResponse.json(
      { error: "Too many comments. Please slow down." },
      { status: 429, headers: { "Retry-After": "60" } },
    );

  let body: {
    storyId?: string;
    regionId?: string;
    text?: string;
    authorName?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { storyId, regionId, text, authorName } = body;

  if (!storyId || !regionId || !text?.trim())
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 },
    );

  if (text.trim().length > 2000)
    return NextResponse.json({ error: "Comment too long" }, { status: 400 });

  await connectDB();

  const comment = await Comment.create({
    storyId,
    regionId,
    authorUid: uid,
    authorName: authorName ?? "",
    text: text.trim(),
  });

  return NextResponse.json({ comment }, { status: 201 });
}
