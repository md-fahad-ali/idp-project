import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
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

  // Handle delete course confirmation
  const handleDeleteConfirm = (course: ICourse) => {
    setCourseToDelete(course);
    setShowDeleteConfirm(true);
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
      
    } catch (error) {
      console.error('Error deleting course:', error);
      alert('Failed to delete course. Please try again.');
    }
  };

  // Check if the user can edit/delete a course (admin or course creator)
  const canModifyCourse = (course: ICourse) => {
    return isAdmin || (currentUserId && course.user && course.user._id === currentUserId);
  };

  return (
    <div className="bg-[#294268] border-4 border-black rounded-lg p-6 mb-8 shadow-[8px_8px_0px_0px_#000000]">
      <h2 className="text-2xl font-bold text-[#E6F1FF] mb-4 font-mono">Your Courses</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {courses && courses.length > 0 ? (
          courses.map((course: ICourse) => (
            <div
              key={course._id}
              className="relative bg-[#2f235a] border-2 border-black rounded-md p-4 shadow-[4px_4px_0px_0px_#000000] hover:shadow-[6px_6px_0px_0px_#000000] transition-all flex flex-col h-full"
            >
              {/* Delete button - only show if user can modify the course */}
              {canModifyCourse(course) && (
                <button
                  onClick={() => handleDeleteConfirm(course)}
                  className="absolute top-2 right-2 w-8 h-8 flex items-center text-black justify-center bg-[#FF4D4D] border-2 border-black rounded-md shadow-[2px_2px_0px_0px_#000000] hover:bg-[#E63939] transition-all duration-200"
                >
                  <X size={18} strokeWidth={5} className="font-bold" />
                </button>
              )}

              <h3 className="text-xl font-bold text-[#E6F1FF] mb-2">{course.title}</h3>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-[#8892B0]">{course.category}</span>
                <span className="text-xs bg-[#FFD700] text-black px-2 py-1 rounded-md">Lessons: {course.lessons.length}</span>
              </div>
              <p className="mb-2">{course.description.length > 100 ? `${course.description.slice(0, 100)}...` : course.description}</p>
              
              <div className="flex flex-col mt-1 mb-4">
                <p className="text-xs text-[#8892B0]">Created At: {new Date(course.createdAt).toISOString().split('T')[0]}</p>
                {course.user && (
                  <p className="text-xs text-[#9D4EDD] font-medium">
                    By: {course.user.firstName || ''} {course.user.lastName || ''}
                  </p>
                )}
              </div>
              
              <ViewCourseButton 
                title={course.title}
                category={course.category}
                isAdmin={isAdmin}
              />
            </div>
          ))
        ) : (
          <p className="col-span-3 text-center text-lg text-[#E6F1FF]">No courses available</p>
        )}
      </div>

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