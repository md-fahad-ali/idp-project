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
import WeeklyStreakCard from './components/WeeklyStreakCard';

export default function DashboardPage() {
  const { token } = useDashboard();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    points?: number;
    testsCompleted?: number;
    averageScore?: number;
    badges?: {
      brained?: number;
      warrior?: number;
      unbeatable?: number;
    };
  }
  const [user, setUser] = useState<IUser | null>(null);
  const [loading, setLoading] = useState(true);
  // Track login activity for weekly streaks
  

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
    return <div className="flex items-center justify-center min-h-screen bg-[var(--background-color)] text-[var(--text-color)]"><Loading /></div>;
  }

  // Handle logout
  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        // Clear local storage
        localStorage.removeItem('auth_timestamp');
        router.push('/auth/login');
      }
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--background-color)] text-[var(--text-color)] font-sans">
      {/* Background decorative elements */}
      <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-gradient-to-r from-[var(--purple-primary)] to-[#d946ef] opacity-10"></div>
      <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-gradient-to-r from-[#f59e0b] to-[#f87171] opacity-10"></div>
      <div className="absolute top-1/4 right-1/4 w-40 h-40 rounded-full bg-[#f59e0b] opacity-5"></div>
      
      {/* Main Content - full width with proper spacing for sidebar */}
      <div className="w-full pt-[100px] p-[10px] sm:p-[60px] bg-[var(--background-color)]">
        <div className="w-full mx-auto">
          {/* Top right user profile icon - Hide on mobile as it's in the navbar */}
          <div className="fixed top-6 right-6 z-20 hidden md:block">
            <div className="w-10 h-10 bg-[var(--purple-primary)] rounded-full flex items-center justify-center border-2 border-[var(--card-border)] shadow-[2px_2px_0px_0px_var(--card-border)]">
              <span className="text-white font-bold">
                {user?.firstName?.charAt(0) || 'U'}
              </span>
            </div>
          </div>
          
          {/* Top section - Welcome and Streaks side by side on larger screens */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2">
              {/* Welcome Card Component */}
              <WelcomeCard user={user} />
            </div>
            
            <div className="lg:col-span-1">
              {/* Weekly Streaks Section */}
              <WeeklyStreakCard userId={user?._id} token={token} />
            </div>
          </div>

          {/* Conditional Panel Rendering */}
          <div className="mb-8">
            {isAdmin ? (
              <AdminPanel token={token || ''} />
            ) : (
              <UserPanel user={user} />
            )}
          </div>

          {/* Courses List Component - Now with full width */}
          <CoursesList 
            courses={courses} 
            token={token || ''} 
            onCourseDeleted={handleCourseDeleted}
            isAdmin={isAdmin}
            currentUserId={user?._id}
          />
        </div>
      </div>
    </div>
  );
}