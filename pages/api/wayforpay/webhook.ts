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
    // orderReference формат: userId_pack_N_timestamp
    // Наприклад: "abc123_pack_30_1700000000"
    // Timestamp = останній елемент, packageId = "pack_N" (2 частини), userId = решта
    const parts = (body.orderReference as string).split("_");

    // Мінімум: userId(1) + "pack"(1) + number(1) + timestamp(1) = 4 частини
    if (parts.length < 4) {
      console.error("Invalid orderReference format:", body.orderReference);
      return respondToWayForPay(res, body.orderReference, "accept");
    }

    // packageId = "pack_N" — два останніх елементи перед timestamp
    const packageId = `${parts[parts.length - 3]}_${parts[parts.length - 2]}`; // напр. "pack_30"
    const userId = parts.slice(0, parts.length - 3).join("_");

    // Знайти кількість кредитів за packageId
    const { CREDIT_PACKAGES } = await import("@/lib/credits");
    const pack = CREDIT_PACKAGES.find((p) => p.id === packageId);

    if (!pack) {
      console.error("Unknown packageId in webhook:", packageId);
      return respondToWayForPay(res, body.orderReference, "accept");
    }

    try {
      // ── Idempotency: атомарно позначаємо orderReference як оброблений ──
      // Якщо WayForPay вже надсилав цей webhook — пропускаємо (не дублюємо кредити)
      const { getAdmin } = await import("@/db/firebaseAdmin");
      const { adminDb } = getAdmin();
      const processedRef = adminDb.ref(
        `processedPayments/${body.orderReference.replace(/[.$#[\]/]/g, "_")}`,
      );

      let alreadyProcessed = false;
      await processedRef.transaction((current: any) => {
        if (current !== null) {
          alreadyProcessed = true;
          return current; // вже є — не змінюємо
        }
        return { processedAt: Date.now(), userId, packageId };
      });

      if (alreadyProcessed) {
        console.warn(
          `Duplicate webhook for orderReference: ${body.orderReference} — skipping`,
        );
        return respondToWayForPay(res, body.orderReference, "accept");
      }

      await addCredits(userId, pack.credits);
      console.log(`✅ Added ${pack.credits} credits to user ${userId}`);
    } catch (err) {
      console.error("Failed to add credits:", err);
      // Не позначаємо як оброблений — WayForPay повторить, і наступна спроба спрацює
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
