import type { Metadata } from "next";
import { Suspense } from "react";
import dynamic from "next/dynamic";
import Preloader from "@/components/Preloader/Preloader";

const CountryStories = dynamic(
  () => import("@/components/CountryStories/CountryStories"),
  { ssr: false },
);

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ region?: string; id?: string }>;
}): Promise<Metadata> {
  const { region, id } = await searchParams;
  const country = region || id;

  const title = country
    ? `${country} — Fairy Tales & Stories`
    : "Country Stories";

  const description = country
    ? `Read and create AI-generated fairy tales and folk stories from ${country}. Generate random or custom stories, explore cultural legends and mythology. Create your own story for free — no AI credits required for manual stories.`
    : "Read and create AI-generated fairy tales and folk stories from any country. Generate custom stories, explore cultural legends, and share your own.";

  return {
    title,
    description,
    keywords: [
      country,
      "fairy tales",
      "folk stories",
      "AI story generator",
      "create story",
      "custom story",
      "generate fairy tale",
      "mythology",
      "legends",
      "cultural stories",
      country ? `${country} folklore` : undefined,
      country ? `${country} mythology` : undefined,
    ].filter(Boolean) as string[],
    openGraph: {
      title: country
        ? `${country} — Fairy Tales | Map Fairy Tales`
        : "Country Stories | Map Fairy Tales",
      description,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default function Page() {
  return (
    <Suspense fallback={<Preloader />}>
      <CountryStories />
    </Suspense>
  );
}
