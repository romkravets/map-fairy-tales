// src/app/api/wayforpay/return/route.ts
// WayForPay POSTs to returnUrl after payment — this route accepts that POST
// and redirects the user's browser to the /settings success page.

import { NextRequest, NextResponse } from "next/server";
import { CREDIT_PACKAGES } from "@/lib/credits";

export const runtime = "nodejs";

// WayForPay sends a form POST to returnUrl after payment.
export async function POST(req: NextRequest) {
  let credits = 0;

  try {
    const formData = await req.formData();
    const orderReference = formData.get("orderReference")?.toString() ?? "";

    // orderReference format: userId_pack_30_timestamp  (packageId may contain "_")
    // Extract packageId = parts[length-3] + "_" + parts[length-2]
    const parts = orderReference.split("_");
    if (parts.length >= 3) {
      const packageId = `${parts[parts.length - 3]}_${parts[parts.length - 2]}`;
      const pack = CREDIT_PACKAGES.find((p) => p.id === packageId);
      if (pack) credits = pack.credits;
    }
  } catch {
    // If parsing fails, still redirect to success without credits count
  }

  const query =
    credits > 0 ? `?payment=success&credits=${credits}` : `?payment=success`;

  return NextResponse.redirect(new URL(`/settings${query}`, req.url), 303);
}

// Also handle GET in case the user navigates directly or browser retries
export async function GET() {
  return NextResponse.redirect(
    new URL(
      "/settings?payment=success",
      process.env.NEXT_PUBLIC_APP_URL || "https://map-fairy-tales.vercel.app",
    ),
    303,
  );
}
