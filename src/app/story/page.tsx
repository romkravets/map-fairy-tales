import type { Metadata } from "next";
import { Suspense } from "react";
import dynamic from "next/dynamic";
import Preloader from "@/components/Preloader/Preloader";
import { connectDB } from "@/db/mongodb";
import MapEntry from "@/models/MapEntry";

const Story = dynamic(() => import("@/components/Story/Story"), {
  ssr: false,
});

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ region?: string; id?: string }>;
}): Promise<Metadata> {
  const { region, id } = await searchParams;

  // Fetch the real story title from DB for rich SEO
  let storyTitle = "";
  if (region && id) {
    try {
      await connectDB();
      const entry = await MapEntry.findOne(
        { mapId: region, "stories.id": id },
        { "stories.$": 1 },
      ).lean();
      const story = (entry?.stories as any[])?.[0];
      storyTitle = story?.story?.title ?? "";
    } catch {
      // silently fall back to generic title
    }
  }

  const title = storyTitle || (region ? `Fairy Tale from ${region}` : "Read Story");
  const description = storyTitle
    ? `"${storyTitle}" — an AI-generated fairy tale from ${region}. Discover folk stories, mythology, and cultural legends from around the world on Map Fairy Tales.`
    : `Read an AI-generated fairy tale or folk story from ${region ?? "around the world"}. Explore cultural legends and mythology on Map Fairy Tales.`;

  return {
    title,
    description,
    keywords: [
      storyTitle,
      region,
      "fairy tale",
      "folk story",
      "AI generated story",
      "legend",
      "mythology",
      "cultural stories",
    ].filter(Boolean) as string[],
    alternates: {
      canonical: region && id
        ? `${BASE}/story?region=${encodeURIComponent(region)}&id=${encodeURIComponent(id)}`
        : `${BASE}/story`,
    },
    openGraph: {
      title: storyTitle ? `${storyTitle} | Map Fairy Tales` : `${title} | Map Fairy Tales`,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title: storyTitle || title,
      description,
    },
  };
}

function StoryJsonLd({ title, region }: { title: string; region: string }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: title,
    description: `AI-generated fairy tale from ${region}`,
    genre: "Fairy Tale",
    inLanguage: "en",
    isAccessibleForFree: true,
    publisher: {
      "@type": "Organization",
      name: "Map Fairy Tales",
      url: BASE,
    },
    locationCreated: {
      "@type": "Place",
      name: region,
    },
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ region?: string; id?: string }>;
}) {
  const { region, id } = await searchParams;

  let storyTitle = "";
  if (region && id) {
    try {
      await connectDB();
      const entry = await MapEntry.findOne(
        { mapId: region, "stories.id": id },
        { "stories.$": 1 },
      ).lean();
      const story = (entry?.stories as any[])?.[0];
      storyTitle = story?.story?.title ?? "";
    } catch {
      // silently fall back
    }
  }

  return (
    <>
      {region && (
        <StoryJsonLd
          title={storyTitle || `Fairy Tale from ${region}`}
          region={region}
        />
      )}
      <Suspense fallback={<Preloader />}>
        <Story />
      </Suspense>
    </>
  );
}
