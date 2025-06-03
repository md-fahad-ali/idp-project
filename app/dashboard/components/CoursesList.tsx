import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, Clock, BookOpen, Award, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Check, CheckCircle, Trash2, Loader2 } from 'lucide-react';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import ViewCourseButton from './ViewCourseButton';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

interface PaginationData {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface ICourse {
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
  status?: 'completed' | 'in-progress'; // New property to track course status
  progress?: number; // Store actual progress
}

interface CoursesListProps {
  courses: ICourse[];
  token: string;
  onCourseDeleted: (deletedCourseId: string) => void;
  isAdmin: boolean;
  currentUserId?: string;
  pagination?: PaginationData | null;
  onPageChange?: (page: number) => void;
  currentPage?: number;
}

export default function CoursesList({ 
  courses, 
  token, 
  onCourseDeleted, 
  isAdmin,
  currentUserId,
  pagination = null,
  onPageChange,
  currentPage = 1
}: CoursesListProps) {
  const router = useRouter();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<ICourse | null>(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [showMore, setShowMore] = useState(false);
  const [courseStatuses, setCourseStatuses] = useState<Record<string, { 
    status: 'completed' | 'in-progress' | null, 
    progress: number 
  }>>({});
  const [isBrowseCatalogLoading, setIsBrowseCatalogLoading] = useState(false);

  // Get user progress from localStorage or API on component mount
  useEffect(() => {
    // Try to get course statuses from localStorage
    const savedStatuses = localStorage.getItem('course_statuses');
    if (savedStatuses) {
      setCourseStatuses(JSON.parse(savedStatuses));
    }

    // Also try to fetch from API if we have a token
    if (token) {
      fetchCourseProgress();
    }
  }, [token]);

  // Fetch course progress from API
  const fetchCourseProgress = async () => {
    try {
      const response = await fetch('/api/course/get-progress', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.progress && data.progress.completedCourses) {
          // Process the completed courses data
          const statusMap: Record<string, { status: 'completed' | 'in-progress' | null, progress: number }> = {};
          
          // Mark completed courses
          data.progress.completedCourses.forEach((completedCourse: any) => {
            const courseId = typeof completedCourse.course === 'object' 
              ? completedCourse.course._id 
              : completedCourse.course;
              
            statusMap[courseId] = { status: 'completed', progress: 100 };
          });
          
          // Update state with the combined statuses
          setCourseStatuses(prevStatuses => {
            const newStatuses = { ...prevStatuses, ...statusMap };
            // Save to localStorage for persistence
            localStorage.setItem('course_statuses', JSON.stringify(newStatuses));
            return newStatuses;
          });
        }
      }
    } catch (error) {
      console.error('Error fetching course progress:', error);
    }
  };

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    if (!pagination) return [];
    
    const totalPages = pagination.totalPages;
    const current = pagination.currentPage;
    
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    
    if (current <= 3) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }
    
    if (current >= totalPages - 2) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    
    return [1, '...', current - 1, current, current + 1, '...', totalPages];
  };
  
  // Handle page change
  const handlePageChange = (newPage: number) => {
    if (!pagination) return;
    if (newPage < 1 || newPage > pagination.totalPages) return;
    if (onPageChange) {
      onPageChange(newPage);
    }
  };

  // Filter courses based on active filter
  const filteredCourses = courses.filter(course => {
    const courseStatus = courseStatuses[course._id]?.status;
    
    if (activeFilter === 'all') return true;
    if (activeFilter === 'completed') return courseStatus === 'completed';
    if (activeFilter === 'in-progress') return courseStatus === 'in-progress';
    
    return true;
  });

  // Limit courses shown based on showMore state
  const displayedCourses = showMore ? filteredCourses : filteredCourses.slice(0, 3);

  // Get category color based on category name
  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Development': 'rgba(96, 165, 250, 0.3)', // blue
      'Design': 'rgba(248, 113, 113, 0.3)', // red
      'Business': 'rgba(251, 191, 36, 0.3)', // yellow
      'Marketing': 'rgba(74, 222, 128, 0.3)', // green
      'Photography': 'rgba(192, 132, 252, 0.3)', // purple
      'Music': 'rgba(244, 114, 182, 0.3)', // pink
      'Academic': 'rgba(156, 163, 175, 0.3)', // gray
      'Personal Development': 'rgba(45, 212, 191, 0.3)', // teal
      'database': 'rgba(96, 165, 250, 0.3)', // blue for database
    };
    
    return colors[category] || 'rgba(209, 213, 219, 0.3)'; // Default gray
  };

  // Function to handle starting a course (setting its status to "in-progress")
  const handleStartCourse = (courseId: string) => {
    if (courseStatuses[courseId]?.status !== "completed") {
      handleMarkInProgress(courseId);
    }
  };

  const handleBrowseCatalogClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsBrowseCatalogLoading(true);
    router.push('/courses');
  };

  // Handle delete course confirmation
  const handleDeleteConfirm = (course: ICourse) => {
    setCourseToDelete(course);
    setShowDeleteConfirm(true);
  };

  // Mark a course as in-progress
  const handleMarkInProgress = (courseId: string) => {
    // Skip complex state updates and just do a simple localStorage update
    // This will be much faster and won't delay navigation
    try {
      // Get existing statuses
      const existingData = localStorage.getItem('course_statuses');
      const statuses = existingData ? JSON.parse(existingData) : {};
      
      // Only update if not already completed
      if (!statuses[courseId] || statuses[courseId].status !== 'completed') {
        statuses[courseId] = { status: 'in-progress', progress: 30 };
        localStorage.setItem('course_statuses', JSON.stringify(statuses));
      }
    } catch (err) {
      // Ignore any errors - don't let this block navigation
      console.log("Error updating course status:", err);
    }
  };

  // Handle actual course deletion
  const handleDeleteCourse = async () => {
    if (!courseToDelete) {
      console.error("[DeleteCourse] No course selected for deletion.");
      return;
    }
    
    console.log(`[DeleteCourse] Attempting to delete course ID: ${courseToDelete._id}, Title: ${courseToDelete.title}`);
    console.log(`[DeleteCourse] Using token: ${token ? 'Token Present' : 'Token MISSING'}`);
    
    try {
      const response = await fetch(`/api/course/delete/${courseToDelete._id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include' // Keep this if you're relying on cookies for auth elsewhere or CORS needs it
      });

      console.log(`[DeleteCourse] Response status: ${response.status}`);
      const responseText = await response.text(); // Get response text for logging

      if (response.ok) {
        console.log("[DeleteCourse] Course deleted successfully from server. Response:", responseText);
        
        // Notify parent component about the deleted course
        onCourseDeleted(courseToDelete._id);
        
        // Also remove from local storage and component state
        setCourseStatuses(prev => {
          const updated = { ...prev };
          delete updated[courseToDelete._id!]; // Add non-null assertion if _id is guaranteed
          localStorage.setItem('course_statuses', JSON.stringify(updated));
          console.log("[DeleteCourse] Course status removed from local storage and state.");
          return updated;
        });

        // Clear ALL course related cache from localStorage and sessionStorage
        try {
          // Create slug-format of course title for cache keys
          const courseSlug = courseToDelete.title.toLowerCase().replace(/\s+/g, '-');
          
          // Clear localStorage items
          const localStorageKeys = Object.keys(localStorage);
          localStorageKeys.forEach(key => {
            // Clear course status
            if (key === 'course_statuses' || key.includes(courseToDelete._id) || key.includes(courseSlug)) {
              console.log(`[DeleteCourse] Clearing localStorage key: ${key}`);
              // For course_statuses, we already updated it above, don't remove completely
              if (key !== 'course_statuses') {
                localStorage.removeItem(key);
              }
            }
          });
          
          // Clear sessionStorage items
          const sessionStorageKeys = Object.keys(sessionStorage);
          sessionStorageKeys.forEach(key => {
            // Match any key related to courses, the specific course ID, or the course slug
            if (
              key.startsWith('course_') || 
              key.includes(courseToDelete._id) || 
              key.includes(courseSlug) || 
              key === 'courses' ||
              key.includes('dashboard_courses')
            ) {
              console.log(`[DeleteCourse] Clearing sessionStorage key: ${key}`);
              sessionStorage.removeItem(key);
            }
          });
          
          console.log("[DeleteCourse] All course-related cache cleared successfully");
        } catch (e) {
          console.error("[DeleteCourse] Error clearing cache:", e);
          // Continue even if cache clearing fails
        }

        setShowDeleteConfirm(false);
        setCourseToDelete(null);
        toast.success('Course deleted successfully!');

      } else {
        console.error(`[DeleteCourse] Failed to delete course. Status: ${response.status}. Response:`, responseText);
        let errorMessage = 'Failed to delete course.';
        try {
          const errorJson = JSON.parse(responseText);
          errorMessage = errorJson.error || errorJson.message || errorMessage;
        } catch (e) {
          // Response was not JSON or failed to parse
        }
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('[DeleteCourse] Exception during course deletion:', error);
      toast.error('An unexpected error occurred while deleting the course.');
      // Ensure states are reset even on exception
      setShowDeleteConfirm(false);
      setCourseToDelete(null);
    }
  };

  // Check if the user can edit/delete a course (admin or course creator)
  const canModifyCourse = (course: ICourse) => {
    return isAdmin || (currentUserId && course.user && course.user._id === currentUserId);
  };

  return (
    <div id="courses-section" className="bg-[var(--card-bg)] border-4 border-[var(--card-border)] rounded-lg p-4 md:p-6 mb-8 shadow-[var(--card-shadow)] card w-full">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6">
        <h2 className="text-xl font-bold text-[var(--text-color)] font-mono mb-4 md:mb-0">Your Courses</h2>
        
        {/* Show filter buttons only for regular users, not admins */}
        {!isAdmin && (
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={() => setActiveFilter('all')}
              className={`inline-flex items-center text-xs font-medium py-1.5 px-3 rounded-full border-2 transition-all ${
                activeFilter === 'all' 
                  ? 'bg-[var(--purple-primary)] text-white border-[var(--purple-primary)]' 
                  : 'bg-[var(--card-bg)] text-[var(--text-color)] border-[var(--card-border)] hover:bg-[var(--background-color)]'
              }`}
            >
              All
            </button>
            <button 
              onClick={() => setActiveFilter('in-progress')}
              className={`inline-flex items-center text-xs font-medium py-1.5 px-3 rounded-full border-2 transition-all ${
                activeFilter === 'in-progress' 
                  ? 'bg-[var(--purple-primary)] text-white border-[var(--purple-primary)]' 
                  : 'bg-[var(--card-bg)] text-[var(--text-color)] border-[var(--card-border)] hover:bg-[var(--background-color)]'
              }`}
            >
              <Clock size={12} className="mr-1" />
              In Progress
            </button>
            <button 
              onClick={() => setActiveFilter('completed')}
              className={`inline-flex items-center text-xs font-medium py-1.5 px-3 rounded-full border-2 transition-all ${
                activeFilter === 'completed' 
                  ? 'bg-[var(--purple-primary)] text-white border-[var(--purple-primary)]' 
                  : 'bg-[var(--card-bg)] text-[var(--text-color)] border-[var(--card-border)] hover:bg-[var(--background-color)]'
              }`}
            >
              <Award size={12} className="mr-1" />
              Completed
            </button>
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto">
        {displayedCourses && displayedCourses.length > 0 ? (
          displayedCourses.map((course: ICourse) => {
            const courseStatus = courseStatuses[course._id] || { status: null, progress: 0 };
            const progress = courseStatus.progress || 0;
            const isCompleted = courseStatus.status === 'completed';
            const isInProgress = courseStatus.status === 'in-progress';
            
            return (
              <div
                key={course._id}
                className="relative bg-[var(--card-bg)] border-2 border-[var(--card-border)] rounded-md p-4 shadow-[4px_4px_0px_0px_var(--card-border)] hover:shadow-[6px_6px_0px_0px_var(--card-border)] transition-all flex flex-col h-full group course-card"
              >
                
                
                {/* Circular letter icon */}
                <div className="absolute -top-3 -left-3 w-10 h-10 rounded-full bg-[var(--purple-primary)] border-2 border-[var(--card-border)] shadow-[2px_2px_0px_0px_var(--card-border)] flex items-center justify-center text-white font-bold">
                  {course.title.charAt(0)}
                </div>
                
                <div className="pt-2 flex flex-col h-full">
                  <h3 className="text-lg font-bold text-[var(--text-color)] mb-2">{course.title}</h3>
                  <div className="flex justify-between items-center mb-2">
                    <span 
                      className="text-xs font-medium px-2 py-1 rounded-full border border-[var(--card-border)]"
                      style={{ backgroundColor: getCategoryColor(course.category.toLowerCase()) }}
                    >
                      {course.category}
                    </span>
                    <span className="text-xs bg-[var(--yellow-light)] text-[var(--text-color)] px-2 py-1 rounded-full border border-[var(--card-border)]">
                      {course.lessons.length} {course.lessons.length === 1 ? 'Lesson' : 'Lessons'}
                    </span>
                  </div>
                  <p className="mb-3 text-[var(--text-color)] text-sm line-clamp-2">{course.description}</p>
                  
                  {/* Only show progress bar for regular users, not admins */}
                  {!isAdmin && (
                    <div className="mb-3">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-[var(--text-color)]">Progress</span>
                        <span className="text-[var(--text-color)]">{progress}%</span>
                      </div>
                      <div className="w-full bg-[#333333] h-2 rounded-full">
                        <div 
                          className={`h-full rounded-full ${
                            isCompleted ? 'bg-green-500' : 'bg-[var(--purple-primary)]'
                          }`} 
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex flex-col mb-4 text-xs text-[var(--text-color)]">
                    <p>Created: {new Date(course.createdAt).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'numeric', 
                      day: 'numeric'
                    }).replace(/\//g, '/')}</p>
                    {course.user && (
                      <p className="text-xs font-medium">
                        By: {course.user.firstName || ''} {course.user.lastName || ''}
                      </p>
                    )}
                  </div>
                  
                  <div className="mt-auto">
                    {/* View/Edit Course button based on user role and course creator */}
                    <ViewCourseButton 
                      title={course.title}
                      category={course.category}
                      isAdmin={isAdmin}
                      courseId={course._id}
                      onStartCourse={() => handleStartCourse(course._id)}
                      isCreatedByCurrentUser={true}
                    />
                  </div>
                  
                  {/* Delete button - only show if user can modify the course */}
                  {canModifyCourse(course) && (
                    <button
                      onClick={() => handleDeleteConfirm(course)}
                      className="absolute top-2 right-2 w-8 h-8 flex items-center text-black justify-center bg-[#fee2e2] border-2 border-[var(--card-border)] rounded-md shadow-[2px_2px_0px_0px_var(--card-border)] hover:bg-[#fecaca] transition-all duration-200 group-hover:opacity-100 opacity-70"
                    >
                      <X size={18} strokeWidth={2} className="text-[#ef4444]" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        ) : pagination && pagination.totalItems > 0 ? (
          <div className="col-span-1 md:col-span-2 lg:col-span-3 text-center bg-[var(--card-bg)] rounded-lg p-8 border border-[var(--card-border)]">
            <p className="text-lg text-[var(--text-color)] font-medium mb-2">No courses on this page</p>
            <p className="text-sm text-[var(--text-color)] mb-4">Try going back to a previous page</p>
            <button
              onClick={() => handlePageChange(1)}
              className="inline-flex items-center text-sm font-medium bg-[var(--purple-primary)] text-white py-2 px-4 rounded-md border-2 border-[var(--card-border)] shadow-[2px_2px_0px_0px_var(--card-border)] hover:shadow-[3px_3px_0px_0px_var(--card-border)] hover:-translate-y-0.5 transition-all cursor-pointer"
            >
              Go to first page
            </button>
          </div>
        ) : (
          <div className="col-span-1 md:col-span-2 lg:col-span-3 text-center bg-[var(--card-bg)] rounded-lg p-8 border border-[var(--card-border)]">
            <div className="text-5xl mb-3">📚</div>
            <p className="text-lg text-[var(--text-color)] font-medium mb-2">No courses available</p>
            <p className="text-sm text-[var(--text-color)] mb-4">Start your learning journey by exploring available courses</p>
            <Link href="/courses" onClick={handleBrowseCatalogClick}>
              <span
                className={`inline-flex items-center text-sm font-medium bg-[var(--purple-primary)] text-white py-2 px-4 rounded-md border-2 border-[var(--card-border)] shadow-[2px_2px_0px_0px_var(--card-border)] hover:shadow-[3px_3px_0px_0px_var(--card-border)] hover:-translate-y-0.5 transition-all cursor-pointer ${isBrowseCatalogLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {isBrowseCatalogLoading ? (
                  <>
                    <Loader2 size={16} className="mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Browse Catalog'
                )}
              </span>
            </Link>
          </div>
        )}
      </div>

      {/* Pagination - only show if pagination data is available */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-center mt-10">
          <div className="flex items-center bg-[var(--card-bg)] border-2 border-[var(--card-border)] rounded-lg shadow-[4px_4px_0px_0px_var(--card-border)] p-1">
            {/* Previous page button */}
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={!pagination.hasPrevPage}
              className={`p-2 mx-1 rounded-md ${
                pagination.hasPrevPage 
                  ? 'text-[var(--text-color)] hover:bg-[var(--purple-light)] transition-all' 
                  : 'text-gray-400 cursor-not-allowed'
              }`}
              aria-label="Previous page"
            >
              <ChevronLeft size={20} />
            </button>
            
            {/* Page numbers */}
            <div className="flex items-center">
              {getPageNumbers().map((pageNum, idx) => (
                pageNum === '...' ? (
                  <span key={`ellipsis-${idx}`} className="px-3 py-1 mx-1 text-[var(--text-color)]">
                    ...
                  </span>
                ) : (
                  <button
                    key={`page-${pageNum}`}
                    onClick={() => handlePageChange(pageNum as number)}
                    className={`px-3 py-1 mx-1 rounded-md font-medium ${
                      currentPage === pageNum 
                        ? 'bg-[var(--purple-primary)] text-white' 
                        : 'text-[var(--text-color)] hover:bg-[var(--purple-light)] transition-all'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              ))}
            </div>
            
            {/* Next page button */}
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={!pagination.hasNextPage}
              className={`p-2 mx-1 rounded-md ${
                pagination.hasNextPage 
                  ? 'text-[var(--text-color)] hover:bg-[var(--purple-light)] transition-all' 
                  : 'text-gray-400 cursor-not-allowed'
              }`}
              aria-label="Next page"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      )}
      
      {/* Pagination info */}
      {pagination && pagination.totalPages > 0 && (
        <div className="text-center mt-4 text-sm text-[var(--text-color)]">
          Showing {pagination.totalItems > 0 ? (pagination.currentPage - 1) * pagination.itemsPerPage + 1 : 0} to {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} of {pagination.totalItems} courses
        </div>
      )}

      {/* Show More/Less Button - Now only used for filtered results, not pagination */}
      {activeFilter !== 'all' && filteredCourses.length > 3 && (
        <div className="flex justify-center mt-6">
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="inline-flex items-center text-sm font-medium bg-[var(--card-bg)] text-[var(--text-color)] py-2 px-4 rounded-md border-2 border-[var(--card-border)] shadow-[2px_2px_0px_0px_var(--card-border)] hover:shadow-[3px_3px_0px_0px_var(--card-border)] hover:-translate-y-0.5 transition-all"
          >
            <ChevronUp size={16} className="mr-1" />
            Back to Top
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && courseToDelete && (
        <DeleteConfirmationModal
          course={courseToDelete}
          onCancel={() => setShowDeleteConfirm(false)}
          onConfirm={handleDeleteCourse}
        />
      )}
    </div>
  );
} 