import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Eye, User, Book, Layers, Calendar, PlusCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import CourseStatsCard from './CourseStatsCard';
import UserActivityTimeline from './UserActivityTimeline';

interface AdminPanelProps {
  token: string;
}

interface CourseWithEnrollment {
  _id: string;
  title: string;
  category: string;
  enrollmentCount: number;
  completionCount: number;
}

interface StatsData {
  totalUsers: number;
  totalCourses: number;
  totalEnrollments: number;
  activeUsersThisWeek: number;
  courseStats: CourseWithEnrollment[];
  totalPages?: number;
}

export default function AdminPanel({ token }: AdminPanelProps) {
  const router = useRouter();
  const [showPopup, setShowPopup] = useState(false);
  const [courseTitle, setCourseTitle] = useState('');
  const [courseCategory, setCourseCategory] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const coursesPerPage = 3;
  
  // Analytics data
  const [statsData, setStatsData] = useState<StatsData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch analytics data with pagination
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Fetch data from the API with pagination parameters
        const response = await fetch(`/api/course/stats?page=${currentPage}&limit=${coursesPerPage}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch stats: ${response.status}`);
        }
        
        const data = await response.json();
        setStatsData({
          totalUsers: data.totalUsers || 0,
          totalCourses: data.totalCourses || 0,
          totalEnrollments: data.totalEnrollments || 0,
          activeUsersThisWeek: data.activeUsersThisWeek || 0,
          courseStats: data.courseStats || [],
          totalPages: data.totalPages || 1
        });
        setTotalPages(data.totalPages || 1);
        
      } catch (error) {
        console.error('Error fetching admin analytics:', error);
        setError('Failed to load analytics data');
        toast.error('Failed to load analytics data');
        
        // Set fallback mock data to avoid UI errors
        setStatsData({
          totalUsers: 0,
          totalCourses: 0,
          totalEnrollments: 0,
          activeUsersThisWeek: 0,
          courseStats: [],
          totalPages: 1
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAnalytics();
  }, [token, currentPage, coursesPerPage]);

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreating) return; // Prevent double submission
    router.push(`/dashboard/create?title=${encodeURIComponent(courseTitle.trim())}&category=${encodeURIComponent(courseCategory.trim())}`);
  };
  
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  return (
    <div className="mb-8 w-full">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-[var(--purple-primary)] flex items-center justify-center rounded-full border-2 border-[var(--card-border)] shadow-[2px_2px_0px_0px_var(--card-border)] mr-3 text-white">
            <Layers size={18} className="text-white" />
          </div>
          <h2 className="text-xl font-bold text-[var(--text-color)] font-mono">Course Statistics</h2>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center py-10">
          <div className="animate-pulse text-[var(--text-color)]">Loading analytics data...</div>
        </div>
      ) : error ? (
        <div className="flex justify-center items-center py-10">
          <div className="text-red-500">{error}</div>
        </div>
      ) : (
        <>
          {/* Analytics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Total Users */}
            <div className="bg-[var(--card-bg)] border-2 border-[var(--card-border)] rounded-lg p-4 shadow-[4px_4px_0px_0px_var(--card-border)] hover:shadow-[6px_6px_0px_0px_var(--card-border)] transition-all">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-[var(--text-color)]">Total Users</h3>
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <User size={16} className="text-blue-500" />
                </div>
              </div>
              <p className="mt-2 text-2xl font-bold text-[var(--text-color)]">{statsData?.totalUsers || 0}</p>
              <p className="text-xs text-[var(--text-color)]">Registered platform users</p>
            </div>
            
            {/* Total Courses */}
            <div className="bg-[var(--card-bg)] border-2 border-[var(--card-border)] rounded-lg p-4 shadow-[4px_4px_0px_0px_var(--card-border)] hover:shadow-[6px_6px_0px_0px_var(--card-border)] transition-all">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-[var(--text-color)]">Total Courses</h3>
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <Book size={16} className="text-purple-500" />
                </div>
              </div>
              <p className="mt-2 text-2xl font-bold text-[var(--text-color)]">{statsData?.totalCourses || 0}</p>
              <p className="text-xs text-[var(--text-color)]">Available courses</p>
            </div>
            
            {/* Total Enrollments */}
            <div className="bg-[var(--card-bg)] border-2 border-[var(--card-border)] rounded-lg p-4 shadow-[4px_4px_0px_0px_var(--card-border)] hover:shadow-[6px_6px_0px_0px_var(--card-border)] transition-all">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-[var(--text-color)]">Total Enrollments</h3>
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <Layers size={16} className="text-green-500" />
                </div>
              </div>
              <p className="mt-2 text-2xl font-bold text-[var(--text-color)]">{statsData?.totalEnrollments || 0}</p>
              <p className="text-xs text-[var(--text-color)]">Course enrollments</p>
            </div>
            
            {/* Active This Week */}
            <div className="bg-[var(--card-bg)] border-2 border-[var(--card-border)] rounded-lg p-4 shadow-[4px_4px_0px_0px_var(--card-border)] hover:shadow-[6px_6px_0px_0px_var(--card-border)] transition-all">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-[var(--text-color)]">Active This Week</h3>
                <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                  <Calendar size={16} className="text-yellow-500" />
                </div>
              </div>
              <p className="mt-2 text-2xl font-bold text-[var(--text-color)]">{statsData?.activeUsersThisWeek || 0}</p>
              <p className="text-xs text-[var(--text-color)]">Active users in last 7 days</p>
            </div>
          </div>
          
          
          
          {/* Course Enrollment Table */}
          <div className="bg-[var(--card-bg)] border-4 border-[var(--card-border)] rounded-lg p-6 shadow-[8px_8px_0px_0px_var(--card-border)] mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-[var(--text-color)]">Course Enrollments & Completions</h3>
              <div className="text-sm text-[var(--text-color)] opacity-70">
                Showing your courses
              </div>
            </div>
            
            {statsData?.courseStats && statsData.courseStats.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-[var(--card-border)]">
                        <th className="text-left py-2 text-sm font-medium text-[var(--text-color)]">Course Title</th>
                        <th className="text-left py-2 text-sm font-medium text-[var(--text-color)]">Category</th>
                        <th className="text-center py-2 text-sm font-medium text-[var(--text-color)]">Enrolled Users</th>
                        <th className="text-center py-2 text-sm font-medium text-[var(--text-color)]">Completions</th>
                        <th className="text-right py-2 text-sm font-medium text-[var(--text-color)]">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statsData.courseStats.map((course) => (
                        <tr key={course._id} className="border-b border-gray-700">
                          <td className="py-3 text-[var(--text-color)]">{course.title}</td>
                          <td className="py-3 text-[var(--text-color)]">{course.category}</td>
                          <td className="py-3 text-center">
                            <span className="bg-blue-900 text-blue-300 text-xs py-1 px-2 rounded-full">
                              {course.enrollmentCount} users
                            </span>
                          </td>
                          <td className="py-3 text-center">
                            <span className="bg-green-900 text-green-300 text-xs py-1 px-2 rounded-full">
                              {course.completionCount} completions
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            <Link href={`/course/${course.title.toLowerCase().replace(/\s+/g, '-')}`}>
                              <button className="text-xs bg-[var(--card-bg)] text-[var(--text-color)] border border-[var(--card-border)] rounded px-2 py-1 hover:bg-[var(--card-bg-light)] transition-colors">
                                <Eye size={14} className="inline mr-1" /> View
                              </button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* Pagination Controls */}
                <div className="flex justify-between items-center mt-6">
                  <div className="text-sm text-[var(--text-color)] opacity-70">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className={`p-2 rounded-md border border-[var(--card-border)] ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[var(--card-bg-light)] cursor-pointer'}`}
                    >
                      <ChevronLeft size={16} className="text-[var(--text-color)]" />
                    </button>
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      const pageNum = i + 1;
                      // If we have many pages, show ellipsis
                      if (totalPages > 5 && pageNum === 4) {
                        return (
                          <span key="ellipsis" className="p-2 text-[var(--text-color)]">...</span>
                        );
                      }
                      // If we have many pages, show last page instead of 5th
                      if (totalPages > 5 && pageNum === 5) {
                        return (
                          <button
                            key={totalPages}
                            onClick={() => handlePageChange(totalPages)}
                            className={`px-3 py-1 rounded-md border border-[var(--card-border)] ${totalPages === currentPage ? 'bg-[var(--purple-primary)] text-white' : 'text-[var(--text-color)] hover:bg-[var(--card-bg-light)]'}`}
                          >
                            {totalPages}
                          </button>
                        );
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`px-3 py-1 rounded-md border border-[var(--card-border)] ${pageNum === currentPage ? 'bg-[var(--purple-primary)] text-white' : 'text-[var(--text-color)] hover:bg-[var(--card-bg-light)]'}`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className={`p-2 rounded-md border border-[var(--card-border)] ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[var(--card-bg-light)] cursor-pointer'}`}
                    >
                      <ChevronRight size={16} className="text-[var(--text-color)]" />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-10 text-[var(--text-color)]">
                No course data available. Create your first course to see statistics here.
              </div>
            )}
          </div>
        </>
      )}

      {/* Create Course Modal */}
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
                  disabled={isCreating}
                  className={`flex-1 p-2 text-white bg-[var(--purple-primary)] border-2 border-[var(--card-border)] rounded-md shadow-[2px_2px_0px_0px_var(--card-border)] hover:translate-y-0.5 hover:shadow-[1px_1px_0px_0px_var(--card-border)] transition-all font-medium text-sm ${isCreating ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {isCreating ? 'Creating...' : 'Create Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 