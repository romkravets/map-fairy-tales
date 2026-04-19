// src/app/api/credits/earn/route.ts
// Awards free credits for engagement actions (share, like, daily visit, free package claim).
// Each action type has a daily limit to prevent abuse.

import { NextRequest, NextResponse } from "next/server";
import { getAdmin } from "@/db/firebaseAdmin";
import { connectDB } from "@/db/mongodb";
import User from "@/models/User";

export const runtime = "nodejs";

// Action definitions: credits awarded and max claims per day
const REWARD_CONFIG: Record<
  string,
  { credits: number; maxPerDay: number; label: string }
> = {
  daily_visit: { credits: 1, maxPerDay: 1, label: "Daily visit" },
  share: { credits: 2, maxPerDay: 1, label: "Share site" },
  like: { credits: 1, maxPerDay: 3, label: "Like a story" },
  comment: { credits: 1, maxPerDay: 2, label: "Leave a comment" },
  free_pack_10: { credits: 10, maxPerDay: 1, label: "Free Starter pack" },
  free_pack_30: { credits: 30, maxPerDay: 1, label: "Free Popular pack" },
  free_pack_100: { credits: 100, maxPerDay: 1, label: "Free Pro pack" },
};

export async function POST(req: NextRequest) {
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

  let body: { action?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = body.action;
  if (!action || !REWARD_CONFIG[action]) {
    return NextResponse.json(
      { error: "Invalid action", validActions: Object.keys(REWARD_CONFIG) },
      { status: 400 },
    );
  }

  const config = REWARD_CONFIG[action];
  await connectDB();

  // Check how many times this action was claimed today
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const user = await User.findOne({ firebaseUid: uid });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const todayClaims = (user.rewardsClaimed ?? []).filter(
    (r) => r.type === action && new Date(r.claimedAt) >= todayStart,
  );

  if (todayClaims.length >= config.maxPerDay) {
    return NextResponse.json(
      {
        error: "Daily limit reached",
        action,
        maxPerDay: config.maxPerDay,
        claimedToday: todayClaims.length,
      },
      { status: 429 },
    );
  }

  // Atomically add credits + record reward claim
  const updated = await User.findOneAndUpdate(
    { firebaseUid: uid },
    {
      $inc: { credits: config.credits },
      $push: { rewardsClaimed: { type: action, claimedAt: new Date() } },
    },
    { new: true },
  ).lean();

  return NextResponse.json({
    success: true,
    action,
    creditsAwarded: config.credits,
    totalCredits: updated?.credits ?? 0,
    label: config.label,
  });
}
