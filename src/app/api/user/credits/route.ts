// src/app/api/user/credits/route.ts
// Returns credits and plan for the authenticated user.
// Replaces the Firebase onValue realtime subscription in useCredits hook.

import { NextRequest, NextResponse } from "next/server";
import { getAdmin } from "@/db/firebaseAdmin";
import { connectDB } from "@/db/mongodb";
import User from "@/models/User";
import { checkCreditsRateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const token = req.headers.get("authorization")?.split("Bearer ")[1];
  if (!token)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let uid: string;
  try {
    const { adminAuth } = getAdmin();
    const decoded = await adminAuth.verifyIdToken(token);
    uid = decoded.uid;
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const rateLimit = await checkCreditsRateLimit(uid);
  if (!rateLimit.success)
    return NextResponse.json(
      { error: "Too many requests." },
      { status: 429, headers: { "Retry-After": "60" } },
    );

  await connectDB();

  const user = await User.findOne({ firebaseUid: uid }).lean();
  if (!user) {
    // First visit — create user with free credits
    const newUser = await User.create({
      firebaseUid: uid,
      credits: 2,
      plan: "free",
    });
    return NextResponse.json({ credits: newUser.credits, plan: newUser.plan });
  }

  return NextResponse.json({ credits: user.credits, plan: user.plan });
}
