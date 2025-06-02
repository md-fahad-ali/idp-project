"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { useDashboard } from './provider';
import { debounce } from 'lodash';

interface ActivityContextType {
  activeUsers: string[];
  isUserActive: (userId: string) => boolean;
}

const ActivityContext = createContext<ActivityContextType>({
  activeUsers: [],
  isUserActive: () => false,
});

export const useActivity = () => useContext(ActivityContext);

export const ActivityProvider = ({ children }: { children: ReactNode }) => {
  const { token, user } = useDashboard();
  const [activeUsers, setActiveUsers] = useState<string[]>([]);
  const lastUpdateRef = useRef<number>(0);
  const lastFetchRef = useRef<number>(0);
  
  // Increase intervals to reduce API calls
  const UPDATE_INTERVAL = 60000; // 1 minute (was 5 seconds)
  const FETCH_INTERVAL = 60000; // 1 minute (was 5 seconds)
  const USER_ACTIVITY_DEBOUNCE = 3000; // 3 seconds

  // Send a ping to update user activity - with timestamp check to avoid too frequent calls
  const updateActivity = async () => {
    if (!token || !user) return;
    
    const now = Date.now();
    if (now - lastUpdateRef.current < USER_ACTIVITY_DEBOUNCE) {
      return; // Skip if called too frequently
    }
    
    lastUpdateRef.current = now;
    
    try {
      await fetch('/api/activity/update', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId: user._id })
      });
    } catch (error) {
      console.error('Error updating activity status:', error);
    }
  };

  // Create a debounced version of updateActivity
  const debouncedUpdateActivity = useRef(
    debounce(updateActivity, USER_ACTIVITY_DEBOUNCE, { leading: true, trailing: true })
  ).current;

  // Fetch active users - with timestamp check
  const fetchActiveUsers = async () => {
    if (!token) return;
    
    const now = Date.now();
    if (now - lastFetchRef.current < FETCH_INTERVAL) {
      return; // Skip if called too frequently
    }
    
    lastFetchRef.current = now;

    try {
      const response = await fetch('/api/activity/active', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setActiveUsers(data.activeUsers || []);
      }
    } catch (error) {
      console.error('Error fetching active users:', error);
    }
  };

  // Check if a user is active
  const isUserActive = (userId: string): boolean => {
    return activeUsers.includes(userId);
  };

  useEffect(() => {
    // Update activity when component mounts
    if (token && user && user.role !== 'admin') {
      updateActivity();
    }

    // Set up interval to update activity and fetch active users
    // Only run these for non-admin users
    let activityInterval: NodeJS.Timeout | null = null;
    let fetchInterval: NodeJS.Timeout | null = null;

    if (user && user.role !== 'admin') {
      activityInterval = setInterval(updateActivity, UPDATE_INTERVAL);
      fetchInterval = setInterval(fetchActiveUsers, FETCH_INTERVAL);

      // Set up event listeners for user activity - using debounced function
      const handleActivity = () => {
        if (token && user) {
          debouncedUpdateActivity();
        }
      };

      window.addEventListener('mousemove', handleActivity, { passive: true });
      window.addEventListener('keydown', handleActivity, { passive: true });
      window.addEventListener('click', handleActivity, { passive: true });
      window.addEventListener('scroll', handleActivity, { passive: true });
      window.addEventListener('focus', handleActivity);

      // Clean up event listeners and intervals
      return () => {
        if (activityInterval) clearInterval(activityInterval);
        if (fetchInterval) clearInterval(fetchInterval);
        window.removeEventListener('mousemove', handleActivity);
        window.removeEventListener('keydown', handleActivity);
        window.removeEventListener('click', handleActivity);
        window.removeEventListener('scroll', handleActivity);
        window.removeEventListener('focus', handleActivity);
        debouncedUpdateActivity.cancel();
      };
    }
    
    // For admin users, or if user data is not yet available,
    // just fetch active users once initially
    if (token) {
      fetchActiveUsers();
    }
    
    return () => {};
  }, [token, user, debouncedUpdateActivity]);

  return (
    <ActivityContext.Provider value={{ activeUsers, isUserActive }}>
      {children}
    </ActivityContext.Provider>
  );
}; 