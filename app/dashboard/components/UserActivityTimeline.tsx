import React from 'react';
import { Clock, BookOpen, CheckCircle, UserPlus } from 'lucide-react';

interface ActivityItem {
  id: string;
  user: {
    name: string;
    avatar?: string;
  };
  action: 'joined' | 'enrolled' | 'completed';
  target: string;
  timestamp: string;
}

interface UserActivityTimelineProps {
  token: string;
}

export default function UserActivityTimeline({ token }: UserActivityTimelineProps) {
  // Mock data for demonstration - this would be fetched from API
  const activityData: ActivityItem[] = [
    {
      id: '1',
      user: { name: 'Ahmed Rahman' },
      action: 'completed',
      target: 'React Fundamentals',
      timestamp: '10 minutes ago'
    },
    {
      id: '2',
      user: { name: 'Sara Ahmed' },
      action: 'enrolled',
      target: 'MongoDB for Beginners',
      timestamp: '2 hours ago'
    },
    {
      id: '3',
      user: { name: 'Mahir Khan' },
      action: 'joined',
      target: 'the platform',
      timestamp: '5 hours ago'
    },
    {
      id: '4',
      user: { name: 'Tasnim Hossain' },
      action: 'enrolled',
      target: 'Node.js Essentials',
      timestamp: '1 day ago'
    },
    {
      id: '5',
      user: { name: 'Imran Ali' },
      action: 'completed',
      target: 'JavaScript Basics',
      timestamp: '2 days ago'
    }
  ];

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'joined':
        return <UserPlus size={16} className="text-blue-500" />;
      case 'enrolled':
        return <BookOpen size={16} className="text-purple-500" />;
      case 'completed':
        return <CheckCircle size={16} className="text-green-500" />;
      default:
        return <Clock size={16} className="text-gray-500" />;
    }
  };

  const getActionText = (action: string, target: string) => {
    switch (action) {
      case 'joined':
        return `joined ${target}`;
      case 'enrolled':
        return `enrolled in "${target}"`;
      case 'completed':
        return `completed "${target}"`;
      default:
        return `interacted with ${target}`;
    }
  };

  return (
    <div className="bg-[var(--card-bg)] border-4 border-[var(--card-border)] rounded-lg p-6 shadow-[8px_8px_0px_0px_var(--card-border)]">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-[var(--purple-primary)] flex items-center justify-center rounded-full border-2 border-[var(--card-border)] shadow-[2px_2px_0px_0px_var(--card-border)] mr-3 text-white">
            <Clock size={16} className="text-white" />
          </div>
          <h3 className="text-lg font-bold text-[var(--text-color)]">Recent Activity</h3>
        </div>
        <button className="text-xs bg-[var(--card-bg-light)] text-[var(--text-color)] border border-[var(--card-border)] rounded px-3 py-1 hover:bg-[var(--background-color)] transition-colors">
          View All
        </button>
      </div>
      
      <div className="space-y-4">
        {activityData.map((item) => (
          <div key={item.id} className="flex items-start border-b border-gray-700 pb-4 last:border-0">
            {/* Avatar or icon */}
            <div className="w-8 h-8 bg-[var(--background-color)] rounded-full flex items-center justify-center border border-[var(--card-border)] mr-3 overflow-hidden">
              {item.user.avatar ? (
                <img src={item.user.avatar} alt={item.user.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs font-bold">{item.user.name.charAt(0)}</span>
              )}
            </div>
            
            {/* Activity details */}
            <div className="flex-1">
              <p className="text-sm text-[var(--text-color)]">
                <span className="font-semibold">{item.user.name}</span>{' '}
                <span className="opacity-70">{getActionText(item.action, item.target)}</span>
              </p>
              <div className="flex items-center mt-1">
                <div className="mr-2">
                  {getActionIcon(item.action)}
                </div>
                <span className="text-xs text-[var(--text-color)] opacity-70">{item.timestamp}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 