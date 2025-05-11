"use client";

import { useState, useEffect, useRef } from "react";
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

// Helper function to create URL-friendly slugs
function slugify(text: string): string {
  return text.toString().toLowerCase()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start of text
    .replace(/-+$/, '');            // Trim - from end of text
}

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

// SWR fetcher function
const fetcher = async (url: string, token: string) => {
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    }
  });
  
  if (!res.ok) {
    throw new Error('An error occurred while fetching the data.');
  }
  
  return res.json();
};

export default function CourseDetailPage() {
  const params = useParams();
  const titleSlug = params.title as string;
  
  const { token } = useDashboard();
  const [activeLesson, setActiveLesson] = useState<number>(0);
  const [isCompleting, setIsCompleting] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [completionMessage, setCompletionMessage] = useState<string>('');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Add state for client-side rendering
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Use SWR for data fetching
  const { data: coursesData, error: coursesError } = useSWR(
    token ? ['/api/course/get', token] : null,
    ([url, token]) => fetcher(url, token),
    {
      revalidateOnFocus: false,
      revalidateIfStale: false,
      dedupingInterval: 5000, // Cache for 5 seconds
    }
  );
  
  // Use SWR for progress data
  const { data: progressData, error: progressError } = useSWR(
    token ? ['/api/course/get-progress', token] : null,
    ([url, token]) => fetcher(url, token),
    {
      revalidateOnFocus: false,
      revalidateIfStale: false,
      dedupingInterval: 5000, // Cache for 5 seconds
    }
  );

  // Find matching course from SWR data
  const course = coursesData?.courses?.find((c: ICourse) => {
    const courseSlug = c.title.toLowerCase().replace(/\s+/g, '-');
    return courseSlug === titleSlug;
  }) || null;

  // Check if course is already completed from SWR data
  useEffect(() => {
    if (progressData?.progress?.completedCourses && course) {
      const isAlreadyCompleted = progressData.progress.completedCourses.some(
        (completedCourse: any) => {
          // Handle null/undefined cases
          if (!completedCourse || !completedCourse.course) return false;
          
          // Compare course ID strings, handling both object and string cases
          const completedCourseId = typeof completedCourse.course === 'object' 
            ? completedCourse.course._id 
            : completedCourse.course;

          return completedCourseId === course._id || completedCourseId?.toString() === course._id;
        }
      );
      setIsCompleted(isAlreadyCompleted);
    }
  }, [progressData, course]);

  // Loading state derived from SWR
  const loading = (!coursesData && !coursesError) || (!progressData && !progressError && token);

  // Theme toggle function
  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    
    // Save theme preference to localStorage
    localStorage.setItem('darkMode', newTheme ? 'true' : 'false');
    
    // Apply theme to document
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

  // Function to handle course completion
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
        
        // Only trigger confetti on client side
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

  // Function to trigger confetti animation
  const triggerConfetti = () => {
    // Default confetti
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 }
    });

    // Confetti with custom colors - delayed slightly
    setTimeout(() => {
      confetti({
        particleCount: 100,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#FFD700', '#9D4EDD', '#5CDB95']
      });
    }, 250);

    // More confetti from the other side - delayed more
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

  // Replace Prism code highlighting with lowlight
  useEffect(() => {
    // Don't run on server
    if (typeof window === 'undefined') return;
    
    const highlightCodeBlocks = () => {
      if (!contentRef.current) return;

      try {
        // Find all pre elements
        const preElements = contentRef.current?.querySelectorAll('pre');
        
        if (!preElements?.length) return;
        
        preElements.forEach((pre) => {
          // Prevent duplicate processing
          if (pre.dataset.processed === 'true') return;
          pre.dataset.processed = 'true';
          
          // Add special class for styling
          pre.classList.add('hljs-line-numbers');
          
          // Find the code element inside pre
          const codeElement = pre.querySelector('code');
          if (codeElement) {
            // Remove any inline styles that might interfere
            codeElement.removeAttribute('style');
            
            // Get the content and detect language
            const content = codeElement.textContent || '';
            let language = '';
            
            // Try to detect language from class
            const classes = codeElement.className.split(' ');
            const langClass = classes.find(cls => cls.startsWith('language-'));
            
            if (langClass) {
              language = langClass.replace('language-', '');
            } else {
              // Improved language detection
              if (content.includes('#include') || content.includes('int main')) {
                language = 'c';
              } else if (content.includes('function') || content.includes('var ') || content.includes('const ')) {
                language = 'javascript';
              } else if (content.includes('def ') || content.includes('import ') || content.includes('print(')) {
                language = 'python';
              } else {
                language = 'plaintext';
              }
            }
            
            try {
              // Highlight the code using lowlight
              let result;
              // Check if the language is registered using the correct API
              if (lowlight.registered(language)) {
                result = lowlight.highlight(language, content);
              } else {
                // Fallback to plaintext
                result = lowlight.highlight('plaintext', content);
              }
              
              // Apply the highlighted HTML - convert hast to HTML string
              const htmlOutput = hastToHtml(result);
              codeElement.innerHTML = htmlOutput;
              codeElement.classList.add('hljs');
              
              // Add the language class
              if (!codeElement.classList.contains(`language-${language}`)) {
                codeElement.classList.add(`language-${language}`);
              }
              
              // Add specific inline CSS to help with consistency
              pre.style.backgroundColor = '#282c34';
              pre.style.borderRadius = '8px';
              pre.style.boxShadow = '8px 8px 0px 0px #000000';
              pre.style.border = '4px solid #000000';
              // Ensure no animations
              pre.style.transition = 'none';
              codeElement.style.transition = 'none';
            } catch (err) {
              console.error("Error highlighting code:", err);
            }
          }
        });
      } catch (error) {
        console.error("Error applying syntax highlighting:", error);
      }
    };

    // Create a MutationObserver to watch for changes to the DOM
    const observer = new MutationObserver((mutations) => {
      // Check if any of the mutations are relevant to our content
      const shouldHighlight = mutations.some(mutation => {
        // If nodes were added
        if (mutation.addedNodes.length > 0) {
          // Check if any added node is or contains a pre element
          return Array.from(mutation.addedNodes).some(node => {
            if (node.nodeType !== Node.ELEMENT_NODE) return false;
            const element = node as Element;
            return element.tagName === 'PRE' || element.querySelector('pre');
          });
        }
        return false;
      });

      if (shouldHighlight) {
        highlightCodeBlocks();
      }
    });

    // Whenever the visible lesson changes, we need to re-highlight after a short delay
    const timeoutId = setTimeout(() => {
      highlightCodeBlocks();
      
      // Start observing the content ref for changes to the DOM
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
  }, [course, activeLesson]);

  // Move lowlight registration to useEffect
  useEffect(() => {
    // Register languages with lowlight only on client side
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
      <div className="min-h-screen pt-[100px] bg-[var(--background-color)] flex items-center justify-center text-[var(--text-color)]">
       <Loading />
      </div>
       
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen pt-[100px] text-[var(--text-color)]">
        <div className="container mx-auto px-4">
          <div className="bg-[var(--card-bg)] border-4 border-[var(--card-border)] rounded-lg p-6 shadow-[var(--card-shadow)]">
            <p className="text-center">Course not found</p>
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
            suppressHydrationWarning={true}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div 
              className="bg-[var(--card-bg)] border-4 border-black rounded-lg p-6 shadow-[8px_8px_0px_0px_#000000] mb-8" 
              suppressHydrationWarning={true}
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
                      className={`px-5 py-2.5 ${isDarkMode ? "bg-purple-700 hover:bg-purple-800 text-white" : "bg-[#FFD700] hover:bg-[#F0C800] text-black border-2 border-black shadow-[4px_4px_0px_0px_#000000] hover:shadow-[6px_6px_0px_0px_#000000] hover:-translate-y-1"} rounded-md font-medium transition-all duration-200 flex items-center space-x-1`}
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
                    className={`w-full p-3 text-left border-2 border-black rounded-md transition-all duration-200 text-sm font-bold cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--purple-primary)] ${
                      activeLesson === index
                        ? "bg-[var(--purple-primary)] text-white shadow-[4px_4px_0px_0px_#000000]"
                        : "bg-[var(--card-bg)] text-[var(--text-color)] hover:bg-[var(--purple-light)] shadow-[2px_2px_0px_0px_#000000] hover:shadow-[4px_4px_0px_0px_#000000]"
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
            suppressHydrationWarning={true}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            {/* Course Header */}
            <motion.div 
              className="bg-[var(--card-bg)] border-4 border-black rounded-lg p-6 mb-8 shadow-[8px_8px_0px_0px_#000000]" 
              suppressHydrationWarning={true}
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
                <span className="text-sm bg-[var(--card-bg)] text-[var(--text-color)] px-3 py-1 rounded-md border-2 border-black shadow-[2px_2px_0px_0px_#000000] mr-3">
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
                <div className="text-sm bg-[#FFD700] text-black px-3 py-1 rounded-md border-2 border-black shadow-[2px_2px_0px_0px_#000000]">
                  Lessons: {course.lessons.length}
                </div>
              </motion.div>
            </motion.div>

            {/* Course Completion Section */}
            <motion.div 
              className="bg-[var(--card-bg)] border-4 border-black rounded-lg p-6 mb-8 shadow-[8px_8px_0px_0px_#000000]"
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
                  className={`px-4 py-2 border-2 border-black rounded-md shadow-[4px_4px_0px_0px_#000000] transition-all duration-200 font-bold ${
                    isCompleted
                      ? 'bg-[#5CDB95] text-black cursor-not-allowed'
                      : isCompleting
                      ? 'bg-[#8892B0] text-[var(--text-color)] cursor-wait'
                      : 'bg-[#FFD700] text-black hover:bg-[#FFC000] hover:shadow-[6px_6px_0px_0px_#000000]'
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
              className="bg-[var(--card-bg)] border-4 border-black rounded-lg p-6 shadow-[8px_8px_0px_0px_#000000]"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <motion.h2 
                className="text-2xl font-bold text-[var(--text-color)] mb-4 font-mono"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
                key={activeLesson} // Add key to force re-animation when lesson changes
              >
                {course.lessons[activeLesson]?.title || "Lesson Content"}
              </motion.h2>
              <motion.div 
                ref={contentRef}
                className="prose prose-invert max-w-none 
                  prose-pre:bg-[#282c34] 
                  prose-pre:border-4
                  prose-pre:border-black
                  prose-pre:rounded-lg 
                  prose-pre:my-4
                  prose-pre:overflow-x-auto
                  prose-pre:p-5
                  prose-pre:shadow-[8px_8px_0px_0px_#000000]
                  prose-code:font-mono
                  prose-code:text-[0.95em]
                  prose-code:leading-relaxed
                  prose-code:p-0
                  prose-p:my-4 
                  prose-headings:mt-6 
                  prose-headings:mb-4
                  prose-ul:my-4
                  prose-li:my-2
                  overflow-y-auto
                  max-h-[70vh]
                  p-[10px]"
                suppressHydrationWarning={true}
                dangerouslySetInnerHTML={{ __html: course.lessons[activeLesson]?.content || "" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.5 }}
                key={`content-${activeLesson}`} // Add key to force re-animation when lesson changes
              />
            </motion.div>
          </motion.div>
        </div>
      </div>
      {/* Add the tooltip component at the bottom of the return statement */}
      {isClient && (
        <Tooltip id="test-tooltip" className={`z-10 ${isDarkMode ? "bg-gray-800 text-white" : "bg-white text-gray-900 border border-gray-200 shadow-md"} max-w-xs`} place="top">
          AI will generate personalized questions based on this course
        </Tooltip>
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
    const attrs = properties ? Object.entries(properties)
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
