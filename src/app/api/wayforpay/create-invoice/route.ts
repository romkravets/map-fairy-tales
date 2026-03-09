// src/app/api/wayforpay/create-invoice/route.ts
// App Router version — замінює pages/api/wayforpay/create-invoice.ts

import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/db/firebaseAdmin";
import { CREDIT_PACKAGES } from "@/lib/credits";
import { createInvoice } from "@/lib/wayforpay";

// Потрібен Node.js runtime — firebase-admin не сумісний з Edge
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // ── 1. Верифікація Firebase токена ──────────────────
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.split("Bearer ")[1];
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 401 });
  }

  let userId: string;
  let userEmail: string | undefined;

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    userId = decoded.uid;
    userEmail = decoded.email;
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  // ── 2. Знайти пакет ─────────────────────────────────
  let body: { packageId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { packageId } = body;
  const pack = CREDIT_PACKAGES.find((p) => p.id === packageId);

  if (!pack) {
    return NextResponse.json({ error: "Invalid package ID" }, { status: 400 });
  }

  // ── 3. Унікальний orderReference ────────────────────
  // Формат: userId_packageId_timestamp
  // Наприклад: "abc123_pack_30_1700000000"
  const orderReference = `${userId}_${packageId}_${Date.now()}`;

  // ── 4. Base URL для webhook і returnUrl ─────────────
  const envAppUrl =
    process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL;
  let appUrl = envAppUrl;
  if (!appUrl) {
    const host = req.headers.get("host");
    const proto =
      (req.headers.get("x-forwarded-proto") ?? "https").split(",")[0];
    if (host) appUrl = `${proto}://${host}`;
  }

  if (!appUrl) {
    return NextResponse.json(
      { error: "Server configuration error: missing NEXT_PUBLIC_APP_URL" },
      { status: 500 },
    );
  }

  // ── 5. Створити інвойс ──────────────────────────────
  try {
    const result = await createInvoice({
      orderReference,
      amount: pack.priceUAH,
      productName: `${pack.credits} credits — Story Map`,
      clientEmail: userEmail,
      serviceUrl: `${appUrl}/api/wayforpay/webhook`,
      returnUrl: `${appUrl}/settings?payment=success&credits=${pack.credits}`,
    });

    if (result.error || !result.invoiceUrl) {
      return NextResponse.json(
        { error: result.error || "Failed to create invoice" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      invoiceUrl: result.invoiceUrl,
      qrCode: result.qrCode,
    });
  } catch (err: any) {
    console.error("WayForPay create-invoice error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
