import Link from 'next/link';
import { useDashboard } from '@/app/provider';

interface Lesson {
  title: string;
  content: string;
  points: number;
}

interface CourseCardProps {
  course: {
    _id: string;
    title: string;
    category: string;
    description: string;
    lessons: Lesson[];
    createdAt: string;
    user?: {
      firstName?: string;
      lastName?: string;
      email?: string;
      _id: string;
    };
  };
  userRole?: string;
}

export default function CourseCard({ course, userRole = 'user' }: CourseCardProps) {
  const { token } = useDashboard();
  const isAdmin = userRole === 'admin';
  
  // Function to convert title to URL-friendly format
  const formatTitleForUrl = (title: string) => {
    return encodeURIComponent(title.toLowerCase().replace(/\s+/g, '-'));
  };

  return (
    <div className="relative bg-[#294268] border-4 border-black rounded-md p-6 shadow-[6px_6px_0px_0px_#000000] hover:shadow-[8px_8px_0px_0px_#000000] transition-all flex flex-col h-full">
      {/* Course icon/badge */}
      <div className="absolute -top-4 -left-4 w-12 h-12 rounded-full bg-[#9D4EDD] border-2 border-black shadow-[2px_2px_0px_0px_#000000] flex items-center justify-center text-white font-bold text-xl">
        {course.title.charAt(0)}
      </div>
      
      <div className="pt-4">
        <h3 className="text-xl font-bold text-[#E6F1FF] mb-3">{course.title}</h3>
        
        {/* Tags layout */}
        <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
          <span className="inline-block text-sm font-medium px-3 py-1 bg-[#3A5075] text-white rounded-full border-2 border-black">
            {course.category}
          </span>
          <span className="inline-block text-sm bg-[#FFA41B] text-black px-3 py-1 rounded-full border-2 border-black">
            {course.lessons.length} {course.lessons.length === 1 ? 'Lesson' : 'Lessons'}
          </span>
        </div>
        
        <p className="mb-6 text-[#A8B2D1] line-clamp-3">
          {course.description}
        </p>
        
        <div className="flex flex-col mt-auto space-y-2 text-sm text-[#A8B2D1] mb-6">
          <p>Created: {new Date(course.createdAt).toLocaleDateString()}</p>
          {course.user && (
            <p className="font-medium">
              By: {course.user.firstName || ''} {course.user.lastName || ''}
            </p>
          )}
        </div>
        
        <div className="flex space-x-2">
          <Link 
            href={`/course/${formatTitleForUrl(course.title)}`}
            className="flex-1 text-center py-3 px-4 bg-[#9D4EDD] text-white font-bold rounded-md border-2 border-black shadow-[4px_4px_0px_0px_#000000] hover:shadow-[2px_2px_0px_0px_#000000] hover:translate-y-1 transition-all"
            prefetch={false}
          >
            View Course
          </Link>
          
          {isAdmin && (
            <Link 
              href={`/dashboard/update?title=${formatTitleForUrl(course.title)}&category=${encodeURIComponent(course.category)}`}
              className="flex-1 text-center py-3 px-4 bg-[#3A5075] text-white font-bold rounded-md border-2 border-black shadow-[4px_4px_0px_0px_#000000] hover:shadow-[2px_2px_0px_0px_#000000] hover:translate-y-1 transition-all"
              prefetch={false}
            >
              Edit
            </Link>
          )}
        </div>
      </div>
    </div>
  );
} 