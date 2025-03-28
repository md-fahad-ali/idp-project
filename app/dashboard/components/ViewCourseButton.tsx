import { useRouter } from 'next/navigation';

interface ViewCourseButtonProps {
  title: string;
  category: string;
  isAdmin: boolean;
}

export default function ViewCourseButton({ title, category, isAdmin }: ViewCourseButtonProps) {
  const router = useRouter();

  const handleClick = () => {
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
      className="w-full mt-auto p-2 text-white bg-[#9D4EDD] border-2 border-black rounded-md shadow-[2px_2px_0px_0px_#000000] hover:bg-[#7A3CB8] transition-all duration-200 text-sm font-bold"
    >
      {isAdmin ? "Edit Course" : "View Course"}
    </button>
  );
} 