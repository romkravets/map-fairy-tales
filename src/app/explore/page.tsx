import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Explore Stories",
  description:
    "Browse public fairy tales and folk stories from around the world. Sort by views, likes, or comments and discover stories from any country.",
  openGraph: {
    title: "Explore Stories | Map Fairy Tales",
    description:
      "Browse public fairy tales and folk stories from around the world.",
  },
};
import dynamic from "next/dynamic";
import Preloader from "@/components/Preloader/Preloader";

const ExploreFeed = dynamic(
  () => import("@/components/ExploreFeed/ExploreFeed"),
  { ssr: false },
);

export default function ExplorePage() {
  return (
    <Suspense fallback={<Preloader />}>
      <ExploreFeed />
    </Suspense>
  );
}
