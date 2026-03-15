import { Suspense } from "react";
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
