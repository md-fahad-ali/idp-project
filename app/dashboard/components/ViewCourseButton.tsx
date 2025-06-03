import { useRouter } from 'next/navigation';
import { Eye, Edit, ArrowRight, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import Link from 'next/link';

interface ViewCourseButtonProps {
  title: string;
  category: string;
  isAdmin: boolean;
  courseId?: string;
  onStartCourse?: () => void;
  isCreatedByCurrentUser?: boolean;
}

export default function ViewCourseButton({ 
  title, 
  category, 
  isAdmin, 
  onStartCourse,
  courseId,
  isCreatedByCurrentUser = false
}: ViewCourseButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  
  // Debug log
  console.log(`ViewCourseButton for ${title}: isAdmin=${isAdmin}, isCreatedByCurrentUser=${isCreatedByCurrentUser}`);
  
  // Generate URL based on user type and whether they created the course
  const getUrl = () => {
    // If admin, link to edit page - remove dependency on isCreatedByCurrentUser
    if (isAdmin) {
      return `/dashboard/update?title=${encodeURIComponent(title)}&category=${encodeURIComponent(category)}`;
    } else {
      // For regular users and admins viewing other courses
      return `/course/${encodeURIComponent(title.toLowerCase().replace(/\s+/g, '-'))}`;
    }
  };

  // Prefetch the course data when component mounts
  useEffect(() => {
    // Only prefetch in production to avoid development overhead
    if (process.env.NODE_ENV === 'production') {
      // Prefetch the course page - this will help speed up navigation
      const prefetchUrl = getUrl();
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = prefetchUrl;
      document.head.appendChild(link);
      
      // Also prime the router cache
      router.prefetch(prefetchUrl);
    }
  }, [title, category, isAdmin]);

  // For admin case, using router
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Call the onStartCourse callback if provided
    if (onStartCourse && !isAdmin) {
      onStartCourse();
    }
    
    // Use Next.js router.push for client-side navigation
    router.push(getUrl());
  };

  // Common class for both button types
  const buttonClass = "w-full mt-auto p-2 text-white border-2 border-[var(--card-border)] rounded-md shadow-[2px_2px_0px_0px_var(--card-border)] hover:translate-y-0.5 hover:shadow-[1px_1px_0px_0px_var(--card-border)] transition-all font-medium text-sm flex items-center justify-center group";

  // Determine if we should show admin edit button - now only based on isAdmin
  const showEditButton = isAdmin;
  
  return (
    <Link href={getUrl()} passHref prefetch>
      <button
        onClick={handleClick}
        disabled={isLoading}
        className={`${buttonClass} ${
          showEditButton 
            ? 'bg-[#4f46e5] disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-[2px_2px_0px_0px_var(--card-border)]' 
            : 'bg-[var(--purple-primary)]'
        }`}
      >
        {isLoading ? (
          <Loader2 size={16} className="mr-2 animate-spin" />
        ) : (
          showEditButton ? <Edit size={16} className="mr-2" /> : <Eye size={16} className="mr-2" />
        )}
        <span>
          {isLoading 
            ? "Loading..." 
            : showEditButton ? "Edit Course" : "View Course"
          }
        </span>
        {!isLoading && !showEditButton && (
          <ArrowRight size={16} className="ml-2 transform transition-transform group-hover:translate-x-1" />
        )}
      </button>
    </Link>
  );
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
  const [isLoading, setIsLoading] = useState(false);

  // Generate leaderboard URL
  const getLeaderboardUrl = () => {
    const courseSlug = title.toLowerCase().replace(/\s+/g, '-');
    return `/course/${encodeURIComponent(courseSlug)}/leaderboard`;
  };
  
  // Handle navigation using Next.js router for faster navigation
  const handleLeaderboardClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsLoading(true);
    router.push(getLeaderboardUrl());
  };

  return (
    <Link
      href={getLeaderboardUrl()}
      onClick={handleLeaderboardClick}
      className={`px-3 py-2 bg-[#4CAF50] text-white font-bold rounded-md border-2 border-black shadow-[2px_2px_0px_0px_#000000] hover:shadow-[4px_4px_0px_0px_#000000] transition-all duration-200 text-sm ${className} ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
    >
      {isLoading ? (
        <Loader2 size={14} className="inline mr-1 animate-spin" />
      ) : null}
      {isLoading ? "Loading..." : "Leaderboard"}
    </Link>
  );
} 