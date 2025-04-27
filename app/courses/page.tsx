"use client";

import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
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

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  // Fetch courses from API
  useEffect(() => {
    async function fetchCourses() {
      try {
        setLoading(true);
        const response = await fetch('/api/public/courses', {
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
        
        // Extract unique categories
        const uniqueCategories = Array.from(
          new Set(data.courses.map((course: Course) => course.category))
        );
        setCategories(uniqueCategories as string[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
        console.error('Error fetching courses:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchCourses();
  }, []);

  // Filter courses based on search term and selected category
  const filteredCourses = courses.filter((course) => {
    const matchesSearch = 
      course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = 
      selectedCategory === '' || course.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

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
        ) : filteredCourses.length === 0 ? (
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => (
              <CourseCard key={course._id} course={course} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
} 