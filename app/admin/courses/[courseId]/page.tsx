'use client';

import { useParams } from 'next/navigation';
import { useDashboard } from '../../../provider';
import Leaderboard from '../../../components/Leaderboard';

export default function CourseAdminPage() {
  const { courseId } = useParams();
  const { user } = useDashboard();

  if (!courseId || typeof courseId !== 'string') {
    return <div>Invalid course ID</div>;
  }

  return (
    <div className="min-h-screen pt-[100px] bg-[#6016a7] text-[#E6F1FF]">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 gap-8">
          {/* Course Leaderboard */}
          <div className="bg-[#294268] border-4 border-black rounded-lg p-6 shadow-[8px_8px_0px_0px_#000000]">
            <h2 className="text-2xl font-bold text-[#E6F1FF] mb-6 font-mono">
              Course Rankings
            </h2>
            <Leaderboard 
              currentUserId={user?._id} 
              courseId={courseId} 
              isAdmin={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
} 