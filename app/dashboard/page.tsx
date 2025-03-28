'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDashboard } from '../provider';
import Loading from "../../components/ui/Loading";

export default function DashboardPage() {
  const { token } = useDashboard();
  const router = useRouter();

  interface ICourse{
    _id: string;
    title: string;
    category: string;
    description: string;
    lessons: {
      title: string;
      content: string;
      points: number;
    }[];
    createdAt:string;
  }
  // State management
  const [courses, setCourses] = useState<ICourse[]>([]);
  interface IUser {
    firstName: string;
    lastName: string;
  }
  const [user, setUser] = useState<IUser | null>(null);
  const [loading, setLoading] = useState(true);

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

  // Fetch courses and user data from the API
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await fetch('/api/course/get', {
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
        setCourses(data.courses);
        setUser(data.user);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching courses:', error);
        setLoading(false);
      }
    };

    if (token) {
      fetchCourses();
    } else {
      setLoading(false);
    }
  }, [token]);

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
          {user ? (
            <p className="text-[#E6F1FF] font-mono">Hello, {user.firstName} {user.lastName}!</p>
          ) : (
            <Loading />
          )}
        </div>

        {/* Admin Panel */}
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

        {/* Courses Section */}
        <div className="bg-[#294268] border-4 border-black rounded-lg p-6 mb-8 shadow-[8px_8px_0px_0px_#000000]">
          <h2 className="text-2xl font-bold text-[#E6F1FF] mb-4 font-mono">Your Courses</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map((course: ICourse) => (
              <div
                key={course._id}
                className="relative bg-[#2f235a] border-2 border-black rounded-md p-4 shadow-[4px_4px_0px_0px_#000000] hover:shadow-[6px_6px_0px_0px_#000000] transition-all"
              >
                <h3 className="text-xl font-bold text-[#E6F1FF] mb-2">{course.title}</h3>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold text-[#8892B0]">{course.category}</span>
                  <span className="text-xs bg-[#FFD700] text-black px-2 py-1 rounded-md">Lessons: {course.lessons.length}</span>
                </div>
                <p>{course.description.length > 100 ? `${course.description.slice(0, 100)}...` : course.description}</p>
                <p className="text-xs text-[#8892B0]">Created At: {new Date(course.createdAt).toLocaleDateString()}</p>
                <button
                  onClick={() => router.push(`/dashboard/course/update?title=${course.title}&category=${course.category}`)}
                  className="w-full mt-3 p-2 text-white bg-[#9D4EDD] border-2 border-black rounded-md shadow-[2px_2px_0px_0px_#000000] hover:bg-[#7A3CB8] transition-all duration-200 text-sm font-bold"
                >
                  View Course
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}