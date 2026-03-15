// src/app/api/user/liked/route.ts
// GET → returns the user's liked stories list

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
  if (!uid)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const user = await User.findOne(
    { firebaseUid: uid },
    { likedStories: 1 },
  ).lean();
  return NextResponse.json({ likedStories: user?.likedStories ?? [] });
}
