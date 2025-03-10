// components/Navbar.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { name: 'Home', href: '/' },
    { name: 'About', href: '/about' },
    { name: 'Services', href: '/services' },
  ];

  return (
    <nav className="fixed w-full z-50 bg-transparent bg-blur-lg backdrop-blur-lg">
      {/* Desktop Menu */}
      <div className="hidden md:flex justify-between items-center max-w-7xl mx-auto px-4 py-4">
        <Link href="/" className="text-2xl font-bold text-white">
          Logo
        </Link>
        <div className="flex space-x-8 items-center">
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="text-white hover:text-gray-300 transition-colors duration-200"
            >
              {item.name}
            </Link>
          ))}
          {/* Login Button with Retro Design */}
          <Link href="/auth/login" className="relative">
            <button className="px-6 py-2 bg-transparent text-white text-sm font-bold rounded-full border-2 border-[#1a004f] hover:bg-[#1a004f] hover:text-white transition-all duration-200 shadow-[0_1px_4px_rgba(0,221,235,0.3)] hover:shadow-[0_6px_8px_rgba(0,221,235,0.5)]">
              Login
            </button>
          </Link>
        </div>
      </div>

      {/* Mobile Menu Button */}
      <div className="md:hidden flex justify-between items-center px-4 py-4">
        <Link href="/" className="text-2xl font-bold text-white">
          Logo
        </Link>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-white focus:outline-none"
          aria-label="Toggle menu"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            {isOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Menu with Circular Animation and Close Button */}
      <div
        className={`md:hidden fixed inset-0 ${
          isOpen ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
      >
        <div
          className={`absolute inset-0 bg-gray-900 bg-blur-lg backdrop-blur-lg transition-all duration-500 ease-in-out ${
            isOpen ? 'clip-circle-full' : 'clip-circle-small'
          }`}
        >
          <div className="relative h-full">
            {/* Close Button */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-white focus:outline-none"
              aria-label="Close menu"
            >
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            {/* Menu Items */}
            <div className="flex flex-col items-center justify-center h-full">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="text-white py-4 text-2xl font-medium hover:text-gray-300 transition-colors duration-200"
                  onClick={() => setIsOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
              {/* Login Button with Retro Design in Mobile */}
              <Link href="/auth/login" onClick={() => setIsOpen(false)}>
                <button className="px-6 py-2 mt-4 bg-gray-800 text-white text-lg font-bold rounded-full border-2 border-[#00DDEB] hover:bg-[#00DDEB] hover:text-gray-900 transition-all duration-200 shadow-[0_4px_6px_rgba(0,221,235,0.3)] hover:shadow-[0_6px_8px_rgba(0,221,235,0.5)]">
                  Login
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;