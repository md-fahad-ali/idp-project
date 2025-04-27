"use client";

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// Import the ThemeToggle with no SSR to prevent hydration issues
const ClientOnlyThemeToggle = dynamic(
  () => import('./ClientOnlyThemeToggle'),
  { ssr: false }
);

export default function ThemeToggleWrapper() {
  return (
    <Suspense fallback={<div className="w-10 h-10 rounded-full bg-black/10 animate-pulse"></div>}>
      <ClientOnlyThemeToggle />
    </Suspense>
  );
} 