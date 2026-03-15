// src/app/api/classic-tales/route.ts
// GET /api/classic-tales?country=Germany&limit=6
//
// Sources (in priority order):
//   1. Wikipedia Category API  — broad coverage for any country, returns individual tales
//      with summaries + thumbnails
//   2. Gutendex (Project Gutenberg) — full-text books for ~15 countries with classic
//      collections (Grimm, Andersen, Perrault, etc.)

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// ── Wikipedia category keywords per country ──────────────────────────────────
// Values are tried as "Category:{value}_fairy_tales", then "_folk_tales", then "_folklore"
const WP_ADJECTIVE: Record<string, string[]> = {
  Germany: ["German"],
  Austria: ["German", "Austrian"],
  Switzerland: ["Swiss", "German"],
  France: ["French"],
  Belgium: ["Belgian", "Flemish"],
  Denmark: ["Danish"],
  Sweden: ["Swedish"],
  Norway: ["Norwegian"],
  Finland: ["Finnish"],
  Iceland: ["Icelandic"],
  Netherlands: ["Dutch"],
  England: ["English", "British"],
  "United Kingdom": ["English", "British", "Scottish", "Welsh"],
  Scotland: ["Scottish"],
  Wales: ["Welsh"],
  Ireland: ["Irish", "Celtic"],
  Italy: ["Italian"],
  Spain: ["Spanish"],
  Portugal: ["Portuguese"],
  Greece: ["Greek"],
  Russia: ["Russian"],
  Ukraine: ["Ukrainian"],
  Belarus: ["Belarusian"],
  Poland: ["Polish"],
  "Czech Republic": ["Czech"],
  Czechia: ["Czech"],
  Slovakia: ["Slovak"],
  Hungary: ["Hungarian"],
  Romania: ["Romanian"],
  Bulgaria: ["Bulgarian"],
  Serbia: ["Serbian"],
  Croatia: ["Croatian"],
  Slovenia: ["Slovenian"],
  "Bosnia and Herzegovina": ["Bosnian"],
  Albania: ["Albanian"],
  Lithuania: ["Lithuanian"],
  Latvia: ["Latvian"],
  Estonia: ["Estonian"],
  Japan: ["Japanese"],
  China: ["Chinese"],
  "South Korea": ["Korean"],
  "North Korea": ["Korean"],
  Korea: ["Korean"],
  India: ["Indian"],
  Vietnam: ["Vietnamese"],
  Thailand: ["Thai"],
  Indonesia: ["Indonesian"],
  Philippines: ["Filipino"],
  Malaysia: ["Malaysian"],
  Myanmar: ["Burmese"],
  Cambodia: ["Cambodian", "Khmer"],
  Mongolia: ["Mongolian"],
  Nepal: ["Nepali"],
  "Sri Lanka": ["Sri Lankan", "Sinhalese"],
  Turkey: ["Turkish"],
  Iran: ["Iranian", "Persian"],
  Persia: ["Persian"],
  Iraq: ["Iraqi"],
  "Saudi Arabia": ["Arabian", "Arab"],
  Egypt: ["Egyptian"],
  Morocco: ["Moroccan"],
  Algeria: ["Algerian"],
  Tunisia: ["Tunisian"],
  Ethiopia: ["Ethiopian"],
  Kenya: ["Kenyan"],
  Nigeria: ["Nigerian"],
  Ghana: ["Ghanaian"],
  Tanzania: ["Tanzanian"],
  Uganda: ["Ugandan"],
  "South Africa": ["South African"],
  Zimbabwe: ["Zimbabwean"],
  Mexico: ["Mexican"],
  Brazil: ["Brazilian"],
  Argentina: ["Argentine", "Argentinian"],
  Colombia: ["Colombian"],
  Peru: ["Peruvian"],
  Chile: ["Chilean"],
  Cuba: ["Cuban"],
  Haiti: ["Haitian"],
  "United States": ["American", "Native_American"],
  Canada: ["Canadian", "Indigenous_Canadian"],
  Australia: ["Australian"],
  "New Zealand": ["Māori", "New_Zealand"],
};

// ── Gutenberg hardcoded IDs for countries with free full-text collections ────
const GUTENBERG_IDS: Record<string, number[]> = {
  Germany: [2591, 5314],
  Denmark: [1597, 27200, 4083],
  France: [29021, 17208],
  Greece: [11339, 21],
  England: [16785, 7439, 23765],
  "United Kingdom": [16785, 7439],
  Ireland: [25415],
  Russia: [30030],
  Norway: [19778],
  Finland: [7000],
  "Saudi Arabia": [128],
  Iran: [128],
  Persia: [128],
  India: [17501],
  Japan: [22252],
  China: [17700],
};

export interface ClassicItem {
  id: string;
  title: string;
  description: string;
  imageUrl: string | null;
  linkUrl: string;
  source: "wikipedia" | "gutenberg";
}

// ── Wikipedia helpers ─────────────────────────────────────────────────────────

const WP_HEADERS = { "User-Agent": "MapFairyTales/1.0 (educational app)" };
const WP_CACHE = { next: { revalidate: 86400 } } as const;

// Keywords that indicate a category is about tales / folklore
const FOLKLORE_KEYWORDS = ["fairy", "folk", "folklore", "legend", "myth", "tale", "fable"];

async function wpCategoryMembers(category: string): Promise<string[]> {
  const url =
    `https://en.wikipedia.org/w/api.php?` +
    new URLSearchParams({
      action: "query",
      list: "categorymembers",
      cmtitle: `Category:${category}`,
      cmlimit: "20",
      cmtype: "page",
      format: "json",
      origin: "*",
    });

  const res = await fetch(url, { headers: WP_HEADERS, ...WP_CACHE });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.query?.categorymembers ?? []).map((p: any) => p.title as string);
}

async function wpSummary(
  title: string,
): Promise<{ extract: string; thumbnail: string | null } | null> {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  try {
    const res = await fetch(url, { headers: WP_HEADERS, ...WP_CACHE });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      extract: data.extract ?? "",
      thumbnail: data.thumbnail?.source ?? null,
    };
  } catch {
    return null;
  }
}

// Dynamically search Wikipedia's category namespace to find the right category
// for countries not listed in WP_ADJECTIVE (e.g. "Afghanistan" → "Afghan fairy tales")
async function wpFindCategory(country: string): Promise<string | null> {
  const queries = [
    `${country} fairy tales`,
    `${country} folk tales`,
    `${country} folklore`,
  ];

  for (const q of queries) {
    const url =
      `https://en.wikipedia.org/w/api.php?` +
      new URLSearchParams({
        action: "query",
        list: "search",
        srnamespace: "14", // Category namespace
        srsearch: q,
        srlimit: "5",
        format: "json",
        origin: "*",
      });

    const res = await fetch(url, { headers: WP_HEADERS, ...WP_CACHE });
    if (!res.ok) continue;
    const data = await res.json();
    const hits: any[] = data.query?.search ?? [];

    // Pick the first hit whose category title actually relates to folklore
    const hit = hits.find((h: any) => {
      const lower = h.title.toLowerCase();
      return FOLKLORE_KEYWORDS.some((kw) => lower.includes(kw));
    });
    if (hit) return (hit.title as string).replace(/^Category:/, "");
  }
  return null;
}

// Last-resort fallback: search Wikipedia articles directly for "{country} fairy tale"
async function wpArticleSearch(
  country: string,
  limit: number,
): Promise<ClassicItem[]> {
  const url =
    `https://en.wikipedia.org/w/api.php?` +
    new URLSearchParams({
      action: "query",
      list: "search",
      srsearch: `${country} fairy tale`,
      srlimit: String(Math.min(limit * 2, 20)), // fetch extra to allow filtering
      format: "json",
      origin: "*",
    });

  const res = await fetch(url, { headers: WP_HEADERS, ...WP_CACHE });
  if (!res.ok) return [];
  const data = await res.json();
  const hits: any[] = data.query?.search ?? [];

  const summaries = await Promise.all(hits.map((h: any) => wpSummary(h.title)));

  const results: ClassicItem[] = [];
  for (let i = 0; i < hits.length && results.length < limit; i++) {
    const s = summaries[i];
    if (!s || !s.extract) continue;
    if (s.extract.toLowerCase().includes("may refer to")) continue;

    results.push({
      id: `wp-${hits[i].title.replace(/\s+/g, "_")}`,
      title: hits[i].title,
      description:
        s.extract.length > 160
          ? s.extract.slice(0, 160).replace(/\s\S*$/, "…")
          : s.extract,
      imageUrl: s.thumbnail,
      linkUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(hits[i].title)}`,
      source: "wikipedia",
    });
  }

  return results;
}

// Build ClassicItems from a list of Wikipedia page titles
async function wpTitlesToItems(
  titles: string[],
  maxItems: number,
): Promise<ClassicItem[]> {
  const picked = titles.slice(0, maxItems);
  const summaries = await Promise.all(picked.map((t) => wpSummary(t)));

  const results: ClassicItem[] = [];
  for (let i = 0; i < picked.length; i++) {
    const s = summaries[i];
    if (!s || !s.extract) continue;
    if (s.extract.toLowerCase().includes("may refer to")) continue;

    results.push({
      id: `wp-${picked[i].replace(/\s+/g, "_")}`,
      title: picked[i],
      description:
        s.extract.length > 160
          ? s.extract.slice(0, 160).replace(/\s\S*$/, "…")
          : s.extract,
      imageUrl: s.thumbnail,
      linkUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(picked[i])}`,
      source: "wikipedia",
    });
  }

  return results;
}

// Three-step lookup:
//   1. Try known adjective + suffix category patterns (WP_ADJECTIVE map)
//   2. Dynamic category search for countries not in the map
//   3. Article-level full-text search as last resort
async function fetchWikipediaTales(
  country: string,
  maxItems: number,
): Promise<ClassicItem[]> {
  const adjectives = WP_ADJECTIVE[country] ?? [country];
  const suffixes = ["fairy_tales", "folk_tales", "folklore"];

  // ── Step 1: known category patterns ───────────────────────────────────────
  let titles: string[] = [];

  outer: for (const adj of adjectives) {
    for (const suffix of suffixes) {
      const members = await wpCategoryMembers(`${adj}_${suffix}`);
      if (members.length > 0) {
        titles = members;
        break outer;
      }
    }
  }

  if (titles.length) return wpTitlesToItems(titles, maxItems);

  // ── Step 2: dynamic category discovery ────────────────────────────────────
  const foundCategory = await wpFindCategory(country);
  if (foundCategory) {
    titles = await wpCategoryMembers(foundCategory);
    if (titles.length) return wpTitlesToItems(titles, maxItems);
  }

  // ── Step 3: article search fallback ───────────────────────────────────────
  return wpArticleSearch(country, maxItems);
}

// ── Gutenberg helpers ─────────────────────────────────────────────────────────

async function fetchGutenbergBooks(country: string): Promise<ClassicItem[]> {
  const ids = GUTENBERG_IDS[country];
  if (!ids?.length) return [];

  const res = await fetch(
    `https://gutendex.com/books?ids=${ids.join(",")}&languages=en&copyright=false`,
    { next: { revalidate: 86400 } },
  );
  if (!res.ok) return [];
  const data = await res.json();

  return (data.results ?? []).map((book: any) => {
    const coverUrl =
      book.formats["image/jpeg"] || book.formats["image/png"] || null;
    const authors: string[] = (book.authors ?? []).map((a: any) =>
      a.name.split(",").reverse().join(" ").trim(),
    );
    return {
      id: `gb-${book.id}`,
      title: book.title,
      description: authors.join(", ") || "Project Gutenberg",
      imageUrl: coverUrl,
      linkUrl: `https://www.gutenberg.org/ebooks/${book.id}`,
      source: "gutenberg",
    } satisfies ClassicItem;
  });
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const country = searchParams.get("country") ?? "";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "6", 10), 12);

  if (!country)
    return NextResponse.json({ error: "Missing country" }, { status: 400 });

  try {
    // Run both sources in parallel
    const [wpTales, gbBooks] = await Promise.all([
      fetchWikipediaTales(country, limit),
      fetchGutenbergBooks(country),
    ]);

    // Wikipedia tales first, Gutenberg books appended (deduplicated by title)
    const seen = new Set<string>();
    const classics: ClassicItem[] = [];

    for (const item of [...wpTales, ...gbBooks]) {
      if (seen.has(item.title)) continue;
      seen.add(item.title);
      classics.push(item);
      if (classics.length >= limit) break;
    }

    return NextResponse.json({ classics });
  } catch (err) {
    console.error("[classic-tales]", err);
    return NextResponse.json({ classics: [] });
  }
}
