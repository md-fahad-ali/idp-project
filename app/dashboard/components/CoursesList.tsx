import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, Clock, BookOpen, Award, ChevronDown, ChevronUp, Check, CheckCircle, Trash2 } from 'lucide-react';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import ViewCourseButton from './ViewCourseButton';

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
}

export default function CoursesList({ 
  courses, 
  token, 
  onCourseDeleted, 
  isAdmin,
  currentUserId
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

  // Handle delete course confirmation
  const handleDeleteConfirm = (course: ICourse) => {
    setCourseToDelete(course);
    setShowDeleteConfirm(true);
  };

  // Handle marking a course as completed
  const handleCompleteCourse = async (courseId: string) => {
    try {
      // Call API to mark course as completed
      const response = await fetch(`/api/course/complete/${courseId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        // Update local state
        setCourseStatuses(prev => {
          const updated = { 
            ...prev, 
            [courseId]: { status: 'completed' as const, progress: 100 } 
          };
          localStorage.setItem('course_statuses', JSON.stringify(updated));
          return updated;
        });
      } else {
        const errorData = await response.json();
        if (errorData.error === "Course already completed") {
          // Course is already completed, just update UI
          setCourseStatuses(prev => {
            const updated = { 
              ...prev, 
              [courseId]: { status: 'completed' as const, progress: 100 } 
            };
            localStorage.setItem('course_statuses', JSON.stringify(updated));
            return updated;
          });
        } else {
          alert('Failed to complete course: ' + errorData.error);
        }
      }
    } catch (error) {
      console.error('Error completing course:', error);
      alert('Failed to mark course as completed');
    }
  };

  // Mark a course as in-progress
  const handleMarkInProgress = (courseId: string) => {
    setCourseStatuses(prev => {
      const updated = { 
        ...prev, 
        [courseId]: { status: 'in-progress' as const, progress: 30 } 
      };
      localStorage.setItem('course_statuses', JSON.stringify(updated));
      return updated;
    });
  };

  // Handle actual course deletion
  const handleDeleteCourse = async () => {
    if (!courseToDelete) return;
    
    try {
      const response = await fetch(`/api/course/delete/${courseToDelete._id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Notify parent component about the deleted course
      onCourseDeleted(courseToDelete._id);
      setShowDeleteConfirm(false);
      setCourseToDelete(null);
      
      // Also remove from local storage
      setCourseStatuses(prev => {
        const updated = { ...prev };
        delete updated[courseToDelete._id];
        localStorage.setItem('course_statuses', JSON.stringify(updated));
        return updated;
      });
    } catch (error) {
      console.error('Error deleting course:', error);
      alert('Failed to delete course. Please try again.');
    }
  };

  // Check if the user can edit/delete a course (admin or course creator)
  const canModifyCourse = (course: ICourse) => {
    return isAdmin || (currentUserId && course.user && course.user._id === currentUserId);
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

  return (
    <div className="bg-[var(--card-bg)] border-4 border-[var(--card-border)] rounded-lg p-4 md:p-6 mb-8 shadow-[var(--card-shadow)] card w-full">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6">
        <h2 className="text-xl font-bold text-[var(--text-color)] font-mono mb-4 md:mb-0">Your Courses</h2>
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
                
                <div className="pt-2">
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
                  <p className="mb-3 text-[var(--text-color)] text-sm">{course.description.length > 100 ? `${course.description.slice(0, 100)}...` : course.description}</p>
                  
                  {/* Progress bar */}
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
                  
                  <div className="flex flex-col mt-1 mb-4 text-xs text-[var(--text-color)]">
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
                  
                  {/* View Course button - will now automatically mark as in-progress */}
                  <ViewCourseButton 
                    title={course.title}
                    category={course.category}
                    isAdmin={isAdmin}
                    courseId={course._id}
                    onStartCourse={() => handleStartCourse(course._id)}
                  />
                  
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
        ) : (
          <div className="col-span-1 md:col-span-2 lg:col-span-3 text-center bg-[var(--card-bg)] rounded-lg p-8 border border-[var(--card-border)]">
            <div className="text-5xl mb-3">📚</div>
            <p className="text-lg text-[var(--text-color)] font-medium mb-2">No courses available</p>
            <p className="text-sm text-[var(--text-color)] mb-4">Start your learning journey by exploring available courses</p>
            <button 
              onClick={() => router.push('/courses')}
              className="inline-flex items-center text-sm font-medium bg-[var(--purple-primary)] text-white py-2 px-4 rounded-md border-2 border-[var(--card-border)] shadow-[2px_2px_0px_0px_var(--card-border)] hover:shadow-[3px_3px_0px_0px_var(--card-border)] hover:-translate-y-0.5 transition-all"
            >
              Browse Catalog
            </button>
          </div>
        )}
      </div>

      {/* Show More/Less Button */}
      {filteredCourses.length > 3 && (
        <div className="flex justify-center mt-6">
          <button
            onClick={() => setShowMore(!showMore)}
            className="inline-flex items-center text-sm font-medium bg-[var(--card-bg)] text-[var(--text-color)] py-2 px-4 rounded-md border-2 border-[var(--card-border)] shadow-[2px_2px_0px_0px_var(--card-border)] hover:shadow-[3px_3px_0px_0px_var(--card-border)] hover:-translate-y-0.5 transition-all"
          >
            {showMore ? (
              <>
                <ChevronUp size={16} className="mr-1" />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown size={16} className="mr-1" />
                Show More
              </>
            )}
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