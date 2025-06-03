export default function CourseCardSkeleton() {
  return (
    <div className="relative bg-[#294268] border-4 border-black rounded-md p-6 shadow-[6px_6px_0px_0px_#000000] flex flex-col h-full animate-pulse">
      {/* Skeleton for icon/badge */}
      <div className="absolute -top-4 -left-4 w-12 h-12 rounded-full bg-[#3A5075] border-2 border-black shadow-[2px_2px_0px_0px_#000000]"></div>
      
      <div className="pt-4 w-full">
        {/* Skeleton for title */}
        <div className="h-6 bg-[#3A5075] rounded w-3/4 mb-3"></div>
        
        {/* Skeleton for tags */}
        <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
          <div className="h-6 bg-[#3A5075] rounded-full w-1/3"></div>
          <div className="h-6 bg-[#3A5075] rounded-full w-1/4"></div>
        </div>
        
        {/* Skeleton for description */}
        <div className="space-y-2 mb-6">
          <div className="h-4 bg-[#3A5075] rounded w-full"></div>
          <div className="h-4 bg-[#3A5075] rounded w-5/6"></div>
          <div className="h-4 bg-[#3A5075] rounded w-4/6"></div>
        </div>
        
        {/* Skeleton for metadata */}
        <div className="flex flex-col mt-auto space-y-2 mb-6">
          <div className="h-4 bg-[#3A5075] rounded w-1/3"></div>
          <div className="h-4 bg-[#3A5075] rounded w-1/2"></div>
        </div>
        
        {/* Skeleton for button */}
        <div className="h-12 bg-[#7A3CB8] rounded-md w-full"></div>
      </div>
    </div>
  );
} 