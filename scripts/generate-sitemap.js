#!/usr/bin/env node
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

// Load .env.local and .env (simple parser) so running `node scripts/generate-sitemap.js`
// picks up NEXT_PUBLIC_SITE_URL, MONGODB_URI, SITEMAP_PRETTY, etc.
(function loadEnvFiles() {
  try {
    const cwd = process.cwd();
    const candidates = [".env.local", ".env"];
    for (const name of candidates) {
      const p = path.join(cwd, name);
      if (!fs.existsSync(p)) continue;
      const content = fs.readFileSync(p, "utf8");
      content.split(/\r?\n/).forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) return;
        const eq = trimmed.indexOf("=");
        if (eq === -1) return;
        const key = trimmed.slice(0, eq);
        let val = trimmed.slice(eq + 1);
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          val = val.slice(1, -1);
        }
        // unescape \n sequences
        val = val.replace(/\\n/g, "\n");
        if (process.env[key] === undefined) process.env[key] = val;
      });
    }
  } catch (e) {
    // ignore parsing errors
  }
})();

const MONGODB_URI =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  process.env.DATABASE_URL ||
  process.env.MONGO_URL;
const HAS_DB = Boolean(MONGODB_URI);

const BASE = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const PRETTY = process.env.SITEMAP_PRETTY === "true";
const OUTPUT_DIR = path.join(process.cwd(), "public");

async function fetchEntriesFromDb() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;

  const collections = await db.listCollections().toArray();
  let collName = collections.find(
    (c) => /^mapentries$/i.test(c.name) || /mapentry|mapentries/i.test(c.name),
  )?.name;
  if (!collName) {
    collName =
      collections.find(
        (c) => /map/i.test(c.name) && /entry|entries|map/i.test(c.name),
      )?.name || "mapentries";
  }

  const collection = db.collection(collName);

  const entries = await collection
    .find({}, { projection: { mapId: 1, stories: 1, updatedAt: 1 } })
    .toArray();
  await mongoose.disconnect();
  return entries;
}

async function main() {
  const now = new Date();

  const staticUrls = [
    { url: BASE, lastModified: now, changeFrequency: "daily", priority: 1 },
    {
      url: `${BASE}/explore`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${BASE}/auth`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];

  const urls = [...staticUrls];

  if (HAS_DB) {
    try {
      const entries = await fetchEntriesFromDb();
      for (const entry of entries) {
        const stories = Array.isArray(entry.stories) ? entry.stories : [];
        const publicStories = stories.filter((s) => s.isPublic !== false);
        if (publicStories.length === 0) continue;
        const lastMod = entry.updatedAt || now;
        const mapId = entry.mapId || entry._id || "";
        if (!mapId) continue;

        if (PRETTY) {
          urls.push({
            url: `${BASE}/stories/${encodeURIComponent(mapId)}`,
            lastModified: lastMod,
            changeFrequency: "weekly",
            priority: 0.7,
          });
          for (const story of publicStories) {
            if (!story.id) continue;
            urls.push({
              url: `${BASE}/stories/${encodeURIComponent(mapId)}/${encodeURIComponent(story.id)}`,
              lastModified: lastMod,
              changeFrequency: "monthly",
              priority: 0.6,
            });
          }
        } else {
          urls.push({
            url: `${BASE}/stories?region=${encodeURIComponent(mapId)}&id=${encodeURIComponent(mapId)}`,
            lastModified: lastMod,
            changeFrequency: "weekly",
            priority: 0.7,
          });
          for (const story of publicStories) {
            if (!story.id) continue;
            urls.push({
              url: `${BASE}/story?region=${encodeURIComponent(mapId)}&id=${encodeURIComponent(story.id)}`,
              lastModified: lastMod,
              changeFrequency: "monthly",
              priority: 0.6,
            });
          }
        }
      }
    } catch (err) {
      console.error(
        "Error fetching entries from DB, generating sitemap with static routes only.",
        err,
      );
    }
  } else {
    console.warn(
      "MONGODB_URI not set; generating sitemap with static routes only.",
    );
  }

  // build XML
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  for (const u of urls) {
    xml += "  <url>\n";
    xml += `    <loc>${u.url}</loc>\n`;
    xml += `    <lastmod>${new Date(u.lastModified).toISOString()}</lastmod>\n`;
    if (u.changeFrequency)
      xml += `    <changefreq>${u.changeFrequency}</changefreq>\n`;
    if (u.priority != null) xml += `    <priority>${u.priority}</priority>\n`;
    xml += "  </url>\n";
  }
  xml += "</urlset>\n";

  await fs.promises.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.promises.writeFile(
    path.join(OUTPUT_DIR, "sitemap.xml"),
    xml,
    "utf8",
  );

  const robots =
    [
      "User-agent: *",
      "Allow: /",
      "Disallow: /api/",
      "Disallow: /settings",
      `Sitemap: ${BASE}/sitemap.xml`,
      `Host: ${BASE}`,
    ].join("\n") + "\n";

  await fs.promises.writeFile(
    path.join(OUTPUT_DIR, "robots.txt"),
    robots,
    "utf8",
  );

  console.log("Wrote public/sitemap.xml and public/robots.txt");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
