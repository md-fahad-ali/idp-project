import React from 'react';
import { BarChart2, TrendingUp, Award } from 'lucide-react';

interface CourseCompletionRatio {
  title: string;
  totalEnrolled: number;
  totalCompleted: number;
  completionPercentage: number;
}

interface CourseStatsCardProps {
  token: string;
}

export default function CourseStatsCard({ token }: CourseStatsCardProps) {
  // Mock data for demonstration - this would be fetched from API
  const sampleData: CourseCompletionRatio[] = [
    { title: 'JavaScript Basics', totalEnrolled: 120, totalCompleted: 87, completionPercentage: 72.5 },
    { title: 'React Fundamentals', totalEnrolled: 95, totalCompleted: 65, completionPercentage: 68.4 },
    { title: 'Node.js Essentials', totalEnrolled: 80, totalCompleted: 48, completionPercentage: 60.0 },
    { title: 'MongoDB for Beginners', totalEnrolled: 65, totalCompleted: 32, completionPercentage: 49.2 },
  ];

  return (
    <div className="bg-[var(--card-bg)] border-4 border-[var(--card-border)] rounded-lg p-6 shadow-[8px_8px_0px_0px_var(--card-border)]">
      {/* s */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
        <div className="bg-[var(--card-bg-light)] border-2 border-[var(--card-border)] rounded-lg p-4">
          <div className="flex items-center mb-2">
            <TrendingUp size={16} className="mr-2 text-green-500" />
            <h4 className="text-sm font-semibold text-[var(--text-color)]">Highest Completion</h4>
          </div>
          <p className="text-lg font-bold text-[var(--text-color)]">JavaScript Basics</p>
          <p className="text-xs text-[var(--text-color)] opacity-70">72.5% completion rate</p>
        </div>
        
        <div className="bg-[var(--card-bg-light)] border-2 border-[var(--card-border)] rounded-lg p-4">
          <div className="flex items-center mb-2">
            <Award size={16} className="mr-2 text-yellow-500" />
            <h4 className="text-sm font-semibold text-[var(--text-color)]">Most Popular</h4>
          </div>
          <p className="text-lg font-bold text-[var(--text-color)]">JavaScript Basics</p>
          <p className="text-xs text-[var(--text-color)] opacity-70">120 total enrollments</p>
        </div>
        
        <div className="bg-[var(--card-bg-light)] border-2 border-[var(--card-border)] rounded-lg p-4">
          <div className="flex items-center mb-2">
            <BarChart2 size={16} className="mr-2 text-blue-500" />
            <h4 className="text-sm font-semibold text-[var(--text-color)]">Average Completion</h4>
          </div>
          <p className="text-lg font-bold text-[var(--text-color)]">62.5%</p>
          <p className="text-xs text-[var(--text-color)] opacity-70">Across all courses</p>
        </div>
      </div>
    </div>
  );
} 