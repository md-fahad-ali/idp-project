'use client';

import { useEffect, useState } from 'react';
import { useDashboard } from '../provider';
import Loading from "../../components/ui/Loading";

// Import components
import WelcomeCard from './components/WelcomeCard';
import AdminPanel from './components/AdminPanel';
import UserPanel from './components/UserPanel';
import CoursesList from './components/CoursesList';

export default function DashboardPage() {
  const { token } = useDashboard();

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
    createdAt: string;
    user?: {
      firstName?: string;
      lastName?: string;
      email?: string;
      _id: string;
    };
  }

  // State management
  const [courses, setCourses] = useState<ICourse[]>([]);
  interface IUser {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  }
  const [user, setUser] = useState<IUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Check if user is admin
  const isAdmin = user?.role === 'admin';

  // Handle course deletion in parent component
  const handleCourseDeleted = (deletedCourseId: string) => {
    setCourses(courses.filter(course => course._id !== deletedCourseId));
  };


  console.log(user);
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

        console.log(data);
        setUser(data.user);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching courses:', error);
        setLoading(false);
      }
    };

    fetchCourses();
    if (!token) {
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
        {/* Welcome Card Component */}
        <WelcomeCard user={user} />

        {/* Conditional Panel Rendering */}
        {isAdmin ? (
          <AdminPanel token={token || ''} />
        ) : (
          <UserPanel user={user} />
        )}

        {/* Courses List Component */}
        
          <CoursesList 
            courses={courses} 
            token={token || ''} 
            onCourseDeleted={handleCourseDeleted}
            isAdmin={isAdmin}
            currentUserId={user?._id}
        />

      </div>
    </div>
  );
}