"use client";
import { Suspense } from "react";
import dynamic from "next/dynamic";
import Preloader from "@/components/Preloader/Preloader";

const CountryStories = dynamic(
  () => import("@/components/CountryStories/CountryStories"),
  {
    ssr: false,
  },
);

export default function Page() {
  return (
    <Suspense fallback={<Preloader />}>
      <CountryStories />
    </Suspense>
  );
}
