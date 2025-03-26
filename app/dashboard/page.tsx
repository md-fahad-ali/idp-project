'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useDashboard } from '../provider';
import Loading from "@/components/ui/Loading";

// Mock data for courses and deadlines
const completedCourses = [
  { id: 1, title: 'JavaScript Fundamentals', progress: 100, category: 'Programming', completedDate: '2025-02-15' },
  { id: 2, title: 'React Hooks Mastery', progress: 100, category: 'Web Development', completedDate: '2025-03-01' },
  { id: 3, title: 'TypeScript for React', progress: 100, category: 'Programming', completedDate: '2025-03-10' },
];

const recommendedCourses = [
  { id: 4, title: 'Next.js Advanced Patterns', progress: 0, category: 'Web Development', duration: '4 hours' },
  { id: 5, title: 'Full Stack Authentication', progress: 0, category: 'Security', duration: '6 hours' },
];

const upcomingDeadlines = [
  { id: 1, title: 'JavaScript Quiz', dueDate: '2025-03-15' },
  { id: 2, title: 'React Project', dueDate: '2025-03-20' },
];

export default function DashboardPage() {
  const { token } = useDashboard();
  const router = useRouter();

  // Define user data interface
  interface UserData {
    user?: {
      firstName?: string;
      lastName?: string;
      email?: string;
      role?: string;
    };
  }

  // State management
  const [userData, setUserData] = useState<UserData | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [courseTitle, setCourseTitle] = useState('');
  const [courseCategory, setCourseCategory] = useState('');
  const [loading, setLoading] = useState(true);

  // Handle course creation
  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Creating course:', { title: courseTitle, category: courseCategory });
    setCourseTitle('');
    setCourseCategory('');
    setShowPopup(false);
    router.push(`/dashboard/create?title=${courseTitle}&category=${courseCategory}`);
  };

  // Fetch user data on mount
  const userDataMemo = useMemo(() => {
    if (!token) {
      console.log('No token available');
      return null;
    }

    const fetchApi = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('Profile data:', data);
        return data;
      } catch (error) {
        console.error('Error fetching profile:', error);
        return null;
      }
    };

    return fetchApi();
  }, [token]);

  useEffect(() => {
    if (userDataMemo) {
      userDataMemo.then((data) => {
        setUserData(data);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [userDataMemo]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen bg-[#6016a7] text-[#E6F1FF]"><Loading /></div>;
  }

  return (
    <div className="relative min-h-screen overflow-hidden pt-[100px] bg-[#6016a7] text-[#E6F1FF] font-sans">
      {/* Main Content */}
      <div className="relative z-10 container mx-auto px-4 pb-16">
        {/* Welcome Card */}
        <div className="bg-[#294268] border-4 border-black rounded-lg p-6 mb-8 shadow-[8px_8px_0px_0px_#000000]">
          <h1 className="text-3xl font-bold text-[#9D4EDD] mb-2 font-mono">
            Welcome to Your Dashboard
          </h1>
          
            {userData
              ? <p className="text-[#E6F1FF] font-mono">Hello, {userData.user?.firstName} {userData.user?.lastName || 'User'}!</p>
              : <Loading />}
        </div>

        {userData?.user?.role === 'admin' ? (
          /* Admin Panel */
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
            <div>
              <h3 className="text-xl font-bold text-[#E6F1FF] mb-2 font-mono">Launched Courses</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {completedCourses.map((course) => (
                  <div
                    key={course.id}
                    className="relative bg-[#2f235a] border-2 border-black rounded-md p-4 shadow-[4px_4px_0px_0px_#000000] hover:shadow-[6px_6px_0px_0px_#000000] transition-all"
                  >
                    <h3 className="text-xl font-bold text-[#E6F1FF] mb-2">{course.title}</h3>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-semibold text-[#8892B0]">{course.category}</span>
                      <span className="text-xs bg-[#FFD700] text-black px-2 py-1 rounded-md">Completed</span>
                    </div>
                    <p className="text-sm text-[#8892B0]">Completed on: {course.completedDate}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Student Dashboard */
          <div>
            {/* Progress Section */}
            <div className="bg-[#294268] border-4 border-black rounded-lg p-6 mb-8 shadow-[8px_8px_0px_0px_#000000]">
              <h2 className="text-2xl font-bold text-[#E6F1FF] mb-4 font-mono">Your Progress</h2>
              <div className="mb-4">
                <p className="text-lg font-bold text-[#E6F1FF]">XP: 1500 / 2000</p>
                <div className="w-full bg-[#2A3A4A] h-4 rounded-full overflow-hidden">
                  <div className="bg-[#9D4EDD] h-full" style={{ width: '75%' }}></div>
                </div>
              </div>
              <p className="text-sm text-[#8892B0]">Keep going! You’re almost at the next level.</p>
            </div>

            {/* Completed Courses Section */}
            <div className="bg-[#294268] border-4 border-black rounded-lg p-6 mb-8 shadow-[8px_8px_0px_0px_#000000]">
              <h2 className="text-2xl font-bold text-[#E6F1FF] mb-4 font-mono">Completed Courses</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {completedCourses.map((course) => (
                  <div
                    key={course.id}
                    className="relative bg-[#2f235a] border-2 border-black rounded-md p-4 shadow-[4px_4px_0px_0px_#000000] hover:shadow-[6px_6px_0px_0px_#000000] transition-all"
                  >
                    <div className="absolute top-2 right-2 bg-[#FFD700] text-black px-2 py-1 rounded-full text-xs font-bold">
                      Badge
                    </div>
                    <h3 className="text-xl font-bold text-[#E6F1FF] mb-2">{course.title}</h3>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-semibold text-[#8892B0]">{course.category}</span>
                      <span className="text-xs bg-[#FFD700] text-black px-2 py-1 rounded-md">Completed</span>
                    </div>
                    <p className="text-sm text-[#8892B0]">Completed on: {course.completedDate}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommended Courses Section (Carousel) */}
            <div className="bg-[#294268] border-4 border-black rounded-lg p-6 mb-8 shadow-[8px_8px_0px_0px_#000000]">
              <h2 className="text-2xl font-bold text-[#E6F1FF] mb-4 font-mono">Recommended Courses</h2>
              <div className="flex overflow-x-auto space-x-4 pb-4">
                {recommendedCourses.map((course) => (
                  <div
                    key={course.id}
                    className="flex-none w-64 bg-[#2f235a] border-2 border-black rounded-md p-4 shadow-[4px_4px_0px_0px_#000000] hover:shadow-[6px_6px_0px_0px_#000000] transition-all"
                  >
                    <h3 className="text-xl font-bold text-[#E6F1FF] mb-2">{course.title}</h3>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-semibold text-[#8892B0]">{course.category}</span>
                      <span className="text-xs bg-[#9D4EDD] text-white px-2 py-1 rounded-md">{course.duration}</span>
                    </div>
                    <button className="w-full mt-3 p-2 text-white bg-[#9D4EDD] border-2 border-black rounded-md shadow-[2px_2px_0px_0px_#000000] hover:bg-[#7A3CB8] transition-all duration-200 text-sm font-bold">
                      Start Course
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Upcoming Deadlines Section */}
            <div className="bg-[#294268] border-4 border-black rounded-lg p-6 shadow-[8px_8px_0px_0px_#000000]">
              <h2 className="text-2xl font-bold text-[#E6F1FF] mb-4 font-mono">Upcoming Deadlines</h2>
              <ul className="space-y-2">
                {upcomingDeadlines.map((deadline) => (
                  <li
                    key={deadline.id}
                    className="bg-[#2A3A4A] border-2 border-black p-3 rounded-md"
                  >
                    <p className="font-bold text-[#E6F1FF]">{deadline.title}</p>
                    <p className="text-sm text-[#8892B0]">Due: {deadline.dueDate}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}