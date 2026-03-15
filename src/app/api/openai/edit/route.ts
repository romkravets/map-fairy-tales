// src/app/api/openai/edit/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAdmin } from "@/db/firebaseAdmin";
import { deductCreditsAmount } from "@/lib/credits";

export const runtime = "nodejs";

type StoryParagraph = { paragraph: string };
type StoryPayload = {
  title: string;
  paragraphs: StoryParagraph[];
  imageUrl?: string;
  creditsRemaining?: number;
};

function extractJsonCandidate(raw: string): string {
  const withoutFences = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
  const firstBrace = withoutFences.indexOf("{");
  const lastBrace = withoutFences.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return withoutFences.slice(firstBrace, lastBrace + 1);
  }
  return withoutFences;
}

function toParagraphs(value: unknown): StoryParagraph[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "string") return { paragraph: item.trim() };
      if (
        item &&
        typeof item === "object" &&
        typeof (item as { paragraph?: unknown }).paragraph === "string"
      ) {
        return { paragraph: (item as { paragraph: string }).paragraph.trim() };
      }
      return null;
    })
    .filter(
      (item): item is StoryParagraph => !!item && item.paragraph.length > 0,
    );
}

function uniqueParagraphs(paragraphs: StoryParagraph[]): StoryParagraph[] {
  const seen = new Set<string>();
  return paragraphs.filter((item) => {
    const key = item.paragraph.trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function collectLooseParagraphs(value: unknown): StoryParagraph[] {
  if (!value || typeof value !== "object") return [];
  return Object.entries(value as Record<string, unknown>)
    .filter(([key, item]) => {
      if (typeof item !== "string") return false;
      const normalizedKey = key.toLowerCase();
      return !["title", "language", "languagelabel", "locale"].includes(
        normalizedKey,
      );
    })
    .map(([, item]) => ({ paragraph: String(item).trim() }))
    .filter((item) => item.paragraph.length > 0);
}

function normalizeStoryShape(parsed: any): StoryPayload | null {
  if (!parsed || typeof parsed !== "object") return null;

  const nested =
    (parsed.english && typeof parsed.english === "object"
      ? parsed.english
      : null) ||
    (parsed.en && typeof parsed.en === "object" ? parsed.en : null);

  const source = nested || parsed;

  const title =
    (typeof source.title === "string" ? source.title.trim() : "") ||
    (typeof parsed.title === "string" ? parsed.title.trim() : "");

  const paragraphs = uniqueParagraphs([
    ...collectLooseParagraphs(source),
    ...toParagraphs(source.paragraphs),
    ...(source !== parsed ? toParagraphs(parsed.paragraphs) : []),
  ]);

  if (!title || !paragraphs.length) return null;

  return { title, paragraphs };
}

function parseStoryFromRaw(raw: string): StoryPayload | null {
  const candidate = extractJsonCandidate(raw);
  try {
    const parsed = JSON.parse(candidate);
    return normalizeStoryShape(parsed);
  } catch {
    return null;
  }
}

async function callGroq(prompt: string, strictJson = true) {
  const groqBody: Record<string, unknown> = {
    model: "llama-3.1-8b-instant",
    messages: [
      {
        role: "system",
        content: "You are a master storyteller. Return JSON only.",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.6,
    max_tokens: 4096,
  };
  if (strictJson) groqBody.response_format = { type: "json_object" };

  const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(groqBody),
  });
  const data = await resp.json().catch(() => ({}));
  return { resp, data };
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Missing authorization token" },
      { status: 401 },
    );
  }

  let userId: string;
  try {
    const token = authHeader.split("Bearer ")[1];
    const { adminAuth } = getAdmin();
    const decoded = await adminAuth.verifyIdToken(token);
    userId = decoded.uid;
  } catch {
    return NextResponse.json(
      { error: "Invalid or expired token" },
      { status: 401 },
    );
  }

  let body: { region?: string; story?: any; instruction?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { region, story: originalStory, instruction } = body;
  if (!region || typeof region !== "string")
    return NextResponse.json({ error: "Region is required" }, { status: 400 });
  if (!originalStory || typeof originalStory !== "object")
    return NextResponse.json(
      { error: "Original story required" },
      { status: 400 },
    );

  // Charge 30 credits for AI edit
  const EDIT_COST = 30;
  const deduct = await deductCreditsAmount(userId, EDIT_COST);
  if (!deduct.success) {
    return NextResponse.json(
      {
        error: "insufficient_credits",
        message: deduct.error,
        creditsAvailable: deduct.remainingCredits,
        creditsRequired: EDIT_COST,
      },
      { status: 402 },
    );
  }

  const prompt = `Edit the following story to improve style and clarity${instruction ? `; instructions: ${instruction}` : ""}. Keep cultural authenticity and preserve meaning. Respond ONLY with valid JSON containing {"title": "...", "paragraphs": [{"paragraph":"..."}, ...] }.

Original story:
${JSON.stringify(originalStory)}
`;

  let story: StoryPayload | null = null;
  let rawForDebug = "";

  const strict = await callGroq(prompt, true);
  if (strict.resp.ok) {
    rawForDebug = strict.data?.choices?.[0]?.message?.content ?? "";
    story = parseStoryFromRaw(rawForDebug);
  }

  if (!story) {
    const relaxed = await callGroq(prompt, false);
    if (!relaxed.resp.ok) {
      return NextResponse.json(
        { error: "Groq API failed", details: relaxed.data },
        { status: 500 },
      );
    }
    rawForDebug = relaxed.data?.choices?.[0]?.message?.content ?? "";
    story = parseStoryFromRaw(rawForDebug);
  }

  if (!story) {
    return NextResponse.json(
      {
        error: "Failed to parse edited story",
        raw: rawForDebug.slice(0, 1200),
      },
      { status: 500 },
    );
  }

  story.creditsRemaining = deduct.remainingCredits;
  return NextResponse.json(story);
}
