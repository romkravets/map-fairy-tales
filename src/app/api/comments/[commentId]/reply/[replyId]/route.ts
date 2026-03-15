// DELETE → remove a reply owned by the requesting user

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/db/mongodb";
import { getAdmin } from "@/db/firebaseAdmin";
import Comment from "@/models/Comment";

export const runtime = "nodejs";

type Params = { params: { commentId: string; replyId: string } };

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

export async function DELETE(req: NextRequest, { params }: Params) {
  const uid = await verifyUser(req);
  if (!uid)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const result = await Comment.updateOne(
    {
      _id: params.commentId,
      "replies._id": params.replyId,
      "replies.authorUid": uid,
    },
    { $pull: { replies: { _id: params.replyId, authorUid: uid } } },
  );

  if (result.modifiedCount === 0)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
