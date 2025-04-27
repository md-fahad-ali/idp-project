"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useDashboard } from "../../provider";
import { useTheme } from "../../provider/theme-provider";
import confetti from 'canvas-confetti';
import { Question, ICourse } from '../../../types';
import { generateQuestionsFromLessons } from '../../utils/groq';
import Loading from '../../../components/ui/Loading';

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
  const [startTime] = useState<number>(Date.now());
  const [showConfetti, setShowConfetti] = useState<boolean>(false);

  useEffect(() => {
    const loadQuestionsForCourse = async () => {
      if (!token) return;

      try {
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
          const matchingCourse = data.courses.find((c: ICourse) => {
            const courseSlug = c.title.toLowerCase().replace(/\s+/g, '-');
            return courseSlug === titleSlug;
          });
          
          if (matchingCourse) {
            setCourseId(matchingCourse._id);
            const generatedQuestions = await generateQuestionsFromLessons(matchingCourse.lessons);
            const shuffledQuestions = [...generatedQuestions.questions].sort(() => Math.random() - 0.5);
            setQuestions(shuffledQuestions.slice(0, 5));
            if (shuffledQuestions.length > 0) {
              setTimeLeft(shuffledQuestions[0].timeLimit);
            }
          }
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Error loading questions:", error);
        setLoading(false);
      }
    };

    loadQuestionsForCourse();
  }, [titleSlug, token]);

  useEffect(() => {
    if (testCompleted || loading || !questions.length || selectedAnswer !== null || isTimeUp) {
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsTimeUp(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentQuestion, testCompleted, loading, questions.length, selectedAnswer, isTimeUp]);

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
      const timeSpent = Math.floor((Date.now() - startTime) / 1000); // Convert to seconds

      try {
        if (!user || !user._id) {
          console.error('Missing user ID for test submission');
          throw new Error('User ID not available');
        }
        
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
            timeSpent
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Server response:', response.status, errorText);
          throw new Error('Failed to submit test results');
        }

        // Show confetti for good scores
        if (finalScore >= 3) {
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 5000);
        }

        setTestCompleted(true);
      } catch (error) {
        console.error('Error submitting test results:', error);
        // Still mark test as completed even if submission fails
        setTestCompleted(true);
      }
    }
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

  // If not mounted yet, don't render anything
  if (!mounted) return null;

  // Apply theme-based class names

  


  if (loading) {
    return (
      <div className={`min-h-screen pt-[80px] bg-[var(--background-color)] text-[var(--text-color)] transition-colors duration-300`}>
        <div className="container mx-auto px-4">
          <div className={`bg-[var(--card-bg)] rounded-xl p-8 ${theme === 'dark' ? 'shadow-[0_10px_25px_-5px_rgba(0,0,30,0.3),0_8px_10px_-6px_rgba(0,0,30,0.3)] border-2 border-[#3d4583]' : 'shadow-[8px_8px_0px_0px_#000000] border-4 border-black'} transition-colors duration-300`}>
            <Loading />
          </div>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className={`min-h-screen pt-[80px] bg-[var(--background-color)] text-[var(--text-color)] transition-colors duration-300`}>
        <div className="container mx-auto px-4">
          <div className={`bg-[var(--card-bg)] rounded-xl p-8 ${theme === 'dark' ? 'shadow-[0_10px_25px_-5px_rgba(0,0,30,0.3),0_8px_10px_-6px_rgba(0,0,30,0.3)] border-2 border-[#3d4583]' : 'shadow-[8px_8px_0px_0px_#000000] border-4 border-black'} transition-colors duration-300`}>
            <p className="text-center text-lg">No questions available for this course.</p>
            <div className="mt-6 text-center">
              <button
                onClick={() => router.back()}
                className={`px-6 py-3 ${theme === 'dark' 
                  ? 'bg-[#a277ff] hover:bg-[#915eff] text-white shadow-md hover:shadow-lg' 
                  : 'bg-[#FFD700] hover:bg-[#f0c800] text-black border-4 border-black shadow-[4px_4px_0px_0px_#000000] hover:shadow-[6px_6px_0px_0px_#000000]'} 
                  font-bold rounded-md hover:-translate-y-1 transition-all duration-200`}
              >
                Return to Course
              </button>
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
            {titleSlug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')} Quiz
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
                  
                  <button
                    onClick={() => router.back()}
                    className={`px-8 py-3 ${theme === 'dark' 
                      ? 'bg-[#a277ff] hover:bg-[#915eff] text-white' 
                      : 'bg-[#FFD700] hover:bg-[#f0c800] text-black'} 
                      font-bold rounded-md transition-all duration-200
                      ${theme === 'dark' 
                        ? 'shadow-[0_4px_10px_rgba(120,60,220,0.5)] hover:shadow-[0_6px_15px_rgba(120,60,220,0.6)] hover:-translate-y-1' 
                        : 'border-4 border-black shadow-[4px_4px_0px_0px_#000000] hover:shadow-[6px_6px_0px_0px_#000000] hover:-translate-y-1'}`}
                  >
                    Return to Course
                  </button>
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