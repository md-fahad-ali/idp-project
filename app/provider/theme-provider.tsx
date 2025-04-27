"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  mounted: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => {},
  mounted: false
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);
  
  // Initialize theme from localStorage on mount and set up listeners
  useEffect(() => {
    // Mark as mounted
    setMounted(true);
    
    try {
      // Check for system preference if no saved preference
      const savedTheme = localStorage.getItem('darkMode');
      
      if (savedTheme === null && window.matchMedia) {
        // If no saved preference, check system preference
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setTheme(systemPrefersDark ? 'dark' : 'light');
        localStorage.setItem('darkMode', systemPrefersDark ? 'true' : 'false');
      } else {
        // Use saved preference
        const isDark = savedTheme === 'true';
        setTheme(isDark ? 'dark' : 'light');
      }
      
      // Apply theme immediately
      applyTheme(savedTheme === 'true' ? 'dark' : 'light');
      
      // Listen for storage events (for multi-tab consistency)
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === 'darkMode') {
          const newTheme = e.newValue === 'true' ? 'dark' : 'light';
          setTheme(newTheme);
          applyTheme(newTheme);
        }
      };
      
      window.addEventListener('storage', handleStorageChange);
      return () => window.removeEventListener('storage', handleStorageChange);
    } catch (error) {
      // Handle any localStorage errors gracefully
      console.error('Error accessing localStorage:', error);
    }
  }, []);
  
  // Apply theme function (extracted to be reusable)
  const applyTheme = (newTheme: Theme) => {
    if (typeof document !== 'undefined') {
      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark-theme');
      } else {
        document.documentElement.classList.remove('dark-theme');
      }
    }
  };
  
  // Toggle theme function
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    
    try {
      // Save to localStorage
      localStorage.setItem('darkMode', newTheme === 'dark' ? 'true' : 'false');
    } catch (error) {
      console.error('Error accessing localStorage:', error);
    }
    
    // Apply theme class
    applyTheme(newTheme);
  };
  
  // Provide the mounted state so components can decide when to render
  const value = {
    theme,
    toggleTheme,
    mounted
  };
  
  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

// Custom hook to use the theme context
export function useTheme() {
  const context = useContext(ThemeContext);
  return context;
} 