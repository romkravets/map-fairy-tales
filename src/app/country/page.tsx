'use client'
import { Suspense } from 'react';
import dynamic from 'next/dynamic';

const CountryStories = dynamic(() => import("@/components/CountryStories/CountryStories"), {
  ssr: false,
});

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CountryStories />
    </Suspense>
  );
}
