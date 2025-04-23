import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, BookOpen, BarChart, PlusCircle, Crown, Eye } from 'lucide-react';
import Link from 'next/link';

interface AdminPanelProps {
  token: string;
}

export default function AdminPanel({ token }: AdminPanelProps) {
  const router = useRouter();
  const [showPopup, setShowPopup] = useState(false);
  const [courseTitle, setCourseTitle] = useState('');
  const [courseCategory, setCourseCategory] = useState('');

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Creating course:', { title: courseTitle, category: courseCategory });
    setCourseTitle('');
    setCourseCategory('');
    setShowPopup(false);
    router.push(`/dashboard/create?title=${courseTitle}&category=${courseCategory}`);
  };

  // Array of admin cards with exact design to match the course cards
  const adminCards = [
    {
      title: "Admin Dashboard",
      letter: "A",
      category: "Management",
      description: "Access the admin dashboard to manage site content and users.",
      stats: { value: "35%", label: "Completion" },
      lessonsCount: 4,
      date: "3/30/2025",
      author: "System Admin"
    },
    {
      title: "User Management",
      letter: "U",
      category: "Admin Tools",
      description: "Manage user accounts, roles and permissions across the platform.",
      stats: { value: "70%", label: "Completion" },
      lessonsCount: 3,
      date: "3/29/2025",
      author: "System Admin"
    },
    {
      title: "Analytics Tools",
      letter: "T",
      category: "Reporting",
      description: "Track course completion, user engagement and platform metrics.",
      stats: { value: "45%", label: "Completion" },
      lessonsCount: 5,
      date: "3/29/2025",
      author: "System Admin"
    }
  ];

  return (
    <div className="mb-8 w-full">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-[var(--purple-primary)] flex items-center justify-center rounded-full border-2 border-[var(--card-border)] shadow-[2px_2px_0px_0px_var(--card-border)] mr-3 text-white">
            <Crown size={18} className="text-white" />
          </div>
          <h2 className="text-xl font-bold text-[var(--text-color)] font-mono">Admin Panel</h2>
        </div>
        <button
          onClick={() => setShowPopup(true)}
          className="bg-[var(--purple-primary)] text-white text-sm border-2 border-[var(--card-border)] rounded-md py-2 px-3 shadow-[2px_2px_0px_0px_var(--card-border)] hover:translate-y-0.5 hover:shadow-[1px_1px_0px_0px_var(--card-border)] transition-all font-medium flex items-center"
        >
          <PlusCircle size={16} className="mr-1" /> Create Course
        </button>
      </div>
      
      

      {showPopup && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-[999] p-4">
          <div className="bg-[var(--card-bg)] border-4 border-[var(--card-border)] rounded-lg p-6 shadow-[var(--card-shadow)] w-full max-w-md animate-in fade-in slide-in-from-bottom-5 duration-300">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-[var(--purple-primary)] flex items-center justify-center rounded-full border-2 border-[var(--card-border)] shadow-[2px_2px_0px_0px_var(--card-border)] mr-3 text-white">
                <PlusCircle size={20} />
              </div>
              <h3 className="text-xl font-bold text-[var(--text-color)] font-mono">New Course</h3>
            </div>
            
            <form onSubmit={handleCreateCourse} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-color)] mb-1">Course Title</label>
                <input
                  type="text"
                  value={courseTitle}
                  onChange={(e) => setCourseTitle(e.target.value)}
                  required
                  className="mt-1 block w-full border-2 border-[var(--card-border)] outline-none bg-[var(--card-bg-light)] text-[var(--text-color)] rounded-md shadow-[2px_2px_0px_0px_var(--card-border)] p-3 focus:ring-2 focus:ring-[var(--purple-primary)]"
                  placeholder="e.g. Web Development Basics"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-color)] mb-1">Category</label>
                <input
                  type="text"
                  value={courseCategory}
                  onChange={(e) => setCourseCategory(e.target.value)}
                  required
                  className="mt-1 block w-full border-2 border-[var(--card-border)] outline-none bg-[var(--card-bg-light)] text-[var(--text-color)] rounded-md shadow-[2px_2px_0px_0px_var(--card-border)] p-3 focus:ring-2 focus:ring-[var(--purple-primary)]"
                  placeholder="e.g. Programming"
                />
              </div>
              <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-3 sm:space-y-0 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPopup(false)}
                  className="flex-1 p-2 text-[var(--text-color)] bg-[var(--card-bg)] border-2 border-[var(--card-border)] rounded-md shadow-[2px_2px_0px_0px_var(--card-border)] hover:translate-y-0.5 hover:shadow-[1px_1px_0px_0px_var(--card-border)] transition-all font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 p-2 text-white bg-[var(--purple-primary)] border-2 border-[var(--card-border)] rounded-md shadow-[2px_2px_0px_0px_var(--card-border)] hover:translate-y-0.5 hover:shadow-[1px_1px_0px_0px_var(--card-border)] transition-all font-medium text-sm"
                >
                  Create Course
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 