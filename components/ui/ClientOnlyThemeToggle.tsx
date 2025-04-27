"use client";

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../app/provider/theme-provider';

export default function ClientOnlyThemeToggle() {
  const { theme, toggleTheme, mounted } = useTheme();
  
  if (!mounted) {
    // Return a placeholder to avoid layout shift
    return (
      <div className="w-10 h-10 rounded-full border-2 border-gray-300 bg-white"></div>
    );
  }
  
  return (
    <button
      onClick={toggleTheme}
      className="flex items-center justify-center w-10 h-10 rounded-full border-2 border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--text-color)] shadow-[2px_2px_0px_0px_var(--card-border)] hover:shadow-[3px_3px_0px_0px_var(--card-border)] transition-all"
      aria-label={theme === 'dark' ? "Switch to light mode" : "Switch to dark mode"}
    >
      {theme === 'dark' ? (
        <Sun size={20} className="text-[var(--text-color)]" />
      ) : (
        <Moon size={20} className="text-[var(--text-color)]" />
      )}
    </button>
  );
} 