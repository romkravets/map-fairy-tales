'use client'
import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import Preloader from "@/components/Preloader/Preloader";
import BtnBack from "@/components/BtnBack/BtnBack";

const Story = dynamic(() => import("@/components/Story/Story"), {
  ssr: false,
});

export default function Page() {
  return (
    <Suspense fallback={<Preloader/>}>
      <Story />
    </Suspense>
  );
}
