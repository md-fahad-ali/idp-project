"use client";

import { useTheme } from '../../app/provider/theme-provider';
import { Moon, Sun } from 'lucide-react';

interface CompactThemeToggleProps {
  className?: string;
}

export default function CompactThemeToggle({ className = '' }: CompactThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDarkMode = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      className={`flex items-center justify-center w-8 h-8 rounded-full bg-[var(--card-bg)] text-[var(--text-color)] border border-[var(--card-border)] transition-colors ${className}`}
      aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDarkMode ? (
        <Sun size={14} className="text-[var(--text-color)]" />
      ) : (
        <Moon size={14} className="text-[var(--text-color)]" />
      )}
    </button>
  );
} 