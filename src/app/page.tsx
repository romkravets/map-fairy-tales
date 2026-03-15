import type { Metadata } from "next";
import MapWorld from "@/components/MapWorld/MapWorld";

export const metadata: Metadata = {
  title: "World Map — Explore Fairy Tales by Country",
  description:
    "Click any country on the interactive world map to read AI-generated fairy tales and folk stories. Discover the mythology and legends of every culture.",
  openGraph: {
    title: "World Map | Map Fairy Tales",
    description:
      "Click any country on the interactive world map to read fairy tales and folk stories.",
  },
};

export default function Home() {
  return (
      <MapWorld />
  );
}
