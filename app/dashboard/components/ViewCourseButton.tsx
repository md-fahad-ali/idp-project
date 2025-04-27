import { useRouter } from 'next/navigation';
import { Eye, Edit, ArrowRight } from 'lucide-react';

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
  courseId,
  onStartCourse 
}: ViewCourseButtonProps) {
  const router = useRouter();

  const handleClick = () => {
    // Call onStartCourse if provided (to mark course as in-progress)
    if (!isAdmin && onStartCourse) {
      onStartCourse();
    }

    // For admins, go to update page
    if (isAdmin) {
      router.push(`/dashboard/update?title=${encodeURIComponent(title)}&category=${encodeURIComponent(category)}`);
    } 
    // For regular users, go to view course page
    else {
      router.push(`/course/${encodeURIComponent(title.toLowerCase().replace(/\s+/g, '-'))}`);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`w-full mt-auto p-2 text-white ${isAdmin ? 'bg-[#4f46e5]' : 'bg-[var(--purple-primary)]'} border-2 border-[var(--card-border)] rounded-md shadow-[2px_2px_0px_0px_var(--card-border)] hover:translate-y-0.5 hover:shadow-[1px_1px_0px_0px_var(--card-border)] transition-all font-medium text-sm flex items-center justify-center group`}
    >
      {isAdmin ? (
        <>
          <Edit size={16} className="mr-2" />
          <span>Edit Course</span>
        </>
      ) : (
        <>
          <Eye size={16} className="mr-2" />
          <span>View Course</span>
          <ArrowRight size={16} className="ml-2 transform transition-transform group-hover:translate-x-1" />
        </>
      )}
    </button>
  );
} 