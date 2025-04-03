import { createContext, useContext, useEffect, useState } from 'react';
import { useDashboard } from '../provider';

// Create context
const ActivityContext = createContext<any>(null);

// Activity provider component
export function ActivityProvider({ children }: { children: React.ReactNode }) {
  const { user } = useDashboard();
  const [activeUsers, setActiveUsers] = useState<string[]>([]);
  const [lastFetch, setLastFetch] = useState<number>(0);
  const FETCH_INTERVAL = 10000; // 10 seconds

  // Function to update user activity
  const updateActivity = async () => {
    try {
      if (!user || !user._id) {
        console.log('No user data available for activity update');
        return;
      }

      // Get user ID directly from JWT payload or user object
      const userId = user._id.toString();
      
      console.log('Attempting to update activity with userId:', userId);
      
      // Create the request body as a simple object
      const bodyData = { userId: userId };
      
      // Convert to JSON string
      const bodyContent = JSON.stringify(bodyData);
      
      console.log('Request body content:', bodyContent);
      console.log('Content length:', bodyContent.length);

      // Use XMLHttpRequest instead of fetch to rule out any fetch-related issues
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/activity/update', true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.setRequestHeader('Accept', 'application/json');
      xhr.withCredentials = true;
      
      xhr.onload = function() {
        if (xhr.status >= 200 && xhr.status < 300) {
          console.log('Activity update successful:', xhr.responseText);
        } else {
          console.error('Activity update failed:', xhr.status, xhr.responseText);
        }
      };
      
      xhr.onerror = function() {
        console.error('Activity update request failed');
      };
      
      // Send the request with the JSON body
      xhr.send(bodyContent);
    } catch (error) {
      console.error('Error in updateActivity:', error);
    }
  };

  const fetchActiveUsers = async () => {
    try {
      const now = Date.now();
      // Only fetch if enough time has passed since last fetch
      if (now - lastFetch < FETCH_INTERVAL) {
        return;
      }
      
      const response = await fetch('/api/activity/active', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch active users');
      }
      
      const data = await response.json();
      setActiveUsers(data.activeUsers || []);
      setLastFetch(now);
    } catch (error) {
      console.error('Error fetching active users:', error);
    }
  };

  useEffect(() => {
    if (!user?._id) {
      console.log('No user available for activity tracking');
      return;
    }

    console.log('Setting up activity tracking for user:', user._id);

    // Initial update
    updateActivity();

    // Set up intervals for periodic updates
    const activityInterval = setInterval(updateActivity, 30000); // Update every 30 seconds

    return () => {
      clearInterval(activityInterval);
    };
  }, [user]);

  const value = {
    activeUsers,
    isUserActive: (userId: string) => activeUsers.includes(userId)
  };

  return (
    <ActivityContext.Provider value={value}>
      {children}
    </ActivityContext.Provider>
  );
}

// Custom hook to use activity context
export const useActivity = () => {
  const context = useContext(ActivityContext);
  if (!context) {
    throw new Error('useActivity must be used within an ActivityProvider');
  }
  return context;
}; 