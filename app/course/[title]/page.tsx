"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useDashboard } from "../../provider";
import Loading from "../../../components/ui/Loading";
import confetti from 'canvas-confetti';
import '../code-styles.css';

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

// Register languages with lowlight
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

export default function CourseDetailPage() {
  const params = useParams();
  const titleSlug = params.title as string;
  
  const { token } = useDashboard();
  const [course, setCourse] = useState<ICourse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeLesson, setActiveLesson] = useState<number>(0);
  const [isCompleting, setIsCompleting] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [completionMessage, setCompletionMessage] = useState<string>('');
  const contentRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchCourse = async () => {
      if (!token) return;

      try {
        // First get all courses
        const response = await fetch(`/api/course/get`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data?.courses && data.courses.length > 0) {
          // Find the course that matches the slug
          const matchingCourse = data.courses.find((c: ICourse) => {
            const courseSlug = c.title.toLowerCase().replace(/\s+/g, '-');
            return courseSlug === titleSlug;
          });
          
          if (matchingCourse) {
            setCourse(matchingCourse);
          }
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Error fetching course:", error);
        setLoading(false);
      }
    };

    fetchCourse();
  }, [titleSlug, token]);

  // Check if course is already completed
  useEffect(() => {
    const checkCompletion = async () => {
      if (!course || !token) return;
      
      try {
        const response = await fetch(`/api/course/get-progress`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.progress && data.progress.completedCourses) {
            const isAlreadyCompleted = data.progress.completedCourses.some(
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
        }
      } catch (error) {
        console.error("Error checking course completion:", error);
      }
    };

    checkCompletion();
  }, [course, token]);

  // Function to handle course completion
  const handleCompleteCourse = async () => {
    if (!course || !token) return;
    
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
        
        // Trigger confetti animation
        triggerConfetti();
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

  if (loading) {
    return (
      <div className="min-h-screen pt-[100px] bg-[#6016a7] flex items-center justify-center text-[#E6F1FF]">
       <Loading />
      </div>
       
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen pt-[100px] bg-[#6016a7] text-[#E6F1FF]">
        <div className="container mx-auto px-4">
          <div className="bg-[#294268] border-4 border-black rounded-lg p-6 shadow-[8px_8px_0px_0px_#000000]">
            <p className="text-center">Course not found</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-[100px] bg-[#6016a7] text-[#E6F1FF]">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column: Lessons list */}
          <div className="lg:col-span-1">
            <div className="bg-[#294268] border-4 border-black rounded-lg p-6 shadow-[8px_8px_0px_0px_#000000] mb-8">
              <div className="flex flex-col justify-between items-center mb-4">
                <h1 className="text-xl font-bold">{course.title}</h1>
                <div className="flex space-x-2">
                  <button
                    onClick={() => router.push(`/test/${titleSlug}`)}
                    className="px-3 py-2 bg-[#FFD700] text-black font-bold rounded-md border-2 border-black shadow-[2px_2px_0px_0px_#000000] hover:shadow-[4px_4px_0px_0px_#000000] transition-all duration-200 text-sm"
                  >
                    Take Test
                  </button>
                  <button
                    onClick={() => router.push(`/course/${titleSlug}/leaderboard`)}
                    className="px-3 py-2 bg-[#4CAF50] text-white font-bold rounded-md border-2 border-black shadow-[2px_2px_0px_0px_#000000] hover:shadow-[4px_4px_0px_0px_#000000] transition-all duration-200 text-sm"
                  >
                    Leaderboard
                  </button>
                </div>
              </div>
              <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
                {course.lessons.map((lesson, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveLesson(index)}
                    className={`w-full p-3 text-left border-2 border-black rounded-md transition-all duration-200 text-sm font-bold cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#9D4EDD] ${
                      activeLesson === index
                        ? "bg-[#9D4EDD] text-white shadow-[4px_4px_0px_0px_#000000]"
                        : "bg-[#2f235a] text-[#E6F1FF] hover:bg-[#3a2b6e] shadow-[2px_2px_0px_0px_#000000] hover:shadow-[4px_4px_0px_0px_#000000]"
                    }`}
                    aria-label={`Select lesson: ${lesson.title}`}
                    tabIndex={0}
                  >
                    <span className="block truncate">{lesson.title}</span>
                    <span className="text-xs mt-1 block">
                      Points: <span className="text-[#FFD700]">{lesson.points}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Middle column: Course details */}
          <div className="lg:col-span-2">
            {/* Course Header */}
            <div className="bg-[#294268] border-4 border-black rounded-lg p-6 mb-8 shadow-[8px_8px_0px_0px_#000000]">
              <h1 className="text-3xl font-bold text-[#9D4EDD] mb-2 font-mono">{course.title}</h1>
              <div className="flex items-center mb-4">
                <span className="text-sm bg-[#2f235a] text-[#E6F1FF] px-3 py-1 rounded-md border-2 border-black shadow-[2px_2px_0px_0px_#000000] mr-3">
                  {course.category}
                </span>
                <span className="text-xs text-[#8892B0]">
                  {course.user ? `By: ${course.user.firstName || ''} ${course.user.lastName || ''}` : ''}
                </span>
              </div>
              <p className="text-[#E6F1FF] mb-4">{course.description}</p>
              <div className="flex justify-between items-center">
                <div className="text-xs text-[#8892B0]">
                  Created: {new Date(course.createdAt).toLocaleDateString()}
                </div>
                <div className="text-sm bg-[#FFD700] text-black px-3 py-1 rounded-md border-2 border-black shadow-[2px_2px_0px_0px_#000000]">
                  Lessons: {course.lessons.length}
                </div>
              </div>
            </div>

            {/* Course Completion Section */}
            <div className="bg-[#294268] border-4 border-black rounded-lg p-6 mb-8 shadow-[8px_8px_0px_0px_#000000]">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-[#E6F1FF] font-mono">Course Progress</h2>
                  {isCompleted ? (
                    <p className="text-[#5CDB95] mt-2">You have completed this course!</p>
                  ) : (
                    <p className="text-[#E6F1FF] mt-2">Complete this course to earn points</p>
                  )}
                  {completionMessage && (
                    <p className={`mt-2 ${isCompleted ? 'text-[#FFD700]' : 'text-[#FF6B6B]'}`}>
                      {completionMessage}
                    </p>
                  )}
                </div>
                <button
                  onClick={handleCompleteCourse}
                  disabled={isCompleted || isCompleting}
                  className={`px-4 py-2 border-2 border-black rounded-md shadow-[4px_4px_0px_0px_#000000] transition-all duration-200 font-bold ${
                    isCompleted
                      ? 'bg-[#5CDB95] text-black cursor-not-allowed'
                      : isCompleting
                      ? 'bg-[#8892B0] text-[#E6F1FF] cursor-wait'
                      : 'bg-[#FFD700] text-black hover:bg-[#FFC000] hover:shadow-[6px_6px_0px_0px_#000000]'
                  }`}
                >
                  {isCompleted ? 'Completed' : isCompleting ? 'Processing...' : 'Complete Course'}
                </button>
              </div>
              <div className="mt-4">
                <h3 className="text-sm font-bold text-[#9D4EDD]">Total Points Available:</h3>
                <p className="text-[#FFD700] font-bold">
                  {course.lessons.reduce((sum, lesson) => sum + lesson.points, 0)} Points
                </p>
              </div>
            </div>

            {/* Course Content */}
            <div className="bg-[#294268] border-4 border-black rounded-lg p-6 shadow-[8px_8px_0px_0px_#000000]">
              <h2 className="text-2xl font-bold text-[#E6F1FF] mb-4 font-mono">
                {course.lessons[activeLesson]?.title || "Lesson Content"}
              </h2>
              <div 
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
                dangerouslySetInnerHTML={{ __html: course.lessons[activeLesson]?.content || "" }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
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

// Helper function to escape HTML special characters
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}