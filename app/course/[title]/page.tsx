"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { useDashboard } from "../../provider";
import Loading from "../../../components/ui/Loading";
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-bash';
import 'prismjs/plugins/line-numbers/prism-line-numbers.js';
import 'prismjs/plugins/line-numbers/prism-line-numbers.css';
import confetti from 'canvas-confetti';
import '../code-styles.css';

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
                // Compare course ID strings
                const completedCourseId = completedCourse.course._id || completedCourse.course;
                return completedCourseId === course._id || completedCourseId.toString() === course._id;
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

  // Process and enhance code blocks 
  useEffect(() => {
    if (course && !loading && contentRef.current) {
      // First, ensure code blocks are properly formatted
      const preElements = contentRef.current.querySelectorAll('pre');
      preElements.forEach((pre) => {
        pre.classList.add('line-numbers');
        
        // Find the code element inside pre
        const codeElement = pre.querySelector('code');
        if (codeElement) {
          // Clean up any inline styles that might interfere
          codeElement.removeAttribute('style');
          
          // Try to detect language from class
          const classes = codeElement.className.split(' ');
          const langClass = classes.find(cls => cls.startsWith('language-'));
          
          // If no language class, add default
          if (!langClass) {
            const content = codeElement.textContent || '';
            // Simple language detection heuristic
            if (content.includes('function') || content.includes('var ') || content.includes('const ') || content.includes('console.log')) {
              codeElement.classList.add('language-javascript');
            } else if (content.includes('def ') || content.includes('import ') || content.includes('print(')) {
              codeElement.classList.add('language-python');
            } else {
              codeElement.classList.add('language-plaintext');
            }
          }
        }
      });

      // Highlight code with PrismJS (with a small delay to ensure DOM is ready)
      setTimeout(() => {
        if (contentRef.current) {
          Prism.highlightAllUnder(contentRef.current);
        }
      }, 100);
    }
  }, [course, activeLesson, loading]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#6016a7] text-[#E6F1FF]">
        <Loading />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen pt-[100px] bg-[#6016a7] text-[#E6F1FF]">
        <div className="container mx-auto px-4 py-16">
          <div className="bg-[#294268] border-4 border-black rounded-lg p-6 shadow-[8px_8px_0px_0px_#000000]">
            <h1 className="text-3xl font-bold text-[#E6F1FF] mb-4 font-mono">Course Not Found</h1>
            <p>The course you are looking for could not be found.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-[100px] bg-[#6016a7] text-[#E6F1FF]">
      <div className="container mx-auto px-4 py-8">
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Lessons Sidebar */}
          <div className="md:col-span-1">
            <div className="bg-[#294268] border-4 border-black rounded-lg p-4 shadow-[8px_8px_0px_0px_#000000]">
              <h2 className="text-xl font-bold text-[#E6F1FF] mb-4 font-mono">Lessons</h2>
              <div className="space-y-2">
                {course.lessons.map((lesson, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveLesson(index)}
                    className={`w-full p-2 text-left border-2 border-black rounded-md shadow-[2px_2px_0px_0px_#000000] transition-all duration-200 text-sm font-bold ${
                      activeLesson === index
                        ? "bg-[#9D4EDD] text-white"
                        : "bg-[#2f235a] text-[#E6F1FF] hover:bg-[#3a2b6e]"
                    }`}
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

          {/* Lesson Content */}
          <div className="md:col-span-3">
            <div className="bg-[#294268] border-4 border-black rounded-lg p-6 shadow-[8px_8px_0px_0px_#000000]">
              <h2 className="text-2xl font-bold text-[#E6F1FF] mb-4 font-mono">
                {course.lessons[activeLesson]?.title || "Lesson Content"}
              </h2>
              <div 
                ref={contentRef}
                className="prose prose-invert max-w-none 
                  prose-pre:bg-[#1a1a2e] 
                  prose-pre:border-2 
                  prose-pre:border-black 
                  prose-pre:shadow-[2px_2px_0px_0px_#000000] 
                  prose-pre:rounded-md 
                  prose-pre:my-4
                  prose-pre:overflow-x-auto
                  prose-code:font-mono
                  prose-code:text-[0.9em]
                  prose-code:leading-relaxed
                  prose-code:p-0
                  prose-p:my-4 
                  prose-headings:mt-6 
                  prose-headings:mb-4
                  prose-ul:my-4
                  prose-li:my-2"
                dangerouslySetInnerHTML={{ __html: course.lessons[activeLesson]?.content || "" }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}