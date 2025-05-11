'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useTheme } from './provider/theme-provider';

export default function NotFound() {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen pt-[100px] text-[var(--text-color)]">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="bg-[var(--card-bg)] border-4 border-black rounded-lg p-6 shadow-[8px_8px_0px_0px_#000000]">
          <div className="flex flex-col items-center mb-6">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-16 w-16 text-[#FF6B6B] mb-3" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
              />
            </svg>
            <h1 className="text-3xl font-bold text-center mb-2">
              Page Not Found
            </h1>
            <p className="text-[var(--text-color)] text-center mb-6">
              Sorry, the page you are looking for does not exist or has been moved.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              href="/"
              className="w-full sm:w-auto px-6 py-3 bg-[#9D4EDD] text-white text-center font-bold rounded-md border-2 border-black shadow-[4px_4px_0px_0px_#000000] hover:shadow-[2px_2px_0px_0px_#000000] hover:-translate-y-1 transition-all duration-200"
              prefetch={false}
            >
              Return to Home
            </Link>
            <Link 
              href="/courses"
              className="w-full sm:w-auto px-6 py-3 bg-[#FFD700] text-black text-center font-bold rounded-md border-2 border-black shadow-[4px_4px_0px_0px_#000000] hover:shadow-[2px_2px_0px_0px_#000000] hover:-translate-y-1 transition-all duration-200"
              prefetch={false}
            >
              Browse Courses
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 