import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useDashboard } from '../provider';

// Create context
const ActivityContext = createContext<any>(null);

// Activity provider component
export function ActivityProvider({ children }: { children: React.ReactNode }) {
  const { user } = useDashboard();
  const [activeUsers, setActiveUsers] = useState<string[]>([]);
  const [lastFetch, setLastFetch] = useState<number>(0);
  const [lastUpdate, setLastUpdate] = useState<number>(0);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isUpdatingRef = useRef<boolean>(false);
  
  // Increase intervals significantly to reduce API load
  const FETCH_INTERVAL = 60000; // 1 minute (was 10 seconds)
  const UPDATE_INTERVAL = 120000; // 2 minutes (was 30 seconds)
  const UPDATE_DEBOUNCE = 5000; // 5 second debounce for rapid navigation

  // Function to update user activity with debouncing
  const updateActivity = async () => {
    try {
      // Don't update if another update is in progress
      if (isUpdatingRef.current) {
        return;
      }
      
      const now = Date.now();
      // Only update if enough time has passed since last update
      if (now - lastUpdate < UPDATE_DEBOUNCE) {
        // Schedule a delayed update instead of immediate
        if (updateTimeoutRef.current) {
          clearTimeout(updateTimeoutRef.current);
        }
        
        updateTimeoutRef.current = setTimeout(() => {
          updateActivity();
        }, UPDATE_DEBOUNCE);
        
        return;
      }
      
      if (!user || !user._id) {
        console.log('No user data available for activity update');
        return;
      }

      // Set updating flag
      isUpdatingRef.current = true;
      setLastUpdate(now);
      
      // Get user ID directly from JWT payload or user object
      const userId = user._id.toString();
      
      // Use fetch with proper error handling
      const response = await fetch('/api/activity/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ userId }),
      });
      
      if (!response.ok) {
        throw new Error(`Activity update failed: ${response.status}`);
      }
      
      console.log('Activity updated successfully');
    } catch (error) {
      console.error('Error in updateActivity:', error);
    } finally {
      // Clear updating flag
      isUpdatingRef.current = false;
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

  // Setup activity tracking on page load/user change
  useEffect(() => {
    if (!user?._id) {
      console.log('No user available for activity tracking');
      return;
    }

    console.log('Setting up activity tracking for user:', user._id);

    // Initial update - only if user just logged in
    updateActivity();

    // Set up intervals for periodic updates with longer times
    const activityInterval = setInterval(updateActivity, UPDATE_INTERVAL);

    return () => {
      // Clear all resources
      clearInterval(activityInterval);
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [user?._id]); // Only re-run when user ID changes

  // Add listener for visibility changes to reduce background updates
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Update when tab becomes visible again
        updateActivity();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const value = {
    activeUsers,
    isUserActive: (userId: string) => activeUsers.includes(userId),
    fetchActiveUsers // Expose this method so it can be called manually when needed
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