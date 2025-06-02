"use client";

import { useState, useEffect } from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import CourseCard from './components/CourseCard';
import Loading from '@/components/ui/Loading';

interface Lesson {
  title: string;
  content: string;
  points: number;
}

interface Course {
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
}

interface PaginationData {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [pagination, setPagination] = useState<PaginationData>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 9,
    hasNextPage: false,
    hasPrevPage: false
  });
  const [currentPage, setCurrentPage] = useState(1);

  // Function to fetch courses with pagination
  const fetchCourses = async (page = 1) => {
    try {
      setLoading(true);
      
      // Build query parameters
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '9'); // Fixed limit for consistency
      
      if (searchTerm) {
        params.append('title', searchTerm);
      }
      
      if (selectedCategory) {
        params.append('category', selectedCategory);
      }
      
      const response = await fetch(`/api/public/courses?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch courses: ${response.status}`);
      }

      const data = await response.json();
      setCourses(data.courses);
      setPagination(data.pagination);
      
      // Only extract categories on first load or when they might change
      if (page === 1 && (!categories.length || !selectedCategory)) {
        // Make a separate request to get all categories if we don't have them
        const allCategoriesResponse = await fetch('/api/public/courses', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (allCategoriesResponse.ok) {
          const allData = await allCategoriesResponse.json();
          const uniqueCategories = Array.from(
            new Set(allData.courses.map((course: Course) => course.category))
          );
          setCategories(uniqueCategories as string[]);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      console.error('Error fetching courses:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch courses on initial load
  useEffect(() => {
    fetchCourses(1);
  }, []);

  // Whenever search or category filters change, reset to page 1
  useEffect(() => {
    setCurrentPage(1);
    fetchCourses(1);
  }, [searchTerm, selectedCategory]);
  
  // Handle page changes
  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    setCurrentPage(newPage);
    fetchCourses(newPage);
    
    // Scroll to top when page changes
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  // Generate page numbers for pagination
  const getPageNumbers = () => {
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

  return (
    <main className="min-h-screen pt-24 px-4 md:px-8 pb-16 bg-[var(--background)]">
      <div className="max-w-7xl mx-auto">
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-bold mb-4 text-[var(--foreground)]">Explore Courses</h1>
          <p className="text-lg mb-6 text-[var(--foreground)]">Discover our wide range of courses and start your learning journey</p>
          
          {/* Search and Filter Section */}
          <div className="flex flex-col md:flex-row justify-center items-center gap-4 mb-8">
            <div className="relative w-full md:w-2/3 lg:w-1/2">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search courses by title or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full py-3 pl-10 pr-4 bg-[var(--card-bg)] text-[var(--card-foreground)] border-4 border-[var(--card-border)] rounded-md shadow-[4px_4px_0px_0px_var(--card-border)] focus:outline-none focus:ring-2 focus:ring-[var(--purple-primary)]"
              />
            </div>
            {categories.length > 0 && (
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full md:w-auto py-3 px-4 bg-[var(--card-bg)] text-[var(--card-foreground)] border-4 border-[var(--card-border)] rounded-md shadow-[4px_4px_0px_0px_var(--card-border)] focus:outline-none focus:ring-2 focus:ring-[var(--purple-primary)]"
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Courses Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loading />
          </div>
        ) : error ? (
          <div className="text-center py-10 bg-[var(--card-bg)] rounded-lg border-4 border-[var(--card-border)] shadow-[var(--card-shadow)]">
            <p className="text-red-500 mb-2">Error loading courses</p>
            <p className="text-[var(--card-foreground)]">{error}</p>
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-16 bg-[var(--card-bg)] rounded-lg border-4 border-[var(--card-border)] shadow-[var(--card-shadow)]">
            <div className="text-4xl mb-4">📚</div>
            <h3 className="text-xl font-bold mb-2 text-[var(--card-foreground)]">No courses found</h3>
            <p className="text-[var(--card-foreground)]">
              {searchTerm 
                ? `No courses match "${searchTerm}"${selectedCategory ? ` in ${selectedCategory}` : ''}`
                : 'No courses are available at the moment.'}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course) => (
                <CourseCard key={course._id} course={course} />
              ))}
            </div>
            
            {/* Pagination */}
            {pagination.totalPages > 1 && (
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
            <div className="text-center mt-4 text-sm text-[var(--text-color)]">
              Showing {(currentPage - 1) * pagination.itemsPerPage + 1} to {Math.min(currentPage * pagination.itemsPerPage, pagination.totalItems)} of {pagination.totalItems} courses
            </div>
          </>
        )}
      </div>
    </main>
  );
} 