"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useDashboard } from "../../provider";
import Loading from "../../../components/ui/Loading";
import confetti from 'canvas-confetti';
import '../code-styles.css';
import { Tooltip } from 'react-tooltip';
import useSWR from 'swr';
import { LeaderboardButton } from "../../dashboard/components/ViewCourseButton";
import { motion } from 'framer-motion';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.3
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { 
    opacity: 1, 
    y: 0,
    transition: { 
      type: "spring", 
      stiffness: 100,
      damping: 12
    }
  },
  hover: {
    scale: 1.02,
    boxShadow: "6px 6px 0px 0px var(--card-border)",
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 10
    }
  },
  tap: {
    scale: 0.98,
    boxShadow: "2px 2px 0px 0px var(--card-border)",
  }
};

// Lowlight imports for syntax highlighting
import { common, createLowlight } from 'lowlight';
const lowlight = createLowlight(common);

import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import python from 'highlight.js/lib/languages/python';
import java from 'highlight.js/lib/languages/java';
import css from 'highlight.js/lib/languages/css';
import json from 'highlight.js/lib/languages/json';
import bash from 'highlight.js/lib/languages/bash';
import xml from 'highlight.js/lib/languages/xml';
import markdown from 'highlight.js/lib/languages/markdown';
import c from 'highlight.js/lib/languages/c';
import cpp from 'highlight.js/lib/languages/cpp';
import 'highlight.js/styles/atom-one-dark.css';

interface ILesson {
  title: string;
  content: string;
  points: number;
}

interface ICourse {
  _id: string;
  title: string;
  category: string;
  description: string;
  lessons: ILesson[];
  createdAt: string;
  user?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    _id: string;
  };
}

// SWR fetcher function with additional caching
const fetcher = async (url: string, token: string) => {
  // Check for cached data first
  const cacheKey = `${url}_${token}`;
  const cachedData = sessionStorage.getItem(cacheKey);
  
  if (cachedData) {
    try {
      const { data, timestamp } = JSON.parse(cachedData);
      // Use cache if less than 15 minutes old
      if (Date.now() - timestamp < 15 * 60 * 1000) {
        console.log('Using cached course data for:', url);
        return data;
      }
    } catch (e) {
      console.error('Cache parse error:', e);
    }
  }
  
  // If no valid cache, fetch from server
  console.log('Fetching fresh data from:', url);
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    cache: 'force-cache'
  });
  
  if (!res.ok) {
    throw new Error('An error occurred while fetching the data.');
  }
  
  const data = await res.json();
  
  // Store in cache with timestamp
  try {
    sessionStorage.setItem(cacheKey, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  } catch (e) {
    console.error('Cache save error:', e);
  }
  
  return data;
};

export default function CourseDetailPage() {
  const params = useParams();
  const titleSlug = params.title as string;
  const router = useRouter();
  console.log(`Loading course with slug: ${titleSlug}`);
  
  const { token } = useDashboard();
  const [activeLesson, setActiveLesson] = useState<number>(0);
  const [isCompleting, setIsCompleting] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [completionMessage, setCompletionMessage] = useState<string>('');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Client-side rendering state
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // SIMPLIFIED API CALL: Directly fetch course by slug
  const { data: courseData, error: courseError } = useSWR(
    token ? [`/api/course/get-by-slug/${titleSlug}`, token] : null,
    ([url, token]) => fetcher(url, token),
    {
      revalidateOnFocus: false,
      revalidateIfStale: false,
      dedupingInterval: 900000, // Cache for 15 minutes
      errorRetryCount: 2,
    }
  );

  // Access course directly from response
  const course = courseData?.course;
  
  // Get progress data only if we have a course
  const { data: progressData } = useSWR(
    token && course ? ['/api/course/get-progress', token] : null,
    ([url, token]) => fetcher(url, token),
    {
      revalidateOnFocus: false,
      revalidateIfStale: false,
      dedupingInterval: 600000, // Cache for 10 minutes
    }
  );

  // Add SWR fetch for the full lesson content when clicking on a lesson
  const { data: lessonData } = useSWR(
    token && course && activeLesson !== null && activeLesson > 0 && 
    course.lessons[activeLesson] && !course.lessons[activeLesson]._hasFullContent
      ? [`/api/course/lesson/${course._id}/${activeLesson}`, token]
      : null,
    ([url, token]) => fetcher(url, token),
    {
      revalidateOnFocus: false,
      revalidateIfStale: false,
      dedupingInterval: 600000, // Cache for 10 minutes
    }
  );

  // Get current lesson, prioritize full content from lessonData if available
  const currentLesson = course?.lessons?.[activeLesson];
  const currentLessonContent = useMemo(() => {
    const content = lessonData?.lesson?.content || currentLesson?.content;
    return content ? processHtmlContent(content) : null;
  }, [lessonData?.lesson?.content, currentLesson?.content]);

  // Check if course is already completed
  useEffect(() => {
    if (progressData?.progress?.completedCourses && course) {
      const isAlreadyCompleted = progressData.progress.completedCourses.some(
        (completedCourse: any) => {
          if (!completedCourse || !completedCourse.course) return false;
          const completedCourseId = typeof completedCourse.course === 'object' 
            ? completedCourse.course._id 
            : completedCourse.course;

          return completedCourseId === course._id || completedCourseId?.toString() === course._id;
        }
      );
      setIsCompleted(isAlreadyCompleted);
    }
  }, [progressData, course]);

  // Simple loading state
  const loading = (!courseData && !courseError);
  
  // Show not found message if needed
  const [courseNotFound, setCourseNotFound] = useState(false);
  
  useEffect(() => {
    if (courseData && !course) {
      const timer = setTimeout(() => {
        setCourseNotFound(true);
      }, 5000);
      return () => clearTimeout(timer);
    }
    
    if (course) {
      setCourseNotFound(false);
    }
  }, [courseData, course]);

  // Theme toggle function
  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    localStorage.setItem('darkMode', newTheme ? 'true' : 'false');
    
    if (newTheme) {
      document.documentElement.classList.add('dark-theme');
    } else {
      document.documentElement.classList.remove('dark-theme');
    }
  };

  // Load saved theme preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('darkMode') === 'true';
      setIsDarkMode(savedTheme);
      
      if (savedTheme) {
        document.documentElement.classList.add('dark-theme');
      } else {
        document.documentElement.classList.remove('dark-theme');
      }
    }
  }, []);

  // Handle course completion
  const handleCompleteCourse = async () => {
    if (!course || !token || !isClient) return;
    
    setIsCompleting(true);
    try {
      const response = await fetch(`/api/course/complete/${course._id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      
      if (response.ok) {
        setIsCompleted(true);
        setCompletionMessage(`Congratulations! You earned ${data.pointsEarned} points. Your total points: ${data.totalPoints}`);
        
        if (isClient) {
          triggerConfetti();
        }
      } else {
        setCompletionMessage(data.error || "Failed to complete the course. Please try again.");
      }
    } catch (error) {
      console.error("Error completing course:", error);
      setCompletionMessage("An error occurred. Please try again.");
    } finally {
      setIsCompleting(false);
    }
  };

  // Confetti animation function
  const triggerConfetti = () => {
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 }
    });

    setTimeout(() => {
      confetti({
        particleCount: 100,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#FFD700', '#9D4EDD', '#5CDB95']
      });
    }, 250);

    setTimeout(() => {
      confetti({
        particleCount: 100,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#FFD700', '#9D4EDD', '#5CDB95']
      });
    }, 400);
  };

  // Code syntax highlighting
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const highlightCodeBlocks = () => {
      if (!contentRef.current) return;

      try {
        const preElements = contentRef.current?.querySelectorAll('pre');
        
        if (!preElements?.length) return;
        
        preElements.forEach((pre) => {
          if (pre.dataset.processed === 'true') return;
          pre.dataset.processed = 'true';
          
          pre.classList.add('hljs-line-numbers');
          
          const codeElement = pre.querySelector('code');
          if (codeElement) {
            codeElement.removeAttribute('style');
            
            const content = codeElement.textContent || '';
            let language = '';
            
            const classes = codeElement.className.split(' ');
            const langClass = classes.find(cls => cls.startsWith('language-'));
            
            if (langClass) {
              language = langClass.replace('language-', '');
              // Set data-language attribute for styling in CSS
              pre.setAttribute('data-language', language);
            } else {
              if (content.includes('#include') || content.includes('int main')) {
                language = 'c';
              } else if (content.includes('function') || content.includes('var ') || content.includes('const ')) {
                language = 'javascript';
              } else if (content.includes('def ') || content.includes('import ') || content.includes('print(')) {
                language = 'python';
              } else {
                language = 'plaintext';
              }
              // Set the language class and data attribute
              codeElement.className = `language-${language}`;
              pre.setAttribute('data-language', language);
            }
            
            try {
              // Apply highlight.js highlighting
              if (language && lowlight.registered(language)) {
                const result = lowlight.highlight(language, content);
                const html = hastToHtml(result);
                codeElement.innerHTML = html;
              }
            } catch (err) {
              console.error('Error highlighting code:', err);
            }
          }
        });
      } catch (error) {
        console.error('Error processing code blocks:', error);
      }
    };

    // Set up mutation observer to catch dynamically inserted code blocks
    const observer = new MutationObserver((mutations) => {
        highlightCodeBlocks();
    });

    const timeoutId = setTimeout(() => {
      highlightCodeBlocks();
      
      if (contentRef.current) {
        observer.observe(contentRef.current, {
          childList: true,
          subtree: true,
          characterData: true,
        });
      }
    }, 300);

    return () => {
      clearTimeout(timeoutId);
      observer.disconnect();
    };
  }, [course, activeLesson, currentLessonContent]);

  // Register languages with lowlight
  useEffect(() => {
    lowlight.register('javascript', javascript);
    lowlight.register('typescript', typescript);
    lowlight.register('python', python);
    lowlight.register('java', java);
    lowlight.register('css', css);
    lowlight.register('json', json);
    lowlight.register('bash', bash);
    lowlight.register('xml', xml);
    lowlight.register('jsx', xml);
    lowlight.register('tsx', typescript);
    lowlight.register('markdown', markdown);
    lowlight.register('md', markdown);
    lowlight.register('c', c);
    lowlight.register('cpp', cpp);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen pt-[100px] bg-[var(--background-color)] flex flex-col items-center justify-center text-[var(--text-color)]">
       <Loading />
        <p className="mt-4 text-[var(--text-color)]">Loading course content...</p>
        <div className="w-64 h-2 bg-gray-200 rounded-full mt-4 overflow-hidden">
          <div className="h-full bg-[var(--purple-primary)] animate-pulse rounded-full"></div>
      </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen pt-[100px] text-[var(--text-color)]">
        <div className="container mx-auto px-4">
          <div className="bg-[var(--card-bg)] border-4 border-[var(--card-border)] rounded-lg p-6 shadow-[var(--card-shadow)]">
            <p className="text-center">Course not found</p>
            <div className="flex justify-center mt-4">
              <Link href="/dashboard" className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                Return to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen pt-[100px] text-[var(--text-color)]"
      suppressHydrationWarning={true}
    >
      <div 
        className="container mx-auto px-4"
        suppressHydrationWarning={true}
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8" suppressHydrationWarning={true}>
          {/* Left column: Lessons list */}
          <motion.div 
            className="lg:col-span-1" 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div 
              className="bg-[var(--card-bg)] border-4 border-[var(--card-border)] rounded-lg p-6 shadow-[8px_8px_0px_0px_var(--card-border)] mb-8" 
            >
              <div className="flex flex-col justify-between items-center mb-4">
                <div className="flex flex-col space-y-2">
                  <motion.h1 
                    className="text-xl font-bold"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                  >
                    {course.title}
                  </motion.h1>
                  <motion.div 
                    className="flex space-x-2"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                  >
                    <Link
                      href={`/test/${titleSlug}`}
                      className={`px-5 py-2.5 ${isDarkMode ? "bg-[var(--purple-primary)] hover:bg-[var(--purple-secondary)] text-white" : "bg-[#FFD700] hover:bg-[#F0C800] text-black"} border-2 border-[var(--card-border)] shadow-[4px_4px_0px_0px_var(--card-border)] hover:shadow-[6px_6px_0px_0px_var(--card-border)] hover:-translate-y-1 rounded-md font-medium transition-all duration-200 flex items-center space-x-1`}
                      prefetch={true}
                      data-tooltip-id="test-tooltip"
                      data-tooltip-content="AI will generate questions for you"
                    >
                      <span>Take Test</span>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </Link>
                    <LeaderboardButton title={course.title} />
                  </motion.div>
                </div>
              </div>
              <motion.div 
                className="space-y-2 max-h-[60vh] overflow-y-auto pr-2"
                variants={containerVariants}
                initial="hidden"
                animate="show"
              >
                {course.lessons.map((lesson: ILesson, index: number) => (
                  <motion.button
                    key={index}
                    onClick={() => setActiveLesson(index)}
                    className={`w-full p-3 text-left border-2 border-[var(--card-border)] rounded-md transition-all duration-200 text-sm font-bold cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--purple-primary)] ${
                      activeLesson === index
                        ? "bg-[var(--purple-primary)] text-white shadow-[4px_4px_0px_0px_var(--card-border)]"
                        : "bg-[var(--card-bg)] text-[var(--text-color)] hover:bg-[var(--purple-light)] shadow-[2px_2px_0px_0px_var(--card-border)] hover:shadow-[4px_4px_0px_0px_var(--card-border)]"
                    }`}
                    aria-label={`Select lesson: ${lesson.title}`}
                    tabIndex={0}
                    variants={itemVariants}
                    whileHover={activeLesson !== index ? "hover" : {}}
                    whileTap="tap"
                  >
                    <span className="block truncate">{lesson.title}</span>
                    <span className="text-xs mt-1 block">
                      Points: <span className="text-[#FFD700]">{lesson.points}</span>
                    </span>
                  </motion.button>
                ))}
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Middle column: Course details */}
          <motion.div 
            className="lg:col-span-2" 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            {/* Course Header */}
            <motion.div 
              className="bg-[var(--card-bg)] border-4 border-[var(--card-border)] rounded-lg p-6 mb-8 shadow-[8px_8px_0px_0px_var(--card-border)]" 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <motion.h1 
                className="text-3xl font-bold text-[var(--purple-primary)] mb-2 font-mono"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                {course.title}
              </motion.h1>
              <motion.div 
                className="flex items-center mb-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.5 }}
              >
                <span className="text-sm bg-[var(--card-bg)] text-[var(--text-color)] px-3 py-1 rounded-md border-2 border-[var(--card-border)] shadow-[2px_2px_0px_0px_var(--card-border)] mr-3">
                  {course.category}
                </span>
                <span className="text-xs text-[var(--text-color)]">
                  {course.user ? `By: ${course.user.firstName || ''} ${course.user.lastName || ''}` : ''}
                </span>
              </motion.div>
              <motion.p 
                className="text-[var(--text-color)] mb-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
              >
                {course.description}
              </motion.p>
              <motion.div 
                className="flex justify-between items-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.5 }}
              >
                <div className="text-xs text-[var(--text-color)]">
                  Created: {new Date(course.createdAt).toISOString().split('T')[0]}
                </div>
                <div className="text-sm bg-[#FFD700] text-black px-3 py-1 rounded-md border-2 border-[var(--card-border)] shadow-[2px_2px_0px_0px_var(--card-border)]">
                  Lessons: {course.lessons.length}
                </div>
              </motion.div>
            </motion.div>

            {/* Course Completion Section */}
            <motion.div 
              className="bg-[var(--card-bg)] border-4 border-[var(--card-border)] rounded-lg p-6 mb-8 shadow-[8px_8px_0px_0px_var(--card-border)]"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <div className="flex justify-between items-center">
                <div>
                  <motion.h2 
                    className="text-xl font-bold text-[var(--text-color)] font-mono"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4, duration: 0.5 }}
                  >
                    Course Progress
                  </motion.h2>
                  {isCompleted ? (
                    <motion.p 
                      className="text-[#5CDB95] mt-2"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5, duration: 0.5 }}
                    >
                      You have completed this course!
                    </motion.p>
                  ) : (
                    <motion.p 
                      className="text-[var(--text-color)] mt-2"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5, duration: 0.5 }}
                    >
                      Complete this course to earn points
                    </motion.p>
                  )}
                  {completionMessage && (
                    <motion.p 
                      className={`mt-2 ${isCompleted ? 'text-[#FFD700]' : 'text-[#FF6B6B]'}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.5 }}
                    >
                      {completionMessage}
                    </motion.p>
                  )}
                </div>
                <motion.button
                  onClick={handleCompleteCourse}
                  disabled={isCompleted || isCompleting}
                  className={`px-4 py-2 border-2 border-[var(--card-border)] rounded-md shadow-[4px_4px_0px_0px_var(--card-border)] transition-all duration-200 font-bold ${
                    isCompleted
                      ? 'bg-[#5CDB95] text-black cursor-not-allowed'
                      : isCompleting
                      ? 'bg-[#8892B0] text-[var(--text-color)] cursor-wait'
                      : 'bg-[#FFD700] text-black hover:bg-[#FFC000] hover:shadow-[6px_6px_0px_0px_var(--card-border)]'
                  }`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6, duration: 0.5 }}
                  whileHover={!isCompleted && !isCompleting ? { scale: 1.05 } : {}}
                  whileTap={!isCompleted && !isCompleting ? { scale: 0.95 } : {}}
                >
                  {isCompleted ? 'Completed' : isCompleting ? 'Processing...' : 'Complete Course'}
                </motion.button>
              </div>
              <motion.div 
                className="mt-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7, duration: 0.5 }}
              >
                <h3 className="text-sm font-bold text-[var(--purple-primary)]">Total Points Available:</h3>
                <p className="text-[#FFD700] font-bold">
                  {course.lessons.reduce((sum: number, lesson: ILesson) => sum + lesson.points, 0)} Points
                </p>
              </motion.div>
            </motion.div>

            {/* Course Content */}
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="w-full max-w-5xl mx-auto"
            >
              <motion.h2 
                variants={itemVariants}
                className="text-xl md:text-2xl font-bold mb-4 text-[var(--text-color)]"
              >
                {course.lessons[activeLesson]?.title || "Lesson Content"}
              </motion.h2>

              <motion.div 
                variants={itemVariants}
                className="p-4 sm:p-6 shadow-lg rounded-lg bg-[var(--card-bg)] border-2 border-[var(--card-border)] h-full overflow-y-auto"
                key={`lesson-container-${activeLesson}`}
              >
                <div
                ref={contentRef}
                  className="prose max-w-none prose-headings:text-[var(--purple-primary)] prose-a:text-[var(--purple-primary)] prose-pre:bg-transparent prose-pre:p-0 prose-pre:m-0 text-[var(--text-color)] prose-p:text-[var(--text-color)] prose-strong:text-[var(--text-color)] prose-ol:text-[var(--text-color)] prose-ul:text-[var(--text-color)] prose-li:text-[var(--text-color)] prose-blockquote:text-[var(--text-color)] prose-figcaption:text-[var(--text-color)] prose-hr:border-[var(--text-color)]"
                suppressHydrationWarning={true}
                  dangerouslySetInnerHTML={{ 
                    __html: currentLessonContent || 
                      `<div class="text-center text-[var(--text-secondary)]">
                        <p>No content available for this lesson.</p>
                        ${course && course.lessons && course.lessons[activeLesson] && !course.lessons[activeLesson]._hasFullContent ? 
                          `<p class="text-sm mt-2">Loading full lesson content...</p>` : ''}
                      </div>` 
                  }}
                />
                
                {/* Lesson Navigation Controls */}
                <div className="flex justify-between items-center mt-8">
                  <button
                    onClick={() => setActiveLesson(Math.max(0, activeLesson - 1))}
                    disabled={activeLesson === 0}
                    className={`px-4 py-2 rounded-lg ${
                      activeLesson === 0
                        ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                        : "bg-[var(--purple-primary)] text-white hover:bg-[var(--purple-secondary)]"
                    } transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[var(--purple-primary)] focus:ring-opacity-50`}
                  >
                    ← Previous
                  </button>
                  <div className="text-center">
                    <span className="text-[var(--text-secondary)] text-sm">
                      Lesson {activeLesson + 1} of {course?.lessons?.length || 0}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      if (course?.lessons && activeLesson < course.lessons.length - 1) {
                        setActiveLesson(activeLesson + 1);
                      }
                    }}
                    disabled={!course?.lessons || activeLesson >= course.lessons.length - 1}
                    className={`px-4 py-2 rounded-lg ${
                      !course?.lessons || activeLesson >= course.lessons.length - 1
                        ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                        : "bg-[var(--purple-primary)] text-white hover:bg-[var(--purple-secondary)]"
                    } transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[var(--purple-primary)] focus:ring-opacity-50`}
                  >
                    Next →
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </div>
      
      {/* Tooltip component */}
      {isClient && (
        <Tooltip id="test-tooltip" className={`z-10 ${isDarkMode ? "bg-gray-800 text-white" : "bg-white text-gray-900 border border-gray-200 shadow-md"} max-w-xs`} place="top">
          AI will generate personalized questions based on this course
        </Tooltip>
      )}
      
      {courseNotFound && (
        <div className="py-8 text-center">
          <h2 className="text-xl font-bold text-red-500">Course Not Found</h2>
          <p className="mt-2">The course "{titleSlug}" could not be found.</p>
          <Link href="/dashboard" className="mt-4 inline-block px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
            Return to Dashboard
          </Link>
        </div>
      )}
    </div>
  );
}

// Helper function to escape HTML special characters
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Helper function to convert HAST to HTML
function hastToHtml(node: any): string {
  const { type, tagName, properties, children, value } = node;
  
  if (type === 'text') {
    return escapeHtml(value || '');
  }
  
  if (type === 'element') {
    let attrs = properties ? Object.entries(properties)
      .map(([key, val]) => {
        if (key === 'className' && Array.isArray(val)) {
          return `class="${val.join(' ')}"`;
        }
        if (val === true) return key;
        if (val === false) return '';
        return `${key}="${escapeHtml(String(val))}"`;
      })
      .filter(Boolean)
      .join(' ') : '';
    
    // Add theme text color to paragraph & heading elements
    if (['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'span', 'div', 'table', 'th', 'td'].includes(tagName)) {
      if (attrs.includes('class="')) {
        attrs = attrs.replace('class="', 'class="text-[var(--text-color)] ');
      } else {
        attrs = 'class="text-[var(--text-color)]" ' + attrs;
      }
    }
    
    const openTag = attrs ? `<${tagName} ${attrs}>` : `<${tagName}>`;
    
    if (!children || children.length === 0) {
      return openTag + `</${tagName}>`;
    }
    
    return openTag + children.map(hastToHtml).join('') + `</${tagName}>`;
  }
  
  if (type === 'root' && children) {
    return children.map(hastToHtml).join('');
  }
  
  return '';
}

// Function to process HTML content and add theme color classes
function processHtmlContent(html: string): string {
  if (!html) return '';
  
  try {
    // Add text color class to common elements
    return html
      .replace(/<p>/g, '<p class="text-[var(--text-color)]">')
      .replace(/<h1>/g, '<h1 class="text-[var(--text-color)]">')
      .replace(/<h2>/g, '<h2 class="text-[var(--text-color)]">')
      .replace(/<h3>/g, '<h3 class="text-[var(--text-color)]">')
      .replace(/<h4>/g, '<h4 class="text-[var(--text-color)]">')
      .replace(/<li>/g, '<li class="text-[var(--text-color)]">')
      .replace(/<span>/g, '<span class="text-[var(--text-color)]">')
      .replace(/<div>/g, '<div class="text-[var(--text-color)]">');
  } catch (error) {
    console.error('Error processing HTML content:', error);
    return html;
  }
}
