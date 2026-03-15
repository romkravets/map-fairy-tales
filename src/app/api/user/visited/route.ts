// src/app/api/user/visited/route.ts
// GET  → returns visited country list
// POST → adds a country to the visited list (idempotent)

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
    { visitedCountries: 1 },
  ).lean();
  return NextResponse.json({ visitedCountries: user?.visitedCountries ?? [] });
}

export async function POST(req: NextRequest) {
  const uid = await verifyUser(req);
  if (!uid)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { countryId: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.countryId)
    return NextResponse.json({ error: "Missing countryId" }, { status: 400 });

  await connectDB();

  // $addToSet is idempotent — won't add duplicates
  await User.findOneAndUpdate(
    { firebaseUid: uid },
    { $addToSet: { visitedCountries: body.countryId } },
    { upsert: true },
  );

  return NextResponse.json({ ok: true });
}
