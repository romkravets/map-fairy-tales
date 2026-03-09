// src/app/api/wayforpay/webhook/route.ts
// App Router version — замінює pages/api/wayforpay/webhook.ts

import { NextRequest, NextResponse } from "next/server";
import { signWebhook, signWebhookResponse } from "@/lib/wayforpay";
import { addCredits, CREDIT_PACKAGES } from "@/lib/credits";
import { connectDB } from "@/db/mongodb";
import ProcessedPayment from "@/models/ProcessedPayment";

export const runtime = "nodejs";

function buildResponse(
  orderReference: string,
  status: "accept" | "decline",
): NextResponse {
  const time = Math.floor(Date.now() / 1000);
  const signature = signWebhookResponse(orderReference, status, time);
  return NextResponse.json({ orderReference, status, time, signature });
}

export async function POST(req: NextRequest) {
  let body: Record<string, any>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  console.log("WayForPay webhook received:", JSON.stringify(body));

  // ── 1. Верифікація підпису від WayForPay ────────────
  const expectedSignature = signWebhook({
    orderReference: body.orderReference,
    amount: body.amount,
    currency: body.currency,
    authCode: body.authCode ?? "",
    cardPan: body.cardPan ?? "",
    transactionStatus: body.transactionStatus,
    reasonCode: body.reasonCode,
  });

  if (body.merchantSignature !== expectedSignature) {
    console.error("WayForPay webhook: invalid signature");
    console.error("Expected:", expectedSignature);
    console.error("Received:", body.merchantSignature);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // ── 2. Обробляємо тільки успішні платежі ────────────
  if (body.transactionStatus === "Approved") {
    // orderReference формат: userId_pack_N_timestamp
    const parts = (body.orderReference as string).split("_");

    // Мінімум: userId(1) + "pack"(1) + number(1) + timestamp(1) = 4 частини
    if (parts.length < 4) {
      console.error("Invalid orderReference format:", body.orderReference);
      return buildResponse(body.orderReference, "accept");
    }

    // packageId = "pack_N" — два елементи перед timestamp
    const packageId = `${parts[parts.length - 3]}_${parts[parts.length - 2]}`;
    const userId = parts.slice(0, parts.length - 3).join("_");

    const pack = CREDIT_PACKAGES.find((p) => p.id === packageId);

    if (!pack) {
      console.error("Unknown packageId in webhook:", packageId);
      return buildResponse(body.orderReference, "accept");
    }

    try {
      // ── Idempotency: MongoDB unique index on orderReference ──
      await connectDB();
      try {
        await ProcessedPayment.create({
          orderReference: body.orderReference,
          processedAt: Date.now(),
          userId,
          packageId,
        });
      } catch (dupErr: any) {
        if (dupErr?.code === 11000) {
          console.warn(`Duplicate webhook for orderReference: ${body.orderReference} — skipping`);
          return buildResponse(body.orderReference, "accept");
        }
        throw dupErr;
      }

      await addCredits(userId, pack.credits);
      console.log(`✅ Added ${pack.credits} credits to user ${userId}`);
    } catch (err) {
      console.error("Failed to add credits:", err);
    }
  }

  // ── 3. Відповідь WayForPay ───────────────────────────
  return buildResponse(body.orderReference, "accept");
}
