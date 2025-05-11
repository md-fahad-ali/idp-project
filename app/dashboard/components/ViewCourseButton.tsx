import { useRouter } from 'next/navigation';
import { Eye, Edit, ArrowRight, Loader2 } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';

interface ViewCourseButtonProps {
  title: string;
  category: string;
  isAdmin: boolean;
  courseId?: string;
  onStartCourse?: () => void;
}

export default function ViewCourseButton({ 
  title, 
  category, 
  isAdmin, 
  onStartCourse 
}: ViewCourseButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  
  // Generate URL based on user type
  const getUrl = () => {
    if (isAdmin) {
      return `/dashboard/update?title=${encodeURIComponent(title)}&category=${encodeURIComponent(category)}`;
    } else {
      return `/course/${encodeURIComponent(title.toLowerCase().replace(/\s+/g, '-'))}`;
    }
  };

  // For admin case, using router
  const handleAdminClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Use immediate location change for more reliable navigation
    const url = getUrl();
    window.location.href = url;
  };
  
  // For user case - optimize to make navigation faster
  const handleUserClick = (e: React.MouseEvent) => {
    if (onStartCourse) {
      // Use requestIdleCallback if available for better performance
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        // @ts-ignore - TS doesn't recognize requestIdleCallback by default
        window.requestIdleCallback(() => {
          onStartCourse();
        });
      } else {
        // Fallback to setTimeout with 0ms
        setTimeout(() => {
          onStartCourse();
        }, 0);
      }
    }
    
    // Use direct navigation for immediate response
    window.location.href = getUrl();
    e.preventDefault();
  };

  // Render either button or link based on user type
  if (isAdmin) {
    return (
      <button
        onClick={handleAdminClick}
        disabled={isLoading}
        className="w-full mt-auto p-2 text-white bg-[#4f46e5] border-2 border-[var(--card-border)] rounded-md shadow-[2px_2px_0px_0px_var(--card-border)] hover:translate-y-0.5 hover:shadow-[1px_1px_0px_0px_var(--card-border)] transition-all font-medium text-sm flex items-center justify-center group disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-[2px_2px_0px_0px_var(--card-border)]"
      >
        {isLoading ? (
          <Loader2 size={16} className="mr-2 animate-spin" />
        ) : (
          <Edit size={16} className="mr-2" />
        )}
        <span>{isLoading ? "Loading..." : "Edit Course"}</span>
      </button>
    );
  } else {
    return (
      <a
        href={getUrl()}
        onClick={handleUserClick}
        className="w-full mt-auto p-2 text-white bg-[var(--purple-primary)] border-2 border-[var(--card-border)] rounded-md shadow-[2px_2px_0px_0px_var(--card-border)] hover:translate-y-0.5 hover:shadow-[1px_1px_0px_0px_var(--card-border)] transition-all font-medium text-sm flex items-center justify-center group"
      >
        <Eye size={16} className="mr-2" />
        <span>View Course</span>
        <ArrowRight size={16} className="ml-2 transform transition-transform group-hover:translate-x-1" />
      </a>
    );
  }
}

// Create a LeaderboardButton for immediate navigation
export function LeaderboardButton({ 
  title,
  className = ""
}: { 
  title: string,
  className?: string
}) {
  const router = useRouter();

  // Generate leaderboard URL
  const getLeaderboardUrl = () => {
    const courseSlug = title.toLowerCase().replace(/\s+/g, '-');
    return `/course/${encodeURIComponent(courseSlug)}/leaderboard`;
  };
  
  // Handle navigation using Next.js router for faster navigation
  const handleLeaderboardClick = (e: React.MouseEvent) => {
    e.preventDefault();
    router.push(getLeaderboardUrl());
  };

  return (
    <Link
      href={getLeaderboardUrl()}
      onClick={handleLeaderboardClick}
      className={`px-3 py-2 bg-[#4CAF50] text-white font-bold rounded-md border-2 border-black shadow-[2px_2px_0px_0px_#000000] hover:shadow-[4px_4px_0px_0px_#000000] transition-all duration-200 text-sm ${className}`}
    >
      Leaderboard
    </Link>
  );
} 