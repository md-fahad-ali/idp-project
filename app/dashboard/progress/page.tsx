'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDashboard } from '../../provider';

export default function ProgressPage() {
  const router = useRouter();
  const { token } = useDashboard();

  useEffect(() => {
    // Redirect to main dashboard page
    // This is a temporary solution; in the future you may want to implement
    // a dedicated progress tracking page
    router.push('/dashboard');
  }, [router]);

  return null; // No UI needed as we're redirecting
} 