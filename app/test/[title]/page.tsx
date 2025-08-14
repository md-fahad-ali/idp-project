"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useDashboard } from "../../provider";
import { useTheme } from "../../provider/theme-provider";
import confetti from 'canvas-confetti';
import { Question, ICourse } from '../../../types';
import Loading from '../../../components/ui/Loading';
import Link from "next/link";

export default function TestPage() {
  const params = useParams();
  const router = useRouter();
  const { token, user } = useDashboard();
  const { theme, mounted } = useTheme();
  const titleSlug = params.title as string;
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<number>(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [testCompleted, setTestCompleted] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isTimeUp, setIsTimeUp] = useState<boolean>(false);
  const [courseId, setCourseId] = useState<string>("");
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [showConfetti, setShowConfetti] = useState<boolean>(false);
  const [title, setTitle] = useState<string>("");

    const loadQuestionsForCourse = async () => {
    try {
      setLoading(true);
      console.log('Loading questions for course slug:', titleSlug);
      
      // Special handling for [title] URL parameter issue
      let searchSlug = titleSlug;
      if (titleSlug === '%5Btitle%5D' && typeof window !== 'undefined') {
        try {
          // Try to extract the real title from the URL path
          const path = window.location.pathname;
          const urlTitleMatch = path.match(/\/test\/([^/]+)/);
          if (urlTitleMatch && urlTitleMatch[1]) {
            searchSlug = urlTitleMatch[1];
            console.log('Using extracted slug from URL path instead:', searchSlug);
          }
        } catch (error) {
          console.error('Error extracting slug from URL:', error);
        }
      }
      
      // Prevent duplicate calls with proper checks
      if (questions.length > 0) {
        console.log('Questions already loaded, skipping API call');
        setLoading(false);
        return;
      }
      
      if (!searchSlug) {
        console.error('No title slug provided');
        setLoading(false);
        return;
      }

      if (!token) {
        console.error('No auth token available');
        setLoading(false);
        return;
      }

      console.log('Fetching course data with token...');
      
      // First try to fetch the specific course directly
      try {
        console.log(`Making API request to /api/course/get`);
        const response = await fetch(`/api/course/get`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Error fetching course: ${response.status}`);
        }

        console.log('Course API response received, status:', response.status);
        const data = await response.json();
        
        // Log the actual structure for debugging
        console.log('API Response data:', JSON.stringify(data).substring(0, 500) + '...');
        console.log('API Data structure:', Object.keys(data));
        console.log('Looking for title slug (raw):', searchSlug);
        
        // Improved course matching with multiple strategies
        let matchingCourse = null;
        
        // Helper function to create a slug from a title
        const createSlug = (text: string): string => text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '');
        // Normalize the incoming slug for strict comparison
        const normalizedSearchSlug = createSlug(decodeURIComponent(searchSlug));
        console.log('Normalized search slug:', normalizedSearchSlug);
        
        // Debug function to log which check is being performed
        const logMatch = (method: string, course: any, match: boolean): boolean => {
          console.log(`${method} Check - Course: ${course?.title || 'unknown'}, ID: ${course?._id || 'unknown'}, Match: ${match}`);
          return match;
        };
        
        // Remove previous fallback approach to avoid mismatches across courses
        
        // Strategy 1: Look for course in data.course (direct object)
        if (data && data.course) {
          console.log('Strategy 1: Checking data.course object');
          const course = data.course;
          
          // Save as fallback
          
          
          const courseSlug = course.slug || createSlug(course.title);
          
          if (logMatch('Exact slug', course, courseSlug === normalizedSearchSlug)) {
            matchingCourse = course;
            console.log('Found matching course in data.course');
          }
        }
        
        // Strategy 2: Look in data.courses array
        if (!matchingCourse && data && data.courses && Array.isArray(data.courses)) {
          console.log('Strategy 2: Searching in data.courses array, length:', data.courses.length);
          
          // Direct slug match only (no fuzzy/contains)
          matchingCourse = data.courses.find((c: any) => {
            const courseSlug = c.slug || createSlug(c.title);
            return logMatch('Exact slug', c, courseSlug === normalizedSearchSlug);
          });

        }
        
        // Strategy 3: Check if data itself is an array of courses
        if (!matchingCourse && data && Array.isArray(data)) {
          console.log('Strategy 3: Data is an array, length:', data.length);
          
          // Exact slug match only
          matchingCourse = data.find((c: any) => {
            const courseSlug = c.slug || createSlug(c.title);
            return logMatch('Exact slug', c, courseSlug === normalizedSearchSlug);
          });
        }
        
        // Strategy 4: Check if data itself is the course object
        if (!matchingCourse && data && data._id) {
          console.log('Strategy 4: Checking if data itself is the course');
          
          const dataSlug = data.slug || createSlug(data.title);
          
          if (logMatch('Data slug', data, dataSlug === normalizedSearchSlug)) {
            matchingCourse = data;
            console.log('Data itself is the matching course');
          }
        }
        
        // Remove JS-specific fuzzy matching and fallback-to-first to avoid cross-course confusion
        
        console.log('Final match result:', matchingCourse ? 'Course found' : 'No course found');
        
        if (!matchingCourse) {
          console.error('Course not found in API response');
          throw new Error("Course not found");
        }
        
        setCourseId(matchingCourse._id);
        // Set the title for display purposes
        setTitle(matchingCourse.title || titleSlug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '));
        
        // Get lessons data and generate questions
        const lessonData = matchingCourse.lessons || [];
        console.log(`Found ${lessonData.length} lessons`);
        
        if (lessonData.length === 0) {
          console.log('No lessons available for this course');
          setLoading(false);
          return; // Return early if no lessons found - this will show "No questions available"
        }
        
        console.log('Generating questions from lessons...');
        
        try {
          // Important: Keep the loading state true during question generation
          
          // Request server-side AI generation (keeps API key on server)
          const resp = await fetch('/api/quiz/generate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ lessons: lessonData, numQuestions: 5 }),
          });
          if (!resp.ok) {
            const err = await resp.json().catch(() => ({}));
            throw new Error(err?.error || `Question generation failed: ${resp.status}`);
          }
          const result = await resp.json();
          console.log('Questions generated (server):', result);
          
          const generatedQuestions = result.questions || [];
          
          if (generatedQuestions.length === 0) {
            console.log('No questions generated for this course');
            setLoading(false);
            return; // This will show "No questions available"
          }
          
          // Shuffle and limit questions if needed
          const shuffledQuestions = [...generatedQuestions].sort(() => Math.random() - 0.5);
          const finalQuestions = shuffledQuestions.slice(0, Math.min(5, shuffledQuestions.length));
          
          console.log(`Setting ${finalQuestions.length} questions`);
          
          // Set questions state
          setQuestions(finalQuestions);
          
          // Set start time and initial timer
          if (finalQuestions.length > 0) {
            setStartTime(Date.now());
            setTimeLeft(Number(finalQuestions[0].timeLimit));
          }
        } catch (error) {
          console.error('Error generating questions:', error);
          setLoading(false);
          return;
        }
        
      } catch (fetchError) {
        console.error("API fetch error:", fetchError);
        throw fetchError;
      }
      
      // Only set loading to false after all processing is complete
        setLoading(false);
      } catch (error) {
        console.error("Error loading questions:", error);
        setLoading(false);
      }
    };

  useEffect(() => {
    // Load questions on mount only once
    if (titleSlug && questions.length === 0) {
      try {
        loadQuestionsForCourse().catch(error => {
          console.error("Failed to load questions in effect:", error);
          setLoading(false);
        });
      } catch (error) {
        console.error("Error in question loading effect:", error);
        setLoading(false);
      }
    }
    
    // Cleanup all intervals and timers on unmount
    return () => {
      // Stop all timers
      console.log('TestPage unmounting, cleaning up all resources');
    };
  }, [titleSlug, questions.length]); // Reduced dependencies

  useEffect(() => {
    let timerId: NodeJS.Timeout;

    // Only run timer when:
    // 1. Questions are loaded
    // 2. Test is not completed
    // 3. We have a current question with time limit
    if (
      questions.length > 0 &&
      !testCompleted &&
      currentQuestion < questions.length &&
      !isTimeUp &&
      timeLeft > 0
    ) {
      timerId = setInterval(() => {
        setTimeLeft((prevTime) => {
          if (prevTime <= 1) {
            clearInterval(timerId);
          setIsTimeUp(true);
          return 0;
        }
          return prevTime - 1;
      });
    }, 1000);
    }

    return () => {
      if (timerId) clearInterval(timerId);
    };
  }, [questions, currentQuestion, testCompleted, isTimeUp, timeLeft]);

  useEffect(() => {
    if (isTimeUp && !selectedAnswer) {
      handleAnswerSelect(-1);
    }
  }, [isTimeUp]);

  const handleAnswerSelect = (answerIndex: number) => {
    if (selectedAnswer !== null || testCompleted) return;
    setSelectedAnswer(answerIndex);
    setShowExplanation(true);

    if (answerIndex === questions[currentQuestion].correctAnswer) {
      setScore(score + 1);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  };

  const handleNextQuestion = async () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
      setIsTimeUp(false);
      setTimeLeft(Number(questions[currentQuestion + 1].timeLimit));
    } else {
      // Calculate final score and submit test results
      const finalScore = score;
      console.log('Finishing test with score:', finalScore);
      
      // First set testCompleted to true to show the results screen immediately
      setTestCompleted(true);
      setLoading(false); // Make sure loading is false to show results
      
      // Then submit the test results in the background
      if (user && user._id) {
        try {
        const response = await fetch('/api/test/submit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            userId: user._id,
            courseId,
            score: finalScore,
            totalQuestions: questions.length,
            correctAnswers: score,
              timeSpent: Math.floor((Date.now() - startTime) / 1000)
          })
        });

        // Show confetti for good scores
        if (finalScore >= 3) {
          setShowConfetti(true);
            triggerConfetti();
          setTimeout(() => setShowConfetti(false), 5000);
        }
      } catch (error) {
        console.error('Error submitting test results:', error);
        }
      }
    }
  };
  
  // Add a helper function to trigger confetti manually
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
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getDifficultyColor = (difficulty: string): string => {
    switch (difficulty.toLowerCase()) {
      case 'easy':
        return theme === 'dark' ? 'text-green-400' : 'text-green-600';
      case 'medium':
        return theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600';
      case 'hard':
        return theme === 'dark' ? 'text-red-400' : 'text-red-600';
      default:
        return theme === 'dark' ? 'text-gray-400' : 'text-gray-600';
    }
  };

  // Add the useEffect to extract title from URL path for %5Btitle%5D parameter
  useEffect(() => {
    // Handle URL-encoded [title] parameter issue
    if (titleSlug === '%5Btitle%5D' && typeof window !== 'undefined') {
      try {
        // Extract the actual course title from the path
        const path = window.location.pathname;
        console.log('Current path:', path);
        
        // Extract the real title from URL patterns like /test/javascript or /test/javascript-course
        const urlTitleMatch = path.match(/\/test\/([^/]+)/);
        if (urlTitleMatch && urlTitleMatch[1]) {
          const extractedTitle = urlTitleMatch[1];
          console.log('Extracted real title from URL path:', extractedTitle);
          // Update the title for display
          setTitle(extractedTitle.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '));
        }
      } catch (error) {
        console.error('Error extracting title from URL:', error);
      }
    }
  }, [titleSlug]);

  // If not mounted yet, don't render anything
  if (!mounted) return null;

  // Apply theme-based class names

  


  if (loading && !testCompleted) {
    return (
      <div className="min-h-screen pt-[80px] bg-[var(--background-color)] text-[var(--text-color)] transition-colors duration-300">
        <div className="container mx-auto px-4">
          <div className={`bg-[var(--card-bg)] rounded-xl p-8 ${theme === 'dark' ? 'shadow-[0_10px_25px_-5px_rgba(0,0,30,0.3),0_8px_10px_-6px_rgba(0,0,30,0.3)] border-2 border-[#3d4583]' : 'shadow-[8px_8px_0px_0px_#000000] border-4 border-black'} transition-colors duration-300`}>
            {/* Quiz Title with skeleton */}
            <h1 className="text-2xl md:text-3xl font-bold text-center relative mb-8">
              <span className={`inline-block ${theme === 'dark' ? 'bg-[#3d4583]' : 'bg-yellow-100'} h-3 absolute bottom-0 w-full opacity-40 -z-10 rounded`}></span>
              {title || (titleSlug === '%5Btitle%5D' ? 'Course Quiz' : 
                titleSlug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '))} Quiz
            </h1>
            
            {/* AI Generation Message */}
            <div className="max-w-lg mx-auto mb-8">
              <div className={`p-4 rounded-lg flex items-center ${theme === 'dark' ? 'bg-[#293056] border border-[#3d4583]' : 'bg-yellow-50 border border-yellow-200'}`}>
                <div className="mr-3 flex-shrink-0">
                  <div className="animate-pulse h-8 w-8 rounded-full bg-[#FFD700]"></div>
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1">AI is preparing your quiz</h3>
                  <p className="text-[var(--text-secondary)]">
                    Analyzing course content and generating personalized questions...
                  </p>
                </div>
              </div>
            </div>
            
            {/* Progress skeleton */}
            <div className="mb-8">
              <div className="flex flex-wrap justify-between items-center mb-3">
                <div className="animate-pulse h-6 w-24 bg-[var(--skeleton-color)] rounded"></div>
                <div className="animate-pulse h-6 w-28 bg-[var(--skeleton-color)] rounded"></div>
              </div>
              <div className={`h-3 ${theme === 'dark' ? 'bg-[#202443]' : 'bg-gray-100'} rounded-full overflow-hidden ${theme === 'dark' ? '' : 'border border-gray-300'}`}>
                <div className="h-full bg-[var(--skeleton-color)] rounded-full w-1/4 animate-pulse"></div>
              </div>
            </div>
            
            {/* Question skeleton */}
            <div className={`bg-[var(--card-bg)] p-6 rounded-lg mb-6 ${theme === 'dark' 
              ? 'border-2 border-[#3d4583] shadow-[0_4px_15px_rgba(30,40,100,0.4)]' 
              : 'border-4 border-black shadow-[4px_4px_0px_0px_#000000]'}`}>
              <div className="animate-pulse h-6 w-3/4 bg-[var(--skeleton-color)] rounded mb-3"></div>
              <div className="animate-pulse h-6 w-5/6 bg-[var(--skeleton-color)] rounded"></div>
            </div>
            
            {/* Answer options skeleton */}
            <div className="space-y-4 mb-6">
              {[1, 2, 3, 4].map((item) => (
                <div 
                  key={item}
                  className={`w-full p-4 rounded-md bg-[var(--option-bg)] border-2 border-[var(--card-border)] animate-pulse ${theme === 'dark' 
                    ? 'shadow-[0_4px_10px_rgba(0,0,30,0.3)]' 
                    : 'shadow-[4px_4px_0px_0px_var(--card-border)]'}`}
                >
                  <div className="flex items-center">
                    <div className="rounded-full w-8 h-8 bg-[var(--skeleton-color)] mr-3"></div>
                    <div className="h-5 bg-[var(--skeleton-color)] rounded w-3/4"></div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex justify-between mt-8">
              <Link 
                href={`/course/${titleSlug}`}
                className={`px-6 py-3 ${theme === 'dark' 
                  ? 'bg-[#475569] hover:bg-[#334155] text-white' 
                  : 'bg-gray-200 hover:bg-gray-300 text-black border-2 border-black shadow-[2px_2px_0px_0px_#000000]'} 
                  font-bold rounded-md transition-all duration-200`}
                prefetch={false}
              >
                Return to Course
              </Link>
              <div className="animate-pulse h-12 w-32 bg-[var(--skeleton-color)] rounded-md"></div>
            </div>
          </div>
        </div>
        
        {/* Inject CSS variables for skeleton colors */}
        <style jsx global>{`
          :root {
            --skeleton-color: ${theme === 'dark' ? '#3d4583' : '#e5e7eb'};
          }
        `}</style>
      </div>
    );
  }

  if (questions.length === 0 && !loading) {
    return (
      <div className={`min-h-screen pt-[80px] bg-[var(--background-color)] text-[var(--text-color)] transition-colors duration-300`}>
        <div className="container mx-auto px-4">
          <div className={`bg-[var(--card-bg)] rounded-xl p-8 ${theme === 'dark' ? 'shadow-[0_10px_25px_-5px_rgba(0,0,30,0.3),0_8px_10px_-6px_rgba(0,0,30,0.3)] border-2 border-[#3d4583]' : 'shadow-[8px_8px_0px_0px_#000000] border-4 border-black'} transition-colors duration-300`}>
            <h1 className="text-2xl md:text-3xl font-bold text-center mb-6">
              {title || titleSlug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
            </h1>
            <div className="flex justify-center mb-6">
              <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-md max-w-md">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm">No questions available for this course. The course may not have enough content to generate a test, or questions couldn't be generated at this time.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="text-center">
              <Link
                href={`/course/${titleSlug}`}
                className={`px-6 py-3 inline-block ${theme === 'dark' 
                  ? 'bg-[#a277ff] hover:bg-[#915eff] text-white shadow-md hover:shadow-lg' 
                  : 'bg-[#FFD700] hover:bg-[#f0c800] text-black border-4 border-black shadow-[4px_4px_0px_0px_#000000] hover:shadow-[6px_6px_0px_0px_#000000]'} 
                  font-bold rounded-md hover:-translate-y-1 transition-all duration-200`}
                prefetch={false}
              >
                Return to Course
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen pt-[50px] bg-[var(--background-color)] text-[var(--text-color)] transition-colors duration-300`}>
      <div className="container mx-auto px-4">
        <div className={`bg-[var(--card-bg)] rounded-xl p-8 ${theme === 'dark' ? 'shadow-[0_10px_25px_-5px_rgba(0,0,30,0.3),0_8px_10px_-6px_rgba(0,0,30,0.3)] border-2 border-[#3d4583]' : 'shadow-[8px_8px_0px_0px_#000000] border-4 border-black'} transition-colors duration-300`}>
          {/* Quiz Title */}
          <h1 className="text-2xl md:text-3xl font-bold text-center relative">
            <span className={`inline-block ${theme === 'dark' ? 'bg-[#3d4583]' : 'bg-yellow-100'} h-3 absolute bottom-0 w-full opacity-40 -z-10 rounded`}></span>
            {title || (titleSlug === '%5Btitle%5D' ? 'Course Quiz' : 
              titleSlug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '))}
          </h1>
          
          {/* Progress bar and info */}
          <div className="mb-8">
            <div className="flex flex-wrap justify-between items-center mb-3">
              <div className="flex items-center space-x-2 mb-2 sm:mb-0">
                <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full ${theme === 'dark' ? 'bg-[#3d4583]' : 'bg-[#6d28d9]'} text-white text-xs font-medium`}>
                  {currentQuestion + 1}
                </span>
                <p className={`text-sm text-[var(--text-color)]`}>
                  of {questions.length} questions
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                  questions[currentQuestion].difficulty.toLowerCase() === 'easy'
                    ? theme === 'dark' ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-800'
                    : questions[currentQuestion].difficulty.toLowerCase() === 'medium'
                    ? theme === 'dark' ? 'bg-yellow-900 text-yellow-300' : 'bg-yellow-100 text-yellow-800' 
                    : theme === 'dark' ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-800'
                }`}>
                  {questions[currentQuestion].difficulty.toUpperCase()}
                </span>
                <span className={`font-mono text-lg px-3 py-1 rounded-lg ${theme === 'dark' ? 'bg-[#3d4583] text-white' : 'bg-[#f0f0f0] text-black'} ${timeLeft <= 10 ? 'text-red-400 animate-pulse' : ''}`}>
                  {formatTime(timeLeft)}
                </span>
              </div>
            </div>
            <div className={`h-3 ${theme === 'dark' ? 'bg-[#202443]' : 'bg-gray-100'} rounded-full overflow-hidden ${theme === 'dark' ? '' : 'border border-gray-300'}`}>
              <div
                className={`h-full ${theme === 'dark' ? 'bg-[#a277ff]' : 'bg-[#6d28d9]'} rounded-full transition-all duration-300 relative`}
                style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
              >
                <div className={`absolute inset-0 ${theme === 'dark' ? 'bg-opacity-50 bg-purple-300' : 'bg-opacity-30 bg-white'} animate-pulse w-full`}></div>
              </div>
            </div>
          </div>

          {testCompleted ? (
            <div className="text-center py-8">
              <h2 className="text-3xl font-bold mb-6">Test Completed!</h2>
              
              <div className={`max-w-md mx-auto ${theme === 'dark' ? 'bg-[#293056]' : 'bg-white'} rounded-xl p-8 mb-8 ${theme === 'dark' ? 'border-2 border-[#3d4583] shadow-[0_10px_25px_-5px_rgba(0,0,30,0.4),0_8px_10px_-6px_rgba(0,0,30,0.4)]' : 'border-4 border-black shadow-[8px_8px_0px_0px_#000000]'}`}>
                <div className="mb-4">
                  <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-2 ${score >= 3 ? (theme === 'dark' ? 'bg-[#a277ff]' : 'bg-[#6d28d9]') : (theme === 'dark' ? 'bg-[#475569]' : 'bg-[#94a3b8]')}`}>
                    <span className="text-3xl font-bold text-white">{score}/{questions.length}</span>
                  </div>
                  
                  <p className="text-2xl font-bold mb-3">
                    Your score: {score} out of {questions.length}
                  </p>
                  
                  <div className={`text-lg px-4 py-3 rounded-lg ${
                    score >= 4 
                      ? theme === 'dark' ? 'bg-[#374151] text-green-400' : 'bg-green-100 text-green-800' 
                      : score >= 3 
                      ? theme === 'dark' ? 'bg-[#374151] text-blue-400' : 'bg-blue-100 text-blue-800'
                      : theme === 'dark' ? 'bg-[#374151] text-yellow-400' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {score >= 4 
                      ? "Excellent work! 🎉 You've mastered this topic!" 
                      : score >= 3 
                      ? "Good job! 👍 You're on the right track!" 
                      : "Keep practicing! 💪 You'll get it with more practice!"}
                  </div>
                </div>
                
                <div className={`pt-4 ${theme === 'dark' ? 'border-t border-[#3d4583]' : 'border-t-2 border-gray-200'}`}>
                  <p className="mb-4 text-[var(--text-color)] opacity-80">
                    {score >= 3 
                      ? "Ready to continue your learning journey?" 
                      : "Want to review the material and try again?"}
                  </p>
                  
                  <Link
                    href={`/course/${titleSlug}`}
                    className={`px-8 py-3 inline-block ${theme === 'dark' 
                      ? 'bg-[#a277ff] hover:bg-[#915eff] text-white' 
                      : 'bg-[#FFD700] hover:bg-[#f0c800] text-black'} 
                      font-bold rounded-md transition-all duration-200
                      ${theme === 'dark' 
                        ? 'shadow-[0_4px_10px_rgba(120,60,220,0.5)] hover:shadow-[0_6px_15px_rgba(120,60,220,0.6)] hover:-translate-y-1' 
                        : 'border-4 border-black shadow-[4px_4px_0px_0px_#000000] hover:shadow-[6px_6px_0px_0px_#000000] hover:-translate-y-1'}`}
                    prefetch={false}
                  >
                    Return to Course
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className={`bg-[var(--card-bg)] p-6 rounded-lg mb-6 ${theme === 'dark' 
                ? 'border-2 border-[#3d4583] shadow-[0_4px_15px_rgba(30,40,100,0.4)]' 
                : 'border-4 border-black shadow-[4px_4px_0px_0px_#000000]'
              }`}>
                <div className="flex items-start">
                  <div className={`mr-3 p-1.5 rounded-full ${theme === 'dark' ? 'bg-[#3d4583]' : 'bg-yellow-100'} flex-shrink-0 mt-1`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className={`w-5 h-5 ${theme === 'dark' ? 'text-white' : 'text-yellow-800'}`} viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-[var(--question-text)]">{questions[currentQuestion].question}</h2>
                </div>
              </div>
              
              <div className="space-y-4 mb-6">
                {questions[currentQuestion].options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleAnswerSelect(index)}
                    disabled={selectedAnswer !== null || isTimeUp}
                    className={`w-full p-4 text-left rounded-md transition-all duration-200 
                      ${selectedAnswer === null && !isTimeUp
                        ? `bg-[var(--option-bg)] hover:bg-[var(--option-hover-bg)] border-2 border-[var(--card-border)] 
                           ${theme === 'dark' 
                             ? 'shadow-[0_4px_10px_rgba(0,0,30,0.3)] hover:shadow-[0_6px_15px_rgba(0,0,30,0.4)] hover:-translate-y-0.5' 
                             : 'shadow-[4px_4px_0px_0px_var(--card-border)] hover:shadow-[5px_5px_0px_0px_var(--card-border)] hover:-translate-y-0.5'}`
                        : index === questions[currentQuestion].correctAnswer
                        ? `bg-green-500 border-2 border-green-700 
                           ${theme === 'dark' 
                             ? 'shadow-[0_4px_10px_rgba(0,100,0,0.4)]' 
                             : 'shadow-[4px_4px_0px_0px_#15803d]'}`
                        : selectedAnswer === index
                        ? `bg-[var(--error-light)] border-2 border-red-700 
                           ${theme === 'dark' 
                             ? 'shadow-[0_4px_10px_rgba(100,0,0,0.4)]' 
                             : 'shadow-[4px_4px_0px_0px_#7f1d1d]'}`
                        : `bg-[var(--option-bg)] border-2 border-[var(--card-border)] opacity-60`
                      }`}
                  >
                  <div className="flex items-start">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full mr-3 flex-shrink-0 ${
                        selectedAnswer === null 
                          ? theme === 'dark' 
                            ? 'bg-[var(--purple-secondary)] text-white ring-2 ring-offset-2 ring-offset-[#1e293b] ring-[var(--purple-secondary)]' 
                            : 'bg-[var(--purple-light)] text-black ring-2 ring-[var(--purple-primary)]' 
                          : index === questions[currentQuestion].correctAnswer
                          ? 'bg-green-700 text-white ring-2 ring-offset-2 ring-offset-green-500 ring-green-300'
                          : selectedAnswer === index
                          ? 'bg-red-700 text-white ring-2 ring-offset-2 ring-offset-red-500 ring-red-300'
                          : theme === 'dark' 
                            ? 'bg-[var(--purple-secondary)] text-white' 
                            : 'bg-[var(--purple-light)] text-black'
                      }`}>
                        {String.fromCharCode(65 + index)}
                      </span>
                      <span className={`pt-1 text-[var(--question-text)]`}>{option}</span>
                    </div>
                  </button>
                ))}
              </div>

              {(showExplanation || isTimeUp) && (
                <div className={`mt-6 p-5 rounded-md ${
                  theme === 'dark' 
                    ? 'bg-gradient-to-r from-[#293056] to-[#3d4583] shadow-[0_4px_12px_rgba(0,0,30,0.4)] border-2 border-[#3d4583]' 
                    : 'bg-gradient-to-r from-yellow-50 to-amber-50 shadow-[4px_4px_0px_0px_#000000] border-4 border-black'
                }`}>
                  {isTimeUp && selectedAnswer === null && (
                    <div className="flex items-center mb-3 text-red-400">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9 5a1 1 0 012 0v5a1 1 0 01-1 1H6a1 1 0 110-2h2V5z" clipRule="evenodd" />
                      </svg>
                      <p className="font-semibold">Time's up! The correct answer was:</p>
                    </div>
                  )}
                  
                  <div className="flex">
                    <div className={`flex-shrink-0 mr-3 ${theme === 'dark' ? 'text-blue-300' : 'text-blue-700'}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className={`font-bold mb-1 ${theme === 'dark' ? 'text-blue-300' : 'text-blue-700'}`}>
                        Explanation:
                      </p>
                      <p className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
                        {questions[currentQuestion].explanation}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {(selectedAnswer !== null || isTimeUp) && (
                <div className="mt-8 text-center">
                  <button
                    onClick={handleNextQuestion}
                    className={`px-6 py-3 ${theme === 'dark' 
                      ? 'bg-[#a277ff] hover:bg-[#915eff] text-white' 
                      : 'bg-[#FFD700] hover:bg-[#f0c800] text-black'} 
                      font-bold rounded-md transition-all duration-300
                      ${theme === 'dark' 
                        ? 'shadow-[0_4px_10px_rgba(120,60,220,0.5)] hover:shadow-[0_6px_15px_rgba(120,60,220,0.6)] hover:-translate-y-1' 
                        : 'border-4 border-black shadow-[4px_4px_0px_0px_#000000] hover:shadow-[6px_6px_0px_0px_#000000] hover:-translate-y-1'}`}
                  >
                    {currentQuestion < questions.length - 1 ? "Next Question" : "Finish Test"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
} 