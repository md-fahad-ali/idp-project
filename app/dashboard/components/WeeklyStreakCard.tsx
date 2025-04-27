'use client';

import { useEffect, useState } from 'react';

interface WeeklyStreakCardProps {
  userId?: string;
  token?: string;
}

const WeeklyStreakCard: React.FC<WeeklyStreakCardProps> = ({ userId, token }) => {
  const [streakData, setStreakData] = useState<boolean[]>([false, false, false, false, false, false, false]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentStreak, setCurrentStreak] = useState(0);

  // Fetch user activity data
  useEffect(() => {
    const fetchActivityData = async () => {
      if (!userId || !token) return;

      try {
        setIsLoading(true);
        const response = await fetch(`/api/activity/user-activity`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          console.log("Activity data ",data);
          // Process activity data to determine weekly streaks
          const today = new Date();
          
          // Create an array for the past 7 days - each array position represents a day of the week
          // Initialize with the days in order: Sun, Mon, Tue, Wed, Thu, Fri, Sat
          const last7Days = Array(7).fill(false);
          
          // Process login dates
          if (data && data.activities && Array.isArray(data.activities)) {
            // Create a Map of dates (formatted as YYYY-MM-DD) for quick lookup
            const activityDatesCount = new Map<string, number>();
            
            data.activities.forEach((activity: any) => {
              let date: string;
              
              if (typeof activity.date === 'string') {
                // If date is already formatted as YYYY-MM-DD
                date = activity.date;
              } else if (activity.timestamp) {
                // If we need to format from a timestamp
                const activityDate = new Date(activity.timestamp);
                date = `${activityDate.getFullYear()}-${String(activityDate.getMonth() + 1).padStart(2, '0')}-${String(activityDate.getDate()).padStart(2, '0')}`;
              } else {
                return; // Skip invalid data
              }
              
              // Increment count for this date
              activityDatesCount.set(date, (activityDatesCount.get(date) || 0) + 1);
            });
            
            // Fill in the streak array based on the actual calendar days
            for (let i = 0; i < 7; i++) {
              const checkDate = new Date();
              checkDate.setDate(today.getDate() - (6 - i)); // Calculate correct day (0=Sunday to 6=Saturday)
              const dateStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
              
              // Mark as true if this date exists in the activity set
              last7Days[i] = activityDatesCount.has(dateStr);
            }
          }
          
          // Calculate current streak starting from the most recent day
          let streak = 0;
          for (let i = 6; i >= 0; i--) {
            if (last7Days[i]) {
              streak++;
            } else if (streak > 0) {
              break;
            }
          }
          
          setStreakData(last7Days);
          setCurrentStreak(streak);
        } else {
          console.error('Failed to fetch activity data');
          // Default to sample data on error
          setStreakData([false, false, false, false, false, false, false]);
        }
      } catch (error) {
        console.error('Error fetching activity data:', error);
        // Default to sample data on error
        setStreakData([false, false, false, false, false, false, false]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchActivityData();
  }, [userId, token]);

  // Map streak data to days of the week
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="bg-[var(--card-bg)] border-4 border-[var(--card-border)] rounded-lg p-4 md:p-6 h-full shadow-[var(--card-shadow)] relative overflow-hidden card">
      <div className="absolute -bottom-10 -left-10 w-20 h-20 rounded-full bg-[var(--pink-light)] opacity-30"></div>
      <div className="relative z-10">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-[var(--text-color)] font-mono">Weekly Streaks</h2>
          {currentStreak > 0 ? (
            <span className="text-xs bg-[var(--pink-light)] text-[var(--text-color)] font-medium p-1 px-2 rounded-full">
              🔥 {currentStreak} day streak!
            </span>
          ) : (
            <span className="text-xs bg-[var(--card-bg)] text-[var(--text-color)] font-medium p-1 px-2 rounded-full border border-[var(--card-border)]">
              Start your streak!
            </span>
          )}
        </div>
        <div className="flex justify-between">
          {streakData.map((isActive, i) => (
            <div key={i} className="flex flex-col items-center">
              <div className={`w-8 h-8 flex items-center justify-center mb-1 ${isActive ? '' : 'opacity-50'}`}>
                <span className="text-xl">{isActive ? '🔥' : '⚪'}</span>
              </div>
              <span className="text-xs font-medium">{days[i]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WeeklyStreakCard; 