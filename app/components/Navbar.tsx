"use client";

import Link from 'next/link';
import { useState } from 'react';
import { useDashboard } from '../provider';

export default function Navbar() {
  const { user, logout } = useDashboard();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 bg-[#294268] border-b-4 border-black z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-[80px]">
          {/* Logo */}
          <Link href="/" className="text-2xl font-bold text-[#E6F1FF]">
            LearnHub
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center space-x-6">
            <Link
              href="/courses"
              className="text-[#E6F1FF] hover:text-[#9D4EDD] transition-colors"
            >
              Courses
            </Link>
            
            <Link
              href="/rankings"
              className="text-[#E6F1FF] hover:text-[#9D4EDD] transition-colors flex items-center"
            >
              <span className="mr-2">🏆</span>
              Rankings
            </Link>

            {user && (
              <div className="relative">
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="flex items-center space-x-2 text-[#E6F1FF] hover:text-[#9D4EDD] transition-colors"
                >
                  <img
                    src={`https://api.dicebear.com/7.x/pixel-art/svg?seed=${user._id}`}
                    alt="Avatar"
                    className="w-8 h-8 rounded-full border-2 border-black"
                  />
                  <span>{user.firstName}</span>
                </button>

                {isMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-[#294268] border-4 border-black rounded-lg shadow-[8px_8px_0px_0px_#000000] py-2">
                    <Link
                      href="/dashboard"
                      className="block px-4 py-2 text-[#E6F1FF] hover:bg-[#2f235a] transition-colors"
                    >
                      Dashboard
                    </Link>
                    {user.role === 'admin' && (
                      <Link
                        href="/admin"
                        className="block px-4 py-2 text-[#E6F1FF] hover:bg-[#2f235a] transition-colors"
                      >
                        Admin Panel
                      </Link>
                    )}
                    <button
                      onClick={logout}
                      className="block w-full text-left px-4 py-2 text-[#FF6B6B] hover:bg-[#2f235a] transition-colors"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            )}

            {!user && (
              <Link
                href="/login"
                className="px-4 py-2 bg-[#9D4EDD] text-white rounded-md border-2 border-black shadow-[4px_4px_0px_0px_#000000] hover:shadow-[6px_6px_0px_0px_#000000] transition-all duration-200"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
} 