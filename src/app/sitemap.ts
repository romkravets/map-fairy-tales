// src/app/sitemap.ts
// Next.js 14 App Router built-in sitemap — no extra package needed.
// Dynamically includes all public country pages and individual story pages.

import type { MetadataRoute } from "next";
import { connectDB } from "@/db/mongodb";
import MapEntry from "@/models/MapEntry";

export const revalidate = 3600; // regenerate every hour

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: BASE,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
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

  try {
    await connectDB();

    const entries = await MapEntry.find(
      {},
      { mapId: 1, stories: 1, updatedAt: 1 },
    ).lean();

    const countryRoutes: MetadataRoute.Sitemap = [];
    const storyRoutes: MetadataRoute.Sitemap = [];

    for (const entry of entries) {
      const publicStories = ((entry.stories as any[]) ?? []).filter(
        (s) => s.isPublic !== false,
      );
      if (publicStories.length === 0) continue;

      const lastMod = (entry as any).updatedAt ?? now;

      // Country page: /stories?region=Ukraine&id=Ukraine
      countryRoutes.push({
        url: `${BASE}/stories?region=${encodeURIComponent(entry.mapId)}&id=${encodeURIComponent(entry.mapId)}`,
        lastModified: lastMod,
        changeFrequency: "weekly",
        priority: 0.7,
      });

      // Individual story pages: /story?region=Ukraine&id=<storyId>
      for (const story of publicStories) {
        if (!story.id) continue;
        storyRoutes.push({
          url: `${BASE}/story?region=${encodeURIComponent(entry.mapId)}&id=${encodeURIComponent(story.id)}`,
          lastModified: lastMod,
          changeFrequency: "monthly",
          priority: 0.6,
        });
      }
    }

    return [...staticRoutes, ...countryRoutes, ...storyRoutes];
  } catch {
    // DB unavailable (e.g. build time without env) — return static only
    return staticRoutes;
  }
}
