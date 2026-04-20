// src/app/api/translate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAdmin } from "@/db/firebaseAdmin";
import { checkStoryRateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

const MAX_PARAGRAPHS = 30;
const MAX_PARAGRAPH_LEN = 3000;

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

export async function POST(req: NextRequest) {
  // Require auth — translation is an expensive LLM call
  const uid = await verifyUser(req);
  if (!uid)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Rate limit: 5/min per user (reuse story limiter)
  const rateLimit = await checkStoryRateLimit(uid);
  if (!rateLimit.success)
    return NextResponse.json(
      { error: "Too many translation requests. Please wait." },
      { status: 429, headers: { "Retry-After": "60" } },
    );

  let body: {
    paragraphs?: unknown;
    title?: unknown;
    targetLanguage?: unknown;
    region?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { paragraphs, title, targetLanguage, region } = body;

  if (!Array.isArray(paragraphs) || !paragraphs.length) {
    return NextResponse.json(
      { error: "paragraphs[] is required" },
      { status: 400 },
    );
  }
  if (paragraphs.length > MAX_PARAGRAPHS) {
    return NextResponse.json({ error: "Too many paragraphs" }, { status: 400 });
  }

  const lang =
    (typeof targetLanguage === "string" && targetLanguage.trim()) ||
    (typeof region === "string" && region.trim()) ||
    "";
  if (!lang) {
    return NextResponse.json(
      { error: "targetLanguage or region is required" },
      { status: 400 },
    );
  }

  const safeParagraphs: string[] = paragraphs
    .map((p: any) => {
      const text = typeof p === "string" ? p : p?.paragraph;
      return typeof text === "string"
        ? text.trim().slice(0, MAX_PARAGRAPH_LEN)
        : "";
    })
    .filter((t: string) => t.length > 0);

  if (!safeParagraphs.length) {
    return NextResponse.json({ error: "No valid paragraphs" }, { status: 400 });
  }

  const safeTitle = typeof title === "string" ? title.trim().slice(0, 300) : "";

  const prompt = `Translate the following fairy tale from English to ${lang}.
Preserve the literary style, tone, and paragraph structure exactly.
${safeTitle ? `Title to translate: "${safeTitle}"` : ""}

Paragraphs (translate each one, keep the same order):
${safeParagraphs.map((p, i) => `[${i + 1}] ${p}`).join("\n\n")}

OUTPUT FORMAT — respond ONLY with valid JSON, no markdown:
{
  ${safeTitle ? `"title": "Translated title",` : ""}
  "paragraphs": [
    {"paragraph": "Translated paragraph 1..."},
    {"paragraph": "Translated paragraph 2..."}
  ],
  "language": "Name of the target language in that language (e.g. Українська, Deutsch)"
}`;

  const groqBody = {
    model: "llama-3.1-8b-instant",
    messages: [
      {
        role: "system",
        content:
          "You are a professional literary translator. Return JSON only.",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.3,
    max_tokens: 4096,
    response_format: { type: "json_object" },
  };

  const groqRes = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(groqBody),
    },
  );

  const groqData = await groqRes.json().catch(() => ({}));
  const raw = groqData?.choices?.[0]?.message?.content ?? "";

  if (!groqRes.ok || !raw) {
    return NextResponse.json(
      { error: "Translation failed", details: groqData },
      { status: 500 },
    );
  }

  try {
    const parsed = JSON.parse(raw);
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json(
      { error: "Failed to parse translation JSON", raw: raw.slice(0, 800) },
      { status: 500 },
    );
  }
}
