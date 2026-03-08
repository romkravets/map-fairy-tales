// pages/api/wayforpay/create-invoice.ts
// Створює інвойс WayForPay і повертає URL для редіректу

import type { NextApiRequest, NextApiResponse } from "next";
import { adminAuth } from "@/db/firebaseAdmin";
import { getUserCredits, CREDIT_PACKAGES } from "@/lib/credits";
import { createInvoice } from "@/lib/wayforpay";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "POST") return res.status(405).end();

  // ── 1. Верифікація Firebase токена ──────────────────
  const token = req.headers.authorization?.split("Bearer ")[1];
  if (!token) return res.status(401).json({ error: "Missing token" });

  let userId: string;
  let userEmail: string | undefined;

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    userId = decoded.uid;
    userEmail = decoded.email;
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }

  // ── 2. Знайти пакет ─────────────────────────────────
  const { packageId } = req.body;
  const pack = CREDIT_PACKAGES.find((p) => p.id === packageId);

  if (!pack) {
    return res.status(400).json({ error: "Invalid package ID" });
  }

  // ── 3. Унікальний orderReference ────────────────────
  // Формат: userId_packageId_timestamp — щоб webhook знав кому додати кредити
  const orderReference = `${userId}_${packageId}_${Date.now()}`;

  // Determine application base URL. Prefer explicit env var(s),
  // fall back to the incoming request host (works in dev).
  const envAppUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL;
  let appUrl = envAppUrl;
  if (!appUrl) {
    const host = req.headers.host;
    const protoHeader = req.headers["x-forwarded-proto"] as string | undefined;
    const proto = protoHeader ? String(protoHeader).split(",")[0] : "http";
    if (host) appUrl = `${proto}://${host}`;
  }

  if (!appUrl) {
    console.error("Missing NEXT_PUBLIC_APP_URL / NEXT_PUBLIC_SITE_URL and could not infer host");
    return res.status(500).json({ error: "Server configuration error: missing NEXT_PUBLIC_APP_URL" });
  }

  // ── 4. Створити інвойс ──────────────────────────────
  try {
    const result = await createInvoice({
      orderReference,
      amount: pack.priceUAH, // ціна в гривнях
      productName: `${pack.credits} credits — Story Map`,
      clientEmail: userEmail,
      serviceUrl: `${appUrl}/api/wayforpay/webhook`,
      returnUrl: `${appUrl}/settings?payment=success&credits=${pack.credits}`,
    });

    if (result.error || !result.invoiceUrl) {
      return res
        .status(500)
        .json({ error: result.error || "Failed to create invoice" });
    }

    return res.status(200).json({
      invoiceUrl: result.invoiceUrl,
      qrCode: result.qrCode,
    });
  } catch (err: any) {
    console.error("WayForPay create-invoice error:", err);
    return res.status(500).json({ error: err.message });
  }
};

export default handler;
