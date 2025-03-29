"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useDashboard } from "../../provider";
import confetti from 'canvas-confetti';
import { Question, TestData, ICourse } from '../../../types';
import { generateQuestionsFromLessons } from '../../utils/groq';
import Loading from '../../../components/ui/Loading';

export default function TestPage() {
  const params = useParams();
  const router = useRouter();
  const { token, user } = useDashboard();
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
        console.log('Token before submission:', token);
        console.log('User data:', user);
        
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
        return 'text-green-400';
      case 'medium':
        return 'text-yellow-400';
      case 'hard':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-[100px] bg-[#6016a7] text-[#E6F1FF]">
        <div className="container mx-auto px-4">
          <div className="bg-[#294268] border-4 border-black rounded-lg p-6 shadow-[8px_8px_0px_0px_#000000]">
            <Loading />
          </div>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen pt-[100px] bg-[#6016a7] text-[#E6F1FF]">
        <div className="container mx-auto px-4">
          <div className="bg-[#294268] border-4 border-black rounded-lg p-6 shadow-[8px_8px_0px_0px_#000000]">
            <p className="text-center">No questions available for this course.</p>
            <div className="mt-6 text-center">
              <button
                onClick={() => router.back()}
                className="px-6 py-3 bg-[#FFD700] text-black font-bold rounded-md border-4 border-black shadow-[4px_4px_0px_0px_#000000] hover:shadow-[6px_6px_0px_0px_#000000] transition-all duration-200"
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
    <div className="min-h-screen pt-[100px] bg-[#6016a7] text-[#E6F1FF]">
      <div className="container mx-auto px-4">
        <div className="bg-[#294268] border-4 border-black rounded-lg p-6 shadow-[8px_8px_0px_0px_#000000]">
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm text-[#8892B0]">
                Question {currentQuestion + 1} of {questions.length}
              </p>
              <div className="flex items-center gap-4">
                <span className={getDifficultyColor(questions[currentQuestion].difficulty)}>
                  {questions[currentQuestion].difficulty.toUpperCase()}
                </span>
                <span className={`font-mono text-lg ${timeLeft <= 10 ? 'text-red-400 animate-pulse' : 'text-[#E6F1FF]'}`}>
                  {formatTime(timeLeft)}
                </span>
              </div>
            </div>
            <div className="h-4 bg-[#2f235a] rounded-full border-2 border-black">
              <div
                className="h-full bg-[#9D4EDD] rounded-full transition-all duration-300"
                style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
              ></div>
            </div>
          </div>

          {testCompleted ? (
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">Test Completed!</h2>
              <p className="text-xl mb-4">
                Your score: {score} out of {questions.length}
              </p>
              <p className="mb-6">
                {score >= 4 ? "Excellent work! 🎉" :
                 score >= 3 ? "Good job! 👍" :
                 "Keep practicing! 💪"}
              </p>
              <button
                onClick={() => router.back()}
                className="px-6 py-3 bg-[#FFD700] text-black font-bold rounded-md border-4 border-black shadow-[4px_4px_0px_0px_#000000] hover:shadow-[6px_6px_0px_0px_#000000] transition-all duration-200"
              >
                Return to Course
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold mb-6">{questions[currentQuestion].question}</h2>
              <div className="space-y-4">
                {questions[currentQuestion].options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleAnswerSelect(index)}
                    disabled={selectedAnswer !== null || isTimeUp}
                    className={`w-full p-4 text-left border-4 border-black rounded-md transition-all duration-200 ${
                      selectedAnswer === null && !isTimeUp
                        ? "bg-[#2f235a] hover:bg-[#3a2b6e] shadow-[4px_4px_0px_0px_#000000]"
                        : index === questions[currentQuestion].correctAnswer
                        ? "bg-[#5CDB95] text-black shadow-[4px_4px_0px_0px_#000000]"
                        : selectedAnswer === index
                        ? "bg-[#FF6B6B] text-white shadow-[4px_4px_0px_0px_#000000]"
                        : "bg-[#2f235a] opacity-50"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>

              {(showExplanation || isTimeUp) && (
                <div className="mt-6 p-4 bg-[#2f235a] border-4 border-black rounded-md shadow-[4px_4px_0px_0px_#000000]">
                  {isTimeUp && selectedAnswer === null && (
                    <p className="text-red-400 mb-2">Time's up! The correct answer was:</p>
                  )}
                  <p className="text-[#E6F1FF]">
                    {questions[currentQuestion].explanation}
                  </p>
                </div>
              )}

              {(selectedAnswer !== null || isTimeUp) && (
                <div className="mt-6 text-center">
                  <button
                    onClick={handleNextQuestion}
                    className="px-6 py-3 bg-[#FFD700] text-black font-bold rounded-md border-4 border-black shadow-[4px_4px_0px_0px_#000000] hover:shadow-[6px_6px_0px_0px_#000000] transition-all duration-200"
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