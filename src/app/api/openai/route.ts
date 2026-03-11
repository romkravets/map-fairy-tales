// src/app/api/openai/route.ts
// App Router version — замінює pages/api/openai.tsx

import { NextRequest, NextResponse } from "next/server";
import { getAdmin } from "@/db/firebaseAdmin";
import { deductCredit, getUserCredits } from "@/lib/credits";

export const runtime = "nodejs";

// ── Types ─────────────────────────────────────────────────────
type StoryParagraph = { paragraph: string };
type StoryPayload = {
  title: string;
  paragraphs: StoryParagraph[];
  imageUrl?: string;
  creditsRemaining?: number;
  imageWarning?: string;
};

// ── Helpers ───────────────────────────────────────────────────
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

  // Try to extract from nested "english" or "en" block (backward compat)
  const nested =
    (parsed.english && typeof parsed.english === "object" ? parsed.english : null) ||
    (parsed.en && typeof parsed.en === "object" ? parsed.en : null);

  const source = nested || parsed;

  const title = (typeof source.title === "string" ? source.title.trim() : "") ||
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

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildFallbackImage(title: string, region: string): string {
  const safeTitle = escapeXml(title || "Fairy Tale");
  const safeRegion = escapeXml(region || "Unknown Region");
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f8ecf2"/>
      <stop offset="100%" stop-color="#e9f0ff"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#bg)"/>
  <circle cx="220" cy="190" r="180" fill="#ffffff" fill-opacity="0.6"/>
  <circle cx="860" cy="820" r="220" fill="#ffffff" fill-opacity="0.45"/>
  <text x="512" y="450" text-anchor="middle" font-size="44" font-family="Georgia, serif" fill="#31263a">${safeTitle}</text>
  <text x="512" y="520" text-anchor="middle" font-size="30" font-family="Arial, sans-serif" fill="#5b4f63">${safeRegion}</text>
  <text x="512" y="580" text-anchor="middle" font-size="22" font-family="Arial, sans-serif" fill="#7d7186">AI illustration unavailable</text>
</svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

// ── Main Handler ──────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // ── 1. Перевірка Firebase ID Token ──────────────────
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

  // ── 2. Отримати дані запиту ─────────────────────────
  let body: { region?: unknown; customValueForStory?: any };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { region: rawRegion, customValueForStory } = body;

  if (!rawRegion || typeof rawRegion !== "string") {
    return NextResponse.json(
      { error: "Region is required" },
      { status: 400 },
    );
  }

  const isCustom = !!(
    customValueForStory?.team ||
    customValueForStory?.heroes ||
    customValueForStory?.events
  );

  // ── 3. Санітизація вводу (запобігання prompt injection) ──
  const MAX_FIELD_LEN = 200;
  const sanitize = (v: unknown): string | undefined => {
    if (typeof v !== "string") return undefined;
    return v
      .replace(/[\x00-\x1F"\\]/g, " ")
      .trim()
      .slice(0, MAX_FIELD_LEN);
  };

  const safeCustom = customValueForStory
    ? {
        team: sanitize(customValueForStory.team),
        heroes: sanitize(customValueForStory.heroes),
        events: sanitize(customValueForStory.events),
      }
    : undefined;

  const region = rawRegion
    .replace(/[^a-zA-Z0-9\u0400-\u04FF\s\-_]/g, "")
    .trim()
    .slice(0, 100);
  if (!region) {
    return NextResponse.json(
      { error: "Invalid region value" },
      { status: 400 },
    );
  }

  // ── 4. Атомарно списати кредити ДО генерації ─────────
  const cost = isCustom ? 2 : 1;
  const deductResult = await deductCredit(userId, isCustom);

  if (!deductResult.success) {
    const { credits } = await getUserCredits(userId).catch(() => ({
      credits: 0,
    }));
    return NextResponse.json(
      {
        error: "insufficient_credits",
        message: isCustom
          ? `Custom story requires 2 credits. You have ${credits}.`
          : `You have no credits left.`,
        creditsAvailable: credits,
        creditsRequired: cost,
      },
      { status: 402 },
    );
  }

  // ── 5. Будуємо промпт ───────────────────────────────
  let storyContent = `You are a master storyteller specializing in folk tales and fairy tales from around the world.

Your task: Write an immersive, emotionally rich fairy tale deeply rooted in the cultural traditions of the region identified by the code "${region}".

STORY REQUIREMENTS:
- The story must feel like it was written by a native author from that culture — use culturally authentic names, landscapes, foods, customs, and values.
- Do NOT mention the country name explicitly anywhere in the story.
- Convert the JSON region code to the real country/region name internally before writing.

STRUCTURE:
1. Title — Evocative and poetic, reflecting the cultural style.
2. Opening — Establish the world: vivid setting, introduce the protagonist with their unique personality, appearance, and daily life.
3. Rising Action — A meaningful conflict or quest begins. Weave in folklore elements typical to this region.
4. Climax — A pivotal, emotionally charged moment where the protagonist must make a difficult choice.
5. Resolution — A satisfying, culturally resonant ending with a moral lesson.

CHARACTERS:
- Protagonist: culturally authentic name, distinct appearance, a flaw, and a strength.
- At least 2 memorable secondary characters that reflect regional folklore archetypes.

DIALOGUES (minimum 3, woven naturally into the story).

LENGTH: At least 8–12 substantial paragraphs (4–6 sentences each).

`;

  if (isCustom && safeCustom) {
    if (safeCustom.team) {
      storyContent += `THEME: The central theme must be "${safeCustom.team}". Weave it throughout organically.\n`;
    }
    if (safeCustom.heroes) {
      storyContent += `HERO NAME: The main protagonist must be named "${safeCustom.heroes}".\n`;
    }
    if (safeCustom.events) {
      storyContent += `KEY EVENT: "${safeCustom.events}" must serve as the central conflict or turning point.\n`;
    }
  }

  storyContent += `
OUTPUT FORMAT — respond ONLY with valid JSON, no markdown, no extra text:
{
  "title": "Story Title in English",
  "paragraphs": [
    {"paragraph": "English paragraph 1..."},
    {"paragraph": "English paragraph 2..."}
  ]
}
Do NOT include any text outside the JSON.`;

  // ── 6. Генерація через Groq ─────────────────────────
  const callGroq = async (strictJson: boolean) => {
    const groqBody: Record<string, unknown> = {
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content:
            "You are a master storyteller. Return JSON only. No markdown, no comments.",
        },
        { role: "user", content: storyContent },
      ],
      temperature: 0.6,
      max_tokens: 4096,
    };
    if (strictJson) {
      groqBody.response_format = { type: "json_object" };
    }
    const response = await fetch(
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
    const data = await response.json().catch(() => ({}));
    return { response, data };
  };

  let story: StoryPayload | null = null;
  let rawForDebug = "";

  const strictAttempt = await callGroq(true);
  if (strictAttempt.response.ok) {
    rawForDebug = strictAttempt.data?.choices?.[0]?.message?.content ?? "";
    story = parseStoryFromRaw(rawForDebug);
  } else {
    const failedGeneration = strictAttempt.data?.error?.failed_generation;
    if (typeof failedGeneration === "string") {
      rawForDebug = failedGeneration;
      story = parseStoryFromRaw(failedGeneration);
    }
  }

  if (!story) {
    const relaxedAttempt = await callGroq(false);
    if (!relaxedAttempt.response.ok) {
      return NextResponse.json(
        { error: "Groq API failed", details: relaxedAttempt.data },
        { status: 500 },
      );
    }
    rawForDebug = relaxedAttempt.data?.choices?.[0]?.message?.content ?? "";
    story = parseStoryFromRaw(rawForDebug);
  }

  if (!story) {
    return NextResponse.json(
      { error: "Failed to parse story JSON", raw: rawForDebug.slice(0, 1200) },
      { status: 500 },
    );
  }

  // ── 7. Генерація зображення ─────────────────────────
  const imagePrompt =
    `Children's fairy tale book illustration, full color, painterly style inspired by the folk art of the ${region} region. ` +
    `Scene from the story titled "${story.title}". ` +
    `Heroic child protagonist in traditional regional clothing in a magical landscape typical of ${region}. ` +
    `Warm enchanting lighting, rich colors, detailed backgrounds. No text or letters in the image.`;

  const fallbackImage = buildFallbackImage(story.title, region);
  const briaApiKey = process.env.BRIA_API_KEY;

  if (!briaApiKey) {
    story.imageUrl = fallbackImage;
    story.imageWarning = "Image API key is missing. Fallback image was used.";
  } else {
    const imageResp = await fetch(
      "https://engine.prod.bria-api.com/v1/text-to-image/fast/2.3",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          api_token: briaApiKey,
        },
        body: JSON.stringify({ prompt: imagePrompt, num_results: 1, sync: true }),
      },
    );

    const imageData = await imageResp.json().catch(() => ({}));
    const generatedImage = imageData?.result?.[0]?.urls?.[0];

    if (!imageResp.ok || !generatedImage) {
      console.error("Bria generation failed", {
        status: imageResp.status,
        details: imageData,
      });
      story.imageUrl = fallbackImage;
      story.imageWarning = "Image generation failed. Fallback image was used.";
    } else {
      story.imageUrl = generatedImage;
    }
  }

  story.creditsRemaining = deductResult.remainingCredits;
  return NextResponse.json(story);
}
