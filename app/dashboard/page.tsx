'use client';

import { useEffect, useState } from 'react';
import { useDashboard } from '../provider';
import Loading from "../../components/ui/Loading";
import { useRouter } from "next/navigation";

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

  const router = useRouter();

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
    // Early return and redirect if no token
    if (!token) {
      setLoading(false);
      router.push('/auth/login');
      return;
    }

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
          console.log(`HTTP error! status: ${response.status}`);
          // Redirect to login for unauthorized access
          if (response.status === 401 || response.status === 403) {
            router.push('/auth/login');
            return;
          }
          setCourses([]);
          setLoading(false);
          return;
        }

        const data = await response.json();
        setCourses(data.courses || []);
        setUser(data.user);
      } catch (error) {
        console.error('Error fetching courses:', error);
        setCourses([]);
        // Redirect to login if there's an authentication error
        if (error instanceof Error && error.message.includes('unauthorized')) {
          router.push('/auth/login');
          return;
        }
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, [token, router]);

  // Prevent flash of content when redirecting
  if (!token) {
    return null;
  }

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