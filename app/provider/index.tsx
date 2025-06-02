import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
// @ts-ignore
import { DashboardContext } from './DashboardContext';
import { usePathname } from 'next/navigation';

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>("");
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();
  const pathname = usePathname();
  
  const initialized = useRef(false);
  const dataFetchedRef = useRef(false);

  // Check authentication status
  const checkAuth = useCallback(async () => {
    try {
      // Skip if already fetched
      if (dataFetchedRef.current) return;
      
      // Mark as fetched to avoid duplicate requests
      dataFetchedRef.current = true;
      
      const res = await fetch('/api/auth/me', {
        credentials: 'include',
        cache: 'no-store' // Important: don't cache auth requests
      });
      
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setToken(data.token);
      } else {
        console.log('User not authenticated');
        setUser(null);
        setToken(null);
        
        // Only redirect if on protected routes
        if (pathname !== '/login' && pathname !== '/register' && pathname !== '/') {
          router.push('/login');
        }
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  }, [router, pathname]);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    
    checkAuth();
  }, [checkAuth]);

  const value = {
    user,
    setUser,
    token,
    setToken,
    loading,
    checkAuth,
  };

  if (loading && !user) {
    // Return minimal provider with loading state while initial auth check completes
    return (
      <DashboardContext.Provider value={value}>
        {children}
      </DashboardContext.Provider>
    );
  }

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
} 