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
    if (token && user) {
      updateActivity();
    }

    // Set up interval to update activity and fetch active users
    const activityInterval = setInterval(() => {
      if (token && user) {
        updateActivity();
      }
    }, 5000); // Send ping every 10 seconds

    const fetchInterval = setInterval(fetchActiveUsers, 5000); // Fetch active users every 10 seconds

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
      clearInterval(activityInterval);
      clearInterval(fetchInterval);
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      window.removeEventListener('focus', handleActivity);
    };
  }, [token, user]);

  // Fetch active users initially
  useEffect(() => {
    if (token && user) {
      fetchActiveUsers();
    }
  }, [token, user]);

  return (
    <ActivityContext.Provider value={{ activeUsers, isUserActive }}>
      {children}
    </ActivityContext.Provider>
  );
}; 