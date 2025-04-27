"use client";

import { ReactNode } from 'react';
import dynamic from 'next/dynamic';

// Import ThemeProvider with no SSR
const ThemeProviderNoSSR = dynamic(
  () => import('./theme-provider').then(mod => mod.ThemeProvider),
  { ssr: false }
);

export default function ThemeWrapper({ children }: { children: ReactNode }) {
  return <ThemeProviderNoSSR>{children}</ThemeProviderNoSSR>;
} 