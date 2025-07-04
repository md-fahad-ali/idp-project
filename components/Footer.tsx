"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

const Footer = () => {
  const pathname = usePathname();
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // Check if we're on the landing page - don't show footer there
  if (pathname === '/') return null;
  
  // Detect dark mode for proper styling
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isDark = document.documentElement.classList.contains('dark-theme');
      setIsDarkMode(isDark);
      
      // Listen for theme changes
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.attributeName === 'class') {
            const isDark = document.documentElement.classList.contains('dark-theme');
            setIsDarkMode(isDark);
          }
        });
      });
      
      observer.observe(document.documentElement, { attributes: true });
      return () => observer.disconnect();
    }
  }, []);

  return (
    <footer className={`relative pt-6 pb-4 border-t ${isDarkMode ? 'border-purple-800/30 bg-gradient-to-b from-[#1A0B2E] to-[#2E1A47]' : 'border-gray-200 bg-gradient-to-b from-[#f8f9fa] to-[#e9ecef]'} shadow-lg mt-10`}>
      {/* Gradient Background */}
      <div className={`absolute inset-0 opacity-20 ${isDarkMode ? 'bg-gradient-to-t from-[#00DDEB]/10 to-transparent' : 'bg-gradient-to-t from-[#9D4EDD]/5 to-transparent'}`}></div>

      {/* Container - keep footer content centered but wider */}
      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center md:text-left">
          {/* Brand Section */}
          <div>
            <h3 className="text-xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-[#00DDEB] to-[#FF00FF] tracking-wider">
              SKILL<span className={`${isDarkMode ? 'text-white' : 'text-gray-800'}`}>STREET</span>
            </h3>
            <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} text-sm`}>Level up your learning with interactive lessons!</p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className={`text-lg font-bold mb-2 ${isDarkMode ? 'text-[#00DDEB]' : 'text-[#9D4EDD]'}`}>Links</h3>
            <ul className="space-y-1 text-sm">
              <li>
                <Link href="/courses" className={`${isDarkMode ? 'text-white hover:text-[#00DDEB]' : 'text-gray-700 hover:text-[#9D4EDD]'} transition-colors`}>
                  Courses
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className={`${isDarkMode ? 'text-white hover:text-[#00DDEB]' : 'text-gray-700 hover:text-[#9D4EDD]'} transition-colors`}>
                  Dashboard
                </Link>
              </li>
              <li>
                <Link href="/about" className={`${isDarkMode ? 'text-white hover:text-[#00DDEB]' : 'text-gray-700 hover:text-[#9D4EDD]'} transition-colors`}>
                  About
                </Link>
              </li>
            </ul>
          </div>

          {/* Social Icons */}
          <div>
            <h3 className={`text-lg font-bold mb-2 ${isDarkMode ? 'text-[#FF00FF]' : 'text-[#9D4EDD]'}`}>Connect</h3>
            <div className="flex justify-center md:justify-start gap-4">
              <a href="https://twitter.com" className={`${isDarkMode ? 'text-white hover:text-[#00DDEB]' : 'text-gray-700 hover:text-[#9D4EDD]'} transition-colors`}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lucide lucide-twitter"
                >
                  <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path>
                </svg>
                <span className="sr-only">Twitter</span>
              </a>
              <a href="https://github.com" className={`${isDarkMode ? 'text-white hover:text-[#00DDEB]' : 'text-gray-700 hover:text-[#9D4EDD]'} transition-colors`}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lucide lucide-github"
                >
                  <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"></path>
                  <path d="M9 18c-4.51 2-5-2-7-2"></path>
                </svg>
                <span className="sr-only">Github</span>
              </a>
              <a href="https://instagram.com" className={`${isDarkMode ? 'text-white hover:text-[#00DDEB]' : 'text-gray-700 hover:text-[#9D4EDD]'} transition-colors`}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lucide lucide-instagram"
                >
                  <rect width="20" height="20" x="2" y="2" rx="5" ry="5"></rect>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                  <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"></line>
                </svg>
                <span className="sr-only">Instagram</span>
              </a>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className={`text-center pt-4 border-t ${isDarkMode ? 'border-purple-800/50' : 'border-gray-200'}`}>
          <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} text-xs`}>© {new Date().getFullYear()} SkillStreet. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 