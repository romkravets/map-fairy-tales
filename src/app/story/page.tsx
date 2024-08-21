'use client'
import { Suspense } from 'react';
import dynamic from 'next/dynamic';

const Story = dynamic(() => import("@/components/Story/Story"), {
  ssr: false,
});

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Story />
    </Suspense>
  );
}
