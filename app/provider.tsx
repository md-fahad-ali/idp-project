'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { User } from './types';
import { useRouter } from 'next/navigation';
import initSocket from './services/socketService';
import { forceIdentify } from './services/socketService';

interface DashboardContextType {
  token?: string;
  user?: User;
  logout?: () => void;
  refreshUserData?: () => Promise<void>;
}

const DashboardContext = createContext<DashboardContextType>({});

export const useDashboard = () => useContext(DashboardContext);

export const useFetch = (url: string) => {
  const { token } = useDashboard();
  // Add cache-busting timestamp to prevent cached responses
  const timestamp = Date.now();
  const cacheBustedUrl = `${url}${url.includes('?') ? '&' : '?'}_t=${timestamp}`;
  
  return fetch(cacheBustedUrl, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });
};

export function DashboardProvider({
  children,
  initialToken,
}: {
  children: React.ReactNode;
  initialToken?: string;
}) {
  const router = useRouter();
  const [token, setToken] = useState<string | undefined>(initialToken);
  const [user, setUser] = useState<User | undefined>();
  
  // Store the current auth session ID to detect changes
  const authTimestampRef = useRef<string | null>(null);
  
  // Check for auth session changes on client
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Get the stored timestamp
      const storedTimestamp = localStorage.getItem('auth_timestamp');
      
      // If timestamp changed or doesn't exist but we have a token, refresh data
      if (storedTimestamp !== authTimestampRef.current && token) {
        authTimestampRef.current = storedTimestamp;
        refreshUserData();
      }
      
      // If no stored timestamp but we have token, something is wrong - clear state
      if (!storedTimestamp && token) {
        logout();
      }
    }
  }, [token]);

  const refreshUserData = useCallback(async () => {
    if (!token) return;
    
    try {
      console.log('Refreshing user data with token:', token);
      const timestamp = Date.now(); // Add a timestamp to prevent caching
      const response = await fetch(`/api/user/me?_t=${timestamp}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      if (response.ok) {
        const userData = await response.json();
        console.log('Refreshed user data:', userData);
        setUser(userData);
        
        // Identify the user to the socket server when we have their data
        if (userData && userData._id) {
          forceIdentify(userData._id);
        }
      } else if (response.status === 401) {
        // Token expired or invalid
        console.error('Unauthorized access, attempting to logout');
        logout();
      } else {
        console.error('Failed to refresh user data:', response.status);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  }, [token]);

  // Initial data load
  useEffect(() => {
    if (token) {
      refreshUserData();
    } else {
      setUser(undefined);
    }
  }, [token, refreshUserData]);

  // Initialize socket and identify user whenever user changes
  useEffect(() => {
    if (user && user._id) {
      // Store user in localStorage for auto-reconnection
      try {
        localStorage.setItem('user', JSON.stringify(user));
        console.log('User data stored in localStorage for socket reconnection');
      } catch (err) {
        console.error('Error storing user data in localStorage:', err);
      }
      
      // Initialize socket connection and identify user
      const socket = initSocket();
      if (socket) {
        // Force identify with retries
        let retryCount = 0;
        const maxRetries = 3;
        
        const identifyWithRetry = () => {
          console.log(`Identifying user to socket server (attempt ${retryCount + 1}/${maxRetries})`);
          forceIdentify(user._id);
          
          // Schedule a check to verify identification
          setTimeout(() => {
            if (socket.connected) {
              console.log('Socket is connected, sending identify event');
              socket.emit('identify', { userId: user._id });
            } else {
              console.warn('Socket is not connected, attempting to reconnect');
              socket.connect();
              
              // Retry identification if we haven't reached max retries
              if (retryCount < maxRetries - 1) {
                retryCount++;
                identifyWithRetry();
              }
            }
          }, 1000);
        };
        
        // Start the identification process
        identifyWithRetry();
      }
    }
  }, [user]);

  const logout = useCallback(async () => {
    try {
      // Call logout API
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
      });
      
      // Clear all client-side state
      setToken(undefined);
      setUser(undefined);
      
      // Clear localStorage
      localStorage.removeItem('auth_timestamp');
      localStorage.removeItem('user'); // Clear stored user data
      
      // Force clear cookies in the browser
      const clearCookie = (name: string) => {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      };
      clearCookie('access_token');
      clearCookie('refresh_token');
      
      // Redirect to login page and replace history
      router.replace('/auth/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, [router]);

  return (
    <DashboardContext.Provider value={{ 
      token, 
      user, 
      logout,
      refreshUserData 
    }}>
      {children}
    </DashboardContext.Provider>
  );
}
