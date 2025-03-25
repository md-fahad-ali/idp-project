'use client';

import { useEffect, useState } from 'react';
import { useDashboard } from './providers';


// Mock data for courses
const completedCourses = [
  { id: 1, title: 'JavaScript Fundamentals', progress: 100, category: 'Programming', completedDate: '2025-02-15' },
  { id: 2, title: 'React Hooks Mastery', progress: 100, category: 'Web Development', completedDate: '2025-03-01' },
  { id: 3, title: 'TypeScript for React', progress: 100, category: 'Programming', completedDate: '2025-03-10' },
];

const recommendedCourses = [
  { id: 4, title: 'Next.js Advanced Patterns', progress: 0, category: 'Web Development', duration: '4 hours' },
  { id: 5, title: 'Full Stack Authentication', progress: 0, category: 'Security', duration: '6 hours' },
];

export default function DashboardPage() {
  const { token } = useDashboard();
  
  interface UserData {
    user?: {
      firstName?: string;
      lastName?: string;
    };
  }

  const [userData, setUserData] = useState<UserData | null>(null);

  useEffect(() => {
    console.log('Access Token:', token);
    const fetchApi = async () => {
      try {
        if (!token) {
          console.error('No token available');
          return;
        }
        const response = await fetch('/api/auth/me', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('Profile data:', data);
        setUserData(data);
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };

    fetchApi(); 

    
  }, [token]);

  return (
    <div className={`relative min-h-screen overflow-hidden pt-[100px]`}>
     
     
      
      {/* Main Content */}
      <div className={`relative z-10 container mx-auto px-4 pb-16`}>
        {/* Welcome Card */}
        <div className="bg-[#cbb9dd] border-4 border-black rounded-lg p-6 mb-8 shadow-[8px_8px_0px_0px_black]">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#0298a3] to-[#a302a3] bg-clip-text text-transparent mb-2">
            Welcome to Your Dashboard
          </h1>
          <p className="text-gray-800 font-mono">
            {userData ? `Hello, ${userData.user?.firstName} ${userData.user?.lastName || 'User'}!` : 'Loading user data...'}
          </p>
          
        </div>

        {/* Completed Courses Section */}
        <div className="bg-[#cbb9dd] border-4 border-black rounded-lg p-6 mb-8 shadow-[8px_8px_0px_0px_black]">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 font-mono">
            Completed Courses
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {completedCourses.map((course) => (
              <div key={course.id} className="bg-white border-2 border-black rounded-md p-4 shadow-[4px_4px_0px_0px_black]">
                <h3 className="text-xl font-bold text-gray-800 mb-2">{course.title}</h3>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold">{course.category}</span>
                  <span className="text-xs bg-[#FF00FF] text-white px-2 py-1 rounded-md">Completed</span>
                </div>
                <p className="text-sm text-gray-600">Completed on: {course.completedDate}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recommended Courses Section */}
        <div className="bg-[#cbb9dd] border-4 border-black rounded-lg p-6 shadow-[8px_8px_0px_0px_black]">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 font-mono">
            Recommended Courses
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recommendedCourses.map((course) => (
              <div key={course.id} className="bg-white border-2 border-black rounded-md p-4 shadow-[4px_4px_0px_0px_black]">
                <h3 className="text-xl font-bold text-gray-800 mb-2">{course.title}</h3>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold">{course.category}</span>
                  <span className="text-xs bg-[#0047eb] text-white px-2 py-1 rounded-md">{course.duration}</span>
                </div>
                <button className="w-full mt-3 p-2 text-white bg-[#FF00FF] border-2 border-black rounded-md shadow-[2px_2px_0px_0px_black] hover:bg-[#D100D1] transition-all duration-200 text-sm font-bold">
                  Start Course
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
