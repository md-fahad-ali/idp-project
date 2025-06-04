'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Global error:', error);
  }, [error]);

  return (

        <div className="min-h-screen flex items-center justify-center bg-[#2f235a] text-white p-4">
          <div className="bg-[#1d1433] border-4 border-black rounded-lg p-8 shadow-[8px_8px_0px_0px_#000000] max-w-md w-full">
            <div className="flex flex-col items-center mb-6">
              <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mb-4">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-10 w-10 text-white" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M6 18L18 6M6 6l12 12" 
                  />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-center mb-2">
                Something went seriously wrong
              </h1>
              <p className="text-gray-300 text-center mb-6">
                We're sorry, but there was a critical error with the application.
              </p>
            </div>
            <button
              onClick={reset}
              className="w-full px-6 py-3 bg-[#9D4EDD] text-white text-center font-bold rounded-md border-2 border-black shadow-[4px_4px_0px_0px_#000000] hover:shadow-[2px_2px_0px_0px_#000000] hover:-translate-y-1 transition-all duration-200"
            >
              Try again
            </button>
          </div>
        </div>
    
  );
} 