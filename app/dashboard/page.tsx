'use client';

import { useEffect, useState, useRef } from 'react';
import { useDashboard } from '../provider';
import Loading from "../../components/ui/Loading";
import { useRouter, useSearchParams } from "next/navigation";
import { Layers } from 'lucide-react';

// Import components
import WelcomeCard from './components/WelcomeCard';
import AdminPanel from './components/AdminPanel';
import UserPanel from './components/UserPanel';
import CoursesList from './components/CoursesList';
import WeeklyStreakCard from './components/WeeklyStreakCard';
import AdminWelcomeCard from './components/AdminWelcomeCard';
import useSWRMutation from 'swr/mutation';

export default function DashboardPage() {
  const { token } = useDashboard();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPage = parseInt(searchParams.get('page') || '1');
  const [loading, setLoading] = useState<boolean>(true);
  const [courses, setCourses] = useState<any[]>([]);
  const [userData, setUserData] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchCategory, setSearchCategory] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('user');
  const [showAllCourses, setShowAllCourses] = useState<boolean>(true);
  const abortControllerRef = useRef<AbortController | null>(null);

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
  
  interface PaginationData {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  }

  // State management
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  
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

  // Check if user is admin
  const isAdmin = user?.role === 'admin';

  // Handle course deletion in parent component
  const handleCourseDeleted = (deletedCourseId: string) => {
    // First remove the course from the UI immediately
    setCourses(courses.filter(course => course._id !== deletedCourseId));
    
    // Then refresh the course list from the server to ensure we have the latest data
    // Use a small delay to let the server-side cache clearing take effect
    setTimeout(() => {
      fetchCourses(currentPage);
    }, 300);
  };

  // Fetch courses with pagination
  const fetchCourses = async (page = 1) => {
    // Early return and redirect if no token
    if (!token) {
      setLoading(false);
      router.push('/auth/login');
      return;
    }
    
    try {
      setLoading(true);
      
      // Build query parameters for pagination
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '3'); // Changed from 9 to 3 courses per page
      // Add cache busting parameter to avoid stale data
      params.append('_cb', Date.now().toString());
      
      const response = await fetch(`/api/course/get?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          // Add Cache-Control header to prevent browser caching
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        // Ensure we don't use cached data
        cache: 'no-store'
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
      console.log('Dashboard Data:', data, data.courses, 'API URL:', `/api/course/get?${params.toString()}`);
      setCourses(data.courses || []);
      setPagination(data.pagination || null);
      
      // Only set user info on first load to avoid unnecessary re-renders
      if (page === 1 || !user) {
        setUser(data.user);
      }
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
  
  // Handle page change
  const handlePageChange = (newPage: number) => {
    if (!pagination) return;
    if (newPage < 1 || newPage > pagination.totalPages) return;
    
    setCurrentPage(newPage);
    fetchCourses(newPage);
    
    // Scroll to the courses section
    const coursesElement = document.getElementById('courses-section');
    if (coursesElement) {
      coursesElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  console.log(user);
  // Fetch courses and user data from the API on initial load
  useEffect(() => {
    fetchCourses(1);
  }, [token, router]);

  // Prevent flash of content when redirecting
  if (!token) {
    return null;
  }

  if (loading && !user) {
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1); // Reset to first page on new search
  };

  const toggleCourseView = () => {
    setShowAllCourses(!showAllCourses);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--background-color)] text-[var(--text-color)] font-sans">
      {/* Background decorative elements */}
      <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-gradient-to-r from-[var(--purple-primary)] to-[#d946ef] opacity-10"></div>
      <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-gradient-to-r from-[#f59e0b] to-[#f87171] opacity-10"></div>
      <div className="absolute top-1/4 right-1/4 w-40 h-40 rounded-full bg-[#f59e0b] opacity-5"></div>
      
      {/* Debug Info */}
      {/* console.log('Dashboard Current User:', user) */}

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
            {/* Only show welcome card for non-admin users */}
            {!isAdmin ? (
              <>
                <div className="lg:col-span-2">
                  {/* Welcome Card Component */}
                  <WelcomeCard user={user} />
                </div>
                
                <div className="lg:col-span-1">
                  {/* Weekly Streaks Section */}
                  <WeeklyStreakCard userId={user?._id} token={token} />
                </div>
              </>
            ) : (
              <div className="lg:col-span-3">
                {/* Admin Welcome Card */}
                <AdminWelcomeCard user={user} />
              </div>
            )}
          </div>

          {/* Conditional Panel Rendering */}
          <div className="mb-8">
            {isAdmin ? (
              <AdminPanel token={token || ''} />
            ) : (
              <UserPanel user={user} />
            )}
          </div>

          {/* Courses List Component - Now with pagination */}
          <CoursesList 
            courses={courses} 
            token={token || ''} 
            onCourseDeleted={handleCourseDeleted}
            isAdmin={isAdmin}
            currentUserId={user?._id}
            pagination={pagination}
            onPageChange={handlePageChange}
            currentPage={currentPage}
          />
        </div>
      </div>
    </div>
  );
}