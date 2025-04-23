interface Lesson {
  title: string;
  content: string;
  points: number;
}

interface CourseCardProps {
  course: {
    _id: string;
    title: string;
    category: string;
    description: string;
    lessons: Lesson[];
    createdAt: string;
    user?: {
      firstName?: string;
      lastName?: string;
      email?: string;
      _id: string;
    };
  };
}

export default function CourseCard({ course }: CourseCardProps) {
  return (
    <div className="relative bg-[var(--card-bg)] border-4 border-[var(--card-border)] rounded-md p-6 shadow-[6px_6px_0px_0px_var(--card-border)] hover:shadow-[8px_8px_0px_0px_var(--card-border)] transition-all flex flex-col h-full">
      {/* Course icon/badge */}
      <div className="absolute -top-4 -left-4 w-12 h-12 rounded-full bg-[var(--purple-primary)] border-2 border-[var(--card-border)] shadow-[2px_2px_0px_0px_var(--card-border)] flex items-center justify-center text-white font-bold text-xl">
        {course.title.charAt(0)}
      </div>
      
      <div className="pt-4">
        <h3 className="text-xl font-bold text-[var(--card-foreground)] mb-3">{course.title}</h3>
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm font-medium px-3 py-1 bg-[var(--card-bg)] rounded-full border-2 border-[var(--card-border)]">
            {course.category}
          </span>
          <span className="text-sm bg-[var(--yellow-light)] px-3 py-1 rounded-full border-2 border-[var(--card-border)]">
            {course.lessons.length} {course.lessons.length === 1 ? 'Lesson' : 'Lessons'}
          </span>
        </div>
        
        <p className="mb-6 text-[var(--card-foreground)] line-clamp-3">
          {course.description}
        </p>
        
        <div className="flex flex-col mt-auto space-y-2 text-sm text-[var(--card-foreground)] mb-6">
          <p>Created: {new Date(course.createdAt).toLocaleDateString()}</p>
          {course.user && (
            <p className="font-medium">
              By: {course.user.firstName || ''} {course.user.lastName || ''}
            </p>
          )}
        </div>
        
        <a 
          href={`/course/${encodeURIComponent(course.title)}`}
          className="block w-full text-center py-3 px-4 bg-[var(--purple-primary)] text-white font-bold rounded-md border-2 border-[var(--card-border)] shadow-[4px_4px_0px_0px_var(--card-border)] hover:shadow-[2px_2px_0px_0px_var(--card-border)] hover:translate-y-1 transition-all"
        >
          View Course
        </a>
      </div>
    </div>
  );
} 