// POST → add a reply to a comment (requires auth)

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/db/mongodb";
import { getAdmin } from "@/db/firebaseAdmin";
import Comment from "@/models/Comment";

export const runtime = "nodejs";

type Params = { params: { commentId: string } };

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

export async function POST(req: NextRequest, { params }: Params) {
  const uid = await verifyUser(req);
  if (!uid)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { text?: string; authorName?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { text, authorName } = body;

  if (!text?.trim())
    return NextResponse.json({ error: "Missing text" }, { status: 400 });

  if (text.trim().length > 1000)
    return NextResponse.json({ error: "Reply too long" }, { status: 400 });

  await connectDB();

  const updated = await Comment.findByIdAndUpdate(
    params.commentId,
    {
      $push: {
        replies: {
          authorUid: uid,
          authorName: authorName ?? "",
          text: text.trim(),
        },
      },
    },
    { new: true },
  ).lean();

  if (!updated)
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });

  const newReply = updated.replies[updated.replies.length - 1];
  return NextResponse.json({ reply: newReply }, { status: 201 });
}
