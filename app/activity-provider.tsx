"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useDashboard } from './provider';

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

  // Send a ping to update user activity
  const updateActivity = async () => {
    if (!token || !user) return;

    try {
      await fetch('/api/activity/update', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId: user._id })
      });

      // console.log("send pring")
    } catch (error) {
      console.error('Error updating activity status:', error);
    }
  };

  // Fetch active users
  const fetchActiveUsers = async () => {
    if (!token) return;

    try {
      const response = await fetch('/api/activity/active', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      // console.log("send active")
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
      activityInterval = setInterval(() => {
        if (token && user) { // Inner check still useful
          updateActivity();
        }
      }, 5000); // Send ping every 5 seconds

      fetchInterval = setInterval(() => {
        if (token) { // Inner check for token is sufficient here
           fetchActiveUsers();
        }
      }, 5000); // Fetch active users every 5 seconds

      // Set up event listeners for user activity
      const handleActivity = () => {
        if (token && user) {
          updateActivity();
        }
      };

      window.addEventListener('mousemove', handleActivity);
      window.addEventListener('keydown', handleActivity);
      window.addEventListener('click', handleActivity);
      window.addEventListener('scroll', handleActivity);
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
      };
    } else {
      // For admin users, or if user data is not yet available,
      // still fetch active users once to populate the list initially if needed elsewhere.
      // But do not set up intervals or event listeners for activity updates.
      if (token) {
        fetchActiveUsers();
      }
    }
  }, [token, user]);

  // Fetch active users initially (this might be redundant now due to the above block, but kept for safety)
  // Consider removing if the logic in the main useEffect is sufficient.
  useEffect(() => {
    if (token && user) { // No role check here, let admins also fetch initial list if needed
      fetchActiveUsers();
    }
  }, [token, user]);

  return (
    <ActivityContext.Provider value={{ activeUsers, isUserActive }}>
      {children}
    </ActivityContext.Provider>
  );
}; 