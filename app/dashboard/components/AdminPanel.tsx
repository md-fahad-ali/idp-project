import { useState } from 'react';
import { useRouter } from 'next/navigation';

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

  return (
    <div className="bg-[#294268] border-4 border-black rounded-lg p-6 mb-8 shadow-[8px_8px_0px_0px_#000000]">
      <h2 className="text-2xl font-bold text-[#E6F1FF] mb-4 font-mono">Admin Panel</h2>
      <div className="mb-4">
        <h3 className="text-xl font-bold text-[#E6F1FF] mb-2">Create New Course</h3>
        <button
          onClick={() => setShowPopup(true)}
          className="w-full p-2 text-white bg-[#9D4EDD] border-2 border-black rounded-md shadow-[2px_2px_0px_0px_#000000] hover:bg-[#7A3CB8] transition-all duration-200 text-sm font-bold"
        >
          Create Course
        </button>
        {showPopup && (
          <div className="fixed inset-0 flex items-center justify-center bg-[#00000080] z-[999]">
            <div className="bg-[#294268] border-4 border-black rounded-lg p-6 shadow-[8px_8px_0px_0px_#000000] w-96">
              <h3 className="text-xl font-bold text-[#E6F1FF] mb-4 font-mono">New Course</h3>
              <form onSubmit={handleCreateCourse} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#8892B0]">Course Title</label>
                  <input
                    type="text"
                    value={courseTitle}
                    onChange={(e) => setCourseTitle(e.target.value)}
                    required
                    className="mt-1 block w-full border-2 border-black outline-none bg-[#2A3A4A] text-[#E6F1FF] rounded-md shadow-[2px_2px_0px_0px_#000000] p-3 focus:ring-2 focus:ring-[#9D4EDD]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#8892B0]">Category</label>
                  <input
                    type="text"
                    value={courseCategory}
                    onChange={(e) => setCourseCategory(e.target.value)}
                    required
                    className="mt-1 block w-full border-2 border-black outline-none bg-[#2A3A4A] text-[#E6F1FF] rounded-md shadow-[2px_2px_0px_0px_#000000] p-3 focus:ring-2 focus:ring-[#9D4EDD]"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full p-2 text-white bg-[#9D4EDD] border-2 border-black rounded-md shadow-[2px_2px_0px_0px_#000000] hover:bg-[#7A3CB8] transition-all duration-200 text-sm font-bold"
                >
                  Create Course
                </button>
              </form>
              <button
                onClick={() => setShowPopup(false)}
                className="mt-4 w-full p-2 text-white bg-[#666666] border-2 border-black rounded-md shadow-[2px_2px_0px_0px_#000000] hover:bg-[#555555] transition-all duration-200 text-sm font-bold"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 