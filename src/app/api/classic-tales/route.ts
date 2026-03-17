// src/app/api/classic-tales/route.ts
// GET /api/classic-tales?country=Germany&limit=6
//
// Sources (in priority order):
//   1. Wikipedia Category API  — broad coverage for any country, returns individual tales
//      with summaries + thumbnails
//   2. Gutendex (Project Gutenberg) — full-text books for ~15 countries with classic
//      collections (Grimm, Andersen, Perrault, etc.)

import { NextRequest, NextResponse } from "next/server";

// Try to load the robust ISO country helper. If unavailable, code falls
// back to previous heuristics.
let isoCountries: any | null = null;
try {
  // use require to avoid potential TS json import issues at build time
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  isoCountries = require("i18n-iso-countries");
  try {
    isoCountries.registerLocale(require("i18n-iso-countries/langs/en.json"));
  } catch {}
} catch {
  isoCountries = null;
}

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

// Manual ISO3 -> ISO2 map as a fallback when `i18n-iso-countries` is
// not available. This is a comprehensive mapping for ISO 3166-1 alpha-3
// to alpha-2 codes.
const ISO3_TO_ALPHA2: Record<string, string> = {
  AFG: "AF",
  ALB: "AL",
  DZA: "DZ",
  ASM: "AS",
  AND: "AD",
  AGO: "AO",
  AIA: "AI",
  ATA: "AQ",
  ATG: "AG",
  ARG: "AR",
  ARM: "AM",
  ABW: "AW",
  AUS: "AU",
  AUT: "AT",
  AZE: "AZ",
  BHS: "BS",
  BHR: "BH",
  BGD: "BD",
  BRB: "BB",
  BLR: "BY",
  BEL: "BE",
  BLZ: "BZ",
  BEN: "BJ",
  BMU: "BM",
  BTN: "BT",
  BOL: "BO",
  BES: "BQ",
  BIH: "BA",
  BWA: "BW",
  BVT: "BV",
  BRA: "BR",
  IOT: "IO",
  BRN: "BN",
  BGR: "BG",
  BFA: "BF",
  BDI: "BI",
  CPV: "CV",
  KHM: "KH",
  CMR: "CM",
  CAN: "CA",
  CYM: "KY",
  CAF: "CF",
  TCD: "TD",
  CHL: "CL",
  CHN: "CN",
  CXR: "CX",
  CCK: "CC",
  COL: "CO",
  COM: "KM",
  COG: "CG",
  COD: "CD",
  COK: "CK",
  CRI: "CR",
  CIV: "CI",
  HRV: "HR",
  CUB: "CU",
  CUW: "CW",
  CYP: "CY",
  CZE: "CZ",
  DNK: "DK",
  DJI: "DJ",
  DMA: "DM",
  DOM: "DO",
  ECU: "EC",
  EGY: "EG",
  SLV: "SV",
  GNQ: "GQ",
  ERI: "ER",
  EST: "EE",
  ETH: "ET",
  FLK: "FK",
  FRO: "FO",
  FJI: "FJ",
  FIN: "FI",
  FRA: "FR",
  GUF: "GF",
  PYF: "PF",
  ATF: "TF",
  GAB: "GA",
  GMB: "GM",
  GEO: "GE",
  DEU: "DE",
  GHA: "GH",
  GIB: "GI",
  GRC: "GR",
  GRL: "GL",
  GRD: "GD",
  GLP: "GP",
  GUM: "GU",
  GTM: "GT",
  GGY: "GG",
  GIN: "GN",
  GNB: "GW",
  GUY: "GY",
  HTI: "HT",
  HMD: "HM",
  VAT: "VA",
  HND: "HN",
  HKG: "HK",
  HUN: "HU",
  ISL: "IS",
  IND: "IN",
  IDN: "ID",
  IRN: "IR",
  IRQ: "IQ",
  IRL: "IE",
  IMN: "IM",
  ISR: "IL",
  ITA: "IT",
  JAM: "JM",
  JPN: "JP",
  JEY: "JE",
  JOR: "JO",
  KAZ: "KZ",
  KEN: "KE",
  KIR: "KI",
  PRK: "KP",
  KOR: "KR",
  KWT: "KW",
  KGZ: "KG",
  LAO: "LA",
  LVA: "LV",
  LBN: "LB",
  LSO: "LS",
  LBR: "LR",
  LBY: "LY",
  LIE: "LI",
  LTU: "LT",
  LUX: "LU",
  MAC: "MO",
  MKD: "MK",
  MDG: "MG",
  MWI: "MW",
  MYS: "MY",
  MDV: "MV",
  MLI: "ML",
  MLT: "MT",
  MHL: "MH",
  MTQ: "MQ",
  MRT: "MR",
  MUS: "MU",
  MYT: "YT",
  MEX: "MX",
  FSM: "FM",
  MDA: "MD",
  MCO: "MC",
  MNG: "MN",
  MNE: "ME",
  MSR: "MS",
  MAR: "MA",
  MOZ: "MZ",
  MMR: "MM",
  NAM: "NA",
  NRU: "NR",
  NPL: "NP",
  NLD: "NL",
  NCL: "NC",
  NZL: "NZ",
  NIC: "NI",
  NER: "NE",
  NGA: "NG",
  NIU: "NU",
  NFK: "NF",
  MNP: "MP",
  NOR: "NO",
  OMN: "OM",
  PAK: "PK",
  PLW: "PW",
  PSE: "PS",
  PAN: "PA",
  PNG: "PG",
  PRY: "PY",
  PER: "PE",
  PHL: "PH",
  PCN: "PN",
  POL: "PL",
  PRT: "PT",
  PRI: "PR",
  QAT: "QA",
  REU: "RE",
  ROU: "RO",
  RUS: "RU",
  RWA: "RW",
  BLM: "BL",
  SHN: "SH",
  KNA: "KN",
  LCA: "LC",
  MAF: "MF",
  SPM: "PM",
  VCT: "VC",
  WSM: "WS",
  SMR: "SM",
  STP: "ST",
  SAU: "SA",
  SEN: "SN",
  SRB: "RS",
  SYC: "SC",
  SLE: "SL",
  SGP: "SG",
  SXM: "SX",
  SVK: "SK",
  SVN: "SI",
  SLB: "SB",
  SOM: "SO",
  ZAF: "ZA",
  SGS: "GS",
  SSD: "SS",
  ESP: "ES",
  LKA: "LK",
  SDN: "SD",
  SUR: "SR",
  SJM: "SJ",
  SWE: "SE",
  CHE: "CH",
  SYR: "SY",
  TWN: "TW",
  TJK: "TJ",
  TZA: "TZ",
  THA: "TH",
  TLS: "TL",
  TGO: "TG",
  TKL: "TK",
  TON: "TO",
  TTO: "TT",
  TUN: "TN",
  TUR: "TR",
  TKM: "TM",
  TCA: "TC",
  TUV: "TV",
  UGA: "UG",
  UKR: "UA",
  ARE: "AE",
  GBR: "GB",
  USA: "US",
  UMI: "UM",
  URY: "UY",
  UZB: "UZ",
  VUT: "VU",
  VEN: "VE",
  VNM: "VN",
  VGB: "VG",
  VIR: "VI",
  WLF: "WF",
  ESH: "EH",
  YEM: "YE",
  ZMB: "ZM",
  ZWE: "ZW",
};

// Simple in-memory telemetry for normalization failures. This helps spot
// frequently-misentered country codes/names during development and can be
// replaced with a real telemetry sink later.
const NORMALIZATION_TELEMETRY: Record<string, number> = {};
function recordNormalizationFailure(raw: string, details?: string) {
  const k = (raw ?? "").trim();
  if (!k) return;
  NORMALIZATION_TELEMETRY[k] = (NORMALIZATION_TELEMETRY[k] ?? 0) + 1;
  console.warn(
    `[classic-tales] normalizeCountry failure: "${k}" (count=${NORMALIZATION_TELEMETRY[k]}) ${
      details ?? ""
    }`,
  );
}

// Keywords that indicate a category is about tales / folklore
const FOLKLORE_KEYWORDS = [
  "fairy",
  "folk",
  "folklore",
  "legend",
  "myth",
  "tale",
  "fable",
];

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

// Normalize incoming `country` parameter. Accepts full country names,
// ISO alpha-2 (e.g. `MN`) and some ISO alpha-3 codes (e.g. `MNG`). Returns
// a display name that matches keys used in `WP_ADJECTIVE` when possible.
function normalizeCountry(input: string): string {
  const raw = (input ?? "").trim();
  if (!raw) return raw;

  // If it already matches a known key (case-insensitive), return canonical key
  const keys = Object.keys(WP_ADJECTIVE);
  const found = keys.find((k) => k.toLowerCase() === raw.toLowerCase());
  if (found) return found;

  const up = raw.toUpperCase();
  // Try common manual mappings first (aliases, short codes)
  const MANUAL: Record<string, string> = {
    USA: "United States",
    "UNITED STATES": "United States",
    "UNITED STATES OF AMERICA": "United States",
    US: "United States",
    "U.S.A": "United States",
    "U.S.": "United States",

    UK: "United Kingdom",
    GB: "United Kingdom",
    GBR: "United Kingdom",
    ENGLAND: "England",
    ENG: "England",

    DE: "Germany",
    DEU: "Germany",
    GER: "Germany",

    FR: "France",
    FRA: "France",

    ES: "Spain",
    ESP: "Spain",

    IT: "Italy",
    ITA: "Italy",

    PT: "Portugal",
    PRT: "Portugal",

    NL: "Netherlands",
    NLD: "Netherlands",

    BE: "Belgium",
    BEL: "Belgium",

    AT: "Austria",
    AUT: "Austria",

    CH: "Switzerland",
    CHE: "Switzerland",

    DK: "Denmark",
    DNK: "Denmark",

    SE: "Sweden",
    SWE: "Sweden",

    NO: "Norway",
    NOR: "Norway",

    FI: "Finland",
    FIN: "Finland",

    IS: "Iceland",
    ISL: "Iceland",

    PL: "Poland",
    POL: "Poland",

    CZ: "Czech Republic",
    CZE: "Czech Republic",

    SK: "Slovakia",
    SVK: "Slovakia",

    HU: "Hungary",
    HUN: "Hungary",

    RO: "Romania",
    ROU: "Romania",

    BG: "Bulgaria",
    BGR: "Bulgaria",

    RS: "Serbia",
    SRB: "Serbia",

    HR: "Croatia",
    HRV: "Croatia",

    SI: "Slovenia",
    SVN: "Slovenia",

    BA: "Bosnia and Herzegovina",
    BIH: "Bosnia and Herzegovina",

    AL: "Albania",
    ALB: "Albania",

    LT: "Lithuania",
    LTU: "Lithuania",

    LV: "Latvia",
    LVA: "Latvia",

    EE: "Estonia",
    EST: "Estonia",

    JP: "Japan",
    JPN: "Japan",

    CN: "China",
    CHN: "China",

    KR: "South Korea",
    KOR: "South Korea",
    KP: "North Korea",
    PRK: "North Korea",

    IN: "India",
    IND: "India",

    VN: "Vietnam",
    VNM: "Vietnam",

    TH: "Thailand",
    THA: "Thailand",

    ID: "Indonesia",
    IDN: "Indonesia",

    PH: "Philippines",
    PHL: "Philippines",

    MY: "Malaysia",
    MYS: "Malaysia",

    MM: "Myanmar",
    MMR: "Myanmar",

    KH: "Cambodia",
    KHM: "Cambodia",

    MN: "Mongolia",
    MNG: "Mongolia",

    NP: "Nepal",
    NPL: "Nepal",

    LK: "Sri Lanka",
    LKA: "Sri Lanka",

    TR: "Turkey",
    TUR: "Turkey",

    IR: "Iran",
    IRN: "Iran",

    IQ: "Iraq",
    IRQ: "Iraq",

    SA: "Saudi Arabia",
    SAU: "Saudi Arabia",

    EG: "Egypt",
    EGY: "Egypt",

    MA: "Morocco",
    MAR: "Morocco",

    DZ: "Algeria",
    DZA: "Algeria",

    TN: "Tunisia",
    TUN: "Tunisia",

    ET: "Ethiopia",
    ETH: "Ethiopia",

    KE: "Kenya",
    KEN: "Kenya",

    NG: "Nigeria",
    NGA: "Nigeria",

    GH: "Ghana",
    GHA: "Ghana",

    TZ: "Tanzania",
    TZA: "Tanzania",

    UG: "Uganda",
    UGA: "Uganda",

    ZA: "South Africa",
    ZAF: "South Africa",

    ZW: "Zimbabwe",
    ZWE: "Zimbabwe",

    MX: "Mexico",
    MEX: "Mexico",

    BR: "Brazil",
    BRA: "Brazil",

    AR: "Argentina",
    ARG: "Argentina",

    CO: "Colombia",
    COL: "Colombia",

    PE: "Peru",
    PER: "Peru",

    CL: "Chile",
    CHL: "Chile",

    CU: "Cuba",
    CUB: "Cuba",

    HT: "Haiti",
    HTI: "Haiti",

    CA: "Canada",
    CAN: "Canada",

    AU: "Australia",
    AUS: "Australia",

    NZ: "New Zealand",
    NZL: "New Zealand",

    UA: "Ukraine",
    UKR: "Ukraine",

    BY: "Belarus",
    BLR: "Belarus",

    RU: "Russia",
    RUS: "Russia",
  };
  if (MANUAL[up]) return MANUAL[up];

  // Use i18n-iso-countries when available for robust mappings
  if (isoCountries) {
    try {
      // alpha-3 -> alpha-2 -> name
      if (/^[A-Z]{3}$/.test(up)) {
        const a2 = isoCountries.alpha3ToAlpha2(up);
        if (a2) {
          const name = isoCountries.getName(a2, "en");
          if (name) {
            const key = keys.find(
              (k) => k.toLowerCase() === name.toLowerCase(),
            );
            return key ?? name;
          }
        }
      }

      // alpha-2 -> name
      if (/^[A-Z]{2}$/.test(up)) {
        const name = isoCountries.getName(up, "en");
        if (name) {
          const key = keys.find((k) => k.toLowerCase() === name.toLowerCase());
          return key ?? name;
        }
      }

      // try treating raw as a name -> alpha2
      const maybeA2 = isoCountries.getAlpha2Code(raw, "en");
      if (maybeA2) {
        const name = isoCountries.getName(maybeA2, "en");
        const key = keys.find(
          (k) => k.toLowerCase() === (name ?? raw).toLowerCase(),
        );
        return key ?? name ?? raw;
      }
    } catch (e) {
      console.warn(
        `[classic-tales] normalizeCountry: i18n-iso-countries threw for "${raw}": ${String(e)}`,
      );
    }
  }

  // Fallback: use our manual ISO3 -> ISO2 map when isoCountries is absent
  if (/^[A-Z]{3}$/.test(up) && ISO3_TO_ALPHA2[up]) {
    const a2 = ISO3_TO_ALPHA2[up];
    try {
      // Prefer Intl.DisplayNames for a readable country name if available
      // `as any` keeps TypeScript from complaining in some environments
      // where lib.dom types aren't present.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dn = new (Intl as any).DisplayNames(["en"], { type: "region" });
      const name = dn.of(a2);
      const key = keys.find(
        (k) => k.toLowerCase() === (name ?? "").toLowerCase(),
      );
      return key ?? name ?? a2;
    } catch {
      return a2;
    }
  }

  // If the input is an alpha-2 code, try Intl as a last-ditch readable name
  if (/^[A-Z]{2}$/.test(up)) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dn = new (Intl as any).DisplayNames(["en"], { type: "region" });
      const name = dn.of(up);
      if (name) {
        const key = keys.find((k) => k.toLowerCase() === name.toLowerCase());
        return key ?? name;
      }
    } catch {
      /* ignore */
    }
  }

  // Last resort: title-case the input and replace separators
  const human = raw
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .split(" ")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join(" ");
  const key = keys.find((k) => k.toLowerCase() === human.toLowerCase());
  if (key) return key;

  // Extended logging/telemetry for failed normalizations
  recordNormalizationFailure(raw, `falling back to "${human}"`);
  return human;
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

// Fetch categories for a given Wikipedia page title. Returns category
// names without the "Category:" prefix. Used as a stricter validation step
// to ensure a page actually belongs to folklore/tale-related categories.
async function wpPageCategories(title: string): Promise<string[]> {
  const url =
    `https://en.wikipedia.org/w/api.php?` +
    new URLSearchParams({
      action: "query",
      prop: "categories",
      titles: title,
      cllimit: "max",
      format: "json",
      origin: "*",
    });

  try {
    const res = await fetch(url, { headers: WP_HEADERS, ...WP_CACHE });
    if (!res.ok) return [];
    const data = await res.json();
    const pages = data.query?.pages ?? {};
    for (const k of Object.keys(pages)) {
      const cats = pages[k].categories ?? [];
      return cats.map((c: any) =>
        (c.title as string).replace(/^Category:/, ""),
      );
    }
    return [];
  } catch {
    return [];
  }
}

// Heuristic that checks whether a page looks like a folklore/tale page by
// inspecting the summary/title/snippet and (as a stronger check) the page
// categories. `adjectives` are country demonyms like ["Mongolian"].
async function pageLooksLikeFolklore(
  title: string,
  extract: string,
  snippet: string | undefined,
  adjectives?: string[],
): Promise<boolean> {
  const lowerTitle = String(title).toLowerCase();
  const lowerExtract = String(extract).toLowerCase();
  const lowerSnippet = String(snippet ?? "").toLowerCase();

  const matchedKeywords = FOLKLORE_KEYWORDS.filter(
    (kw) =>
      lowerExtract.includes(kw) ||
      lowerTitle.includes(kw) ||
      lowerSnippet.includes(kw),
  );
  if (matchedKeywords.length) return true;

  const matchedAdjectives = (adjectives ?? []).filter((adj) => {
    const lower = String(adj).toLowerCase();
    return (
      lowerExtract.includes(lower) ||
      lowerTitle.includes(lower) ||
      lowerSnippet.includes(lower)
    );
  });
  if (matchedAdjectives.length) return true;

  const cats = await wpPageCategories(title);
  if (!cats?.length) return false;
  const lowerCats = cats.join(" ").toLowerCase();
  if (FOLKLORE_KEYWORDS.some((kw) => lowerCats.includes(kw))) return true;
  if (
    (adjectives ?? []).some((adj) =>
      lowerCats.includes(String(adj).toLowerCase()),
    )
  )
    return true;

  return false;
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
  // Stronger filtering: accept only pages that look like folklore/tale pages
  // based on summary/title/snippet or their Wikipedia categories.
  const adjectives = WP_ADJECTIVE[country] ?? [country];
  const results: ClassicItem[] = [];
  for (let i = 0; i < hits.length && results.length < limit; i++) {
    const hit = hits[i];
    const s = summaries[i];
    if (!s || !s.extract) continue;
    if (s.extract.toLowerCase().includes("may refer to")) continue;

    const snippet = String(hit.snippet ?? "");
    const title = hit.title;

    const isFolklore = await pageLooksLikeFolklore(
      title,
      s.extract,
      snippet,
      adjectives,
    );
    if (!isFolklore) continue;

    results.push({
      id: `wp-${hit.title.replace(/\s+/g, "_")}`,
      title: hit.title,
      description:
        s.extract.length > 160
          ? s.extract.slice(0, 160).replace(/\s\S*$/, "…")
          : s.extract,
      imageUrl: s.thumbnail,
      linkUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(hit.title)}`,
      source: "wikipedia",
    });
  }

  return results;
}

// Build ClassicItems from a list of Wikipedia page titles
async function wpTitlesToItems(
  titles: string[],
  maxItems: number,
  adjectives?: string[],
): Promise<ClassicItem[]> {
  const picked = titles.slice(0, maxItems);
  const summaries = await Promise.all(picked.map((t) => wpSummary(t)));

  const results: ClassicItem[] = [];
  for (let i = 0; i < picked.length && results.length < maxItems; i++) {
    const title = picked[i];
    const s = summaries[i];
    if (!s || !s.extract) continue;
    if (s.extract.toLowerCase().includes("may refer to")) continue;

    const isFolklore = await pageLooksLikeFolklore(
      title,
      s.extract,
      undefined,
      adjectives,
    );
    if (!isFolklore) continue;

    results.push({
      id: `wp-${title.replace(/\s+/g, "_")}`,
      title,
      description:
        s.extract.length > 160
          ? s.extract.slice(0, 160).replace(/\s\S*$/, "…")
          : s.extract,
      imageUrl: s.thumbnail,
      linkUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`,
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

  if (titles.length) return wpTitlesToItems(titles, maxItems, adjectives);

  // ── Step 2: dynamic category discovery ────────────────────────────────────
  const foundCategory = await wpFindCategory(country);
  if (foundCategory) {
    titles = await wpCategoryMembers(foundCategory);
    if (titles.length) return wpTitlesToItems(titles, maxItems, adjectives);
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
  const countryRaw = searchParams.get("country") ?? "";
  const country = normalizeCountry(countryRaw);
  console.info(
    `[classic-tales] normalized country: ${countryRaw} -> ${country}`,
  );
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
