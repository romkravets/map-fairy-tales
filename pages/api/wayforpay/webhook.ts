// pages/api/wayforpay/webhook.ts
// WayForPay POST-ить сюди після кожної зміни статусу інвойсу
// Якщо не відповісти правильним JSON — буде слати повторно протягом 4 днів

import type { NextApiRequest, NextApiResponse } from "next";
import { signWebhook, signWebhookResponse } from "@/lib/wayforpay";
import { addCredits } from "@/lib/credits";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") return res.status(405).end();

  const body = req.body;

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
    return res.status(400).json({ error: "Invalid signature" });
  }

  // ── 2. Обробляємо тільки успішні платежі ────────────
  if (body.transactionStatus === "Approved") {
    // orderReference формат: userId_packageId_timestamp
    const parts = (body.orderReference as string).split("_");

    if (parts.length < 3) {
      console.error("Invalid orderReference format:", body.orderReference);
      return respondToWayForPay(res, body.orderReference, "accept");
    }

    // userId може містити "_", тому беремо все крім останніх двох частин
    const packageId = parts[parts.length - 2]; // напр. "pack_30"
    const userId = parts.slice(0, parts.length - 2).join("_");

    // Знайти кількість кредитів за packageId
    const { CREDIT_PACKAGES } = await import("@/lib/credits");
    const pack = CREDIT_PACKAGES.find((p) => p.id === packageId);

    if (!pack) {
      console.error("Unknown packageId in webhook:", packageId);
      return respondToWayForPay(res, body.orderReference, "accept");
    }

    try {
      await addCredits(userId, pack.credits);
      console.log(`✅ Added ${pack.credits} credits to user ${userId}`);
    } catch (err) {
      console.error("Failed to add credits:", err);
      // Повертаємо "accept" щоб WayForPay не повторював —
      // краще вручну розібрати лог ніж отримати дублі кредитів
    }
  }

  // ── 3. Відповідь WayForPay очікує строго такий формат ─
  return respondToWayForPay(res, body.orderReference, "accept");
}

function respondToWayForPay(
  res: NextApiResponse,
  orderReference: string,
  status: "accept" | "decline",
) {
  const time = Math.floor(Date.now() / 1000);
  const { signWebhookResponse } = require("@/lib/wayforpay");
  const signature = signWebhookResponse(orderReference, status, time);

  // WayForPay вимагає саме такий JSON у відповідь
  return res.status(200).json({
    orderReference,
    status,
    time,
    signature,
  });
}
