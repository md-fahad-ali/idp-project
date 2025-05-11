import { useState, useEffect, useRef } from 'react';
import { useDashboard } from '../provider';
import initSocket, * as socketService from "../services/socketService";
import ChallengeRoom from './ChallengeRoom';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { joinChallengeRoom, confirmLeaveRoom } from '../services/socketService';
import { Question } from "@/types";
import { motion } from 'framer-motion';



interface RoomData {
  challenger: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  challenged: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
}

interface OpponentLeftData {
  roomId: string;
  userId: string;
  userName: string;
}

interface RoomStatusResponse {
  isInRoom: boolean;
}

interface ChallengeStatusUpdate {
  isInChallenge: boolean;
  challengeId: string | null;
  opponentId: string | null;
}

interface UserAnswer {
  userId: string;
  userName: string;
  answer: string;
  isCorrect?: boolean;
}

export default function ChallengeQuiz() {
  const router = useRouter();
  const { user } = useDashboard();
  const { title, user1, user2 } = useParams();
  const searchParams = useSearchParams();
  const roomId = searchParams.get('roomId');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [bothAnswered, setBothAnswered] = useState(false);
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [questionCounter, setQuestionCounter] = useState<number>(0);
  const [forceTotalQuestions, setForceTotalQuestions] = useState<number | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<{
    id: string, 
    text: string, 
    options: string[], 
    topic?: string,
    questionNumber?: number,
    totalQuestions?: number,
    correctAnswer?: string
  } | null>(null);
  const [courseName, setCourseName] = useState<string>('');
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
  const [showAnswers, setShowAnswers] = useState<boolean>(false);
  const [nextQuestionCountdown, setNextQuestionCountdown] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const questionStartTime = useRef(Date.now());
  const socketRef = useRef(initSocket());
  const receivedResultsRef = useRef(false);
  const [userScores, setUserScores] = useState<{[userId: string]: number}>({});
  const [totalExpectedQuestions, setTotalExpectedQuestions] = useState<number>(5);
  const [receivedQuestions, setReceivedQuestions] = useState<Set<string>>(new Set());
  const [uniqueQuestionCount, setUniqueQuestionCount] = useState<number>(0);
  const [enforcedTotalQuestions] = useState<number>(5); // Always enforce 5 questions
  const [preparingQuestions, setPreparingQuestions] = useState<boolean>(false);
  const [questionNumber, setQuestionNumber] = useState<number>(0);
  const [totalQuestions, setTotalQuestions] = useState<number>(0);
  const [processedQuestionIds, setProcessedQuestionIds] = useState<string[]>([]);
  const [showConfirmExit, setShowConfirmExit] = useState<boolean>(false);
  const [leaveData, setLeaveData] = useState<any>(null);
  
  // Log roomId for debugging
  useEffect(() => {
    console.log('Room ID from URL:', roomId);
    if (!roomId) {
      setErrorMessage('Room not found: Missing room ID in URL');
    }
  }, [roomId]);
  
  // Handle socket identification and reconnection
  useEffect(() => {
    const socket = socketRef.current;
    
    // Function to identify user to socket
    const identifyUser = () => {
      if (user?._id) {
        console.log('[DEBUG] Identifying user to socket:', user._id);
        socketService.forceIdentify(user._id);
      }
    };

    // Initial identification
    identifyUser();

    // Handle socket disconnection and reconnection
    socket.on('connect', () => {
      console.log('[DEBUG] Socket connected, identifying user...');
      identifyUser();
    });
    
    // Re-identify on a regular interval to ensure connection is maintained
    const identifyInterval = setInterval(() => {
      if (user?._id) {
        console.log('[DEBUG] Periodic re-identification for user:', user._id);
        socketService.forceIdentify(user._id);
        }
    }, 30000); // Every 30 seconds

    socket.on('disconnect', () => {
      console.log('[DEBUG] Socket disconnected');
    });

    socket.on('error', (error: Error) => {
      console.error('[DEBUG] Socket error:', error);
      setErrorMessage('Connection error. Please refresh the page.');
    });

    // Listen for room data
    socket.on('room_data', (data: RoomData) => {
      console.log('[DEBUG] Room data received:', data);
      setRoomData(data);
    });

    return () => {
      console.log('[DEBUG] Cleaning up main socket listeners');
      socket.off('connect');
      socket.off('disconnect');
      socket.off('error');
      socket.off('room_data');
      clearInterval(identifyInterval);
    };
  }, [user]);

  // Start timer when component mounts, but only auto-submit if not loading and IDs are available
  useEffect(() => {
    // Clear any existing timer when setting up a new one
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    // Set up a 1-second interval for precise countdown
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        // When time reaches 0
        if (prev <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
          }
          // Only auto-submit if not loading and both user ID and room ID are available
          if (!selectedOption && !bothAnswered && !isLoading && user?._id && roomId) {
            handleSubmit('timeout');
          }
          return 0;
        }
        // Count down by exactly 1 second at a time
        return prev - 1;
      });
    }, 1000); // Exactly 1 second interval
  
    // Cleanup function
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);
  
  // Add socket listeners
  useEffect(() => {
    const socket = socketRef.current;
    
    socket.on('answer_error', (message: string) => {
      setErrorMessage(`Error: ${message}`);
      console.error('Answer submission error:', message);
    });
    
    // Listen for system messages like waiting for players
    socket.on('system_message', (data: { type: string, message: string }) => {
      console.log('System message received:', data);
      
      if (data.type === 'waiting_for_players') {
        setErrorMessage(data.message);
        // Show a loading toast
        toast.loading(data.message, {
          id: 'waiting-for-players',
          duration: 3000
        });
      }
      
      // Add handler for preparing questions message
      if (data.type === 'preparing_questions') {
        setPreparingQuestions(true);
        setErrorMessage(data.message);
        // Show a loading toast
        toast.loading(data.message, {
          id: 'preparing-questions',
          duration: 5000 // Longer duration as AI question generation takes time
        });
      }
    });
    
    // Listen for challenge started
    socket.on('challenge_started', (data: { preparingQuestions?: boolean }) => {
      console.log('Challenge started event received:', data);
      
      // Check if questions are being prepared
      if (data.preparingQuestions) {
        setPreparingQuestions(true);
        setErrorMessage('Preparing questions for your challenge...');
        // Show a loading toast
        toast.loading('Preparing your questions...', {
          id: 'preparing-questions',
          duration: 5000
        });
      }
    });
    
    // Listen for when both users have answered
    socket.on('both_answered', (data: { userAnswers: UserAnswer[], correctAnswer: string, scores: {[userId: string]: number} }) => {
      console.log('Both answered event received:', data);
      setBothAnswered(true);
      setUserAnswers(data.userAnswers);
      setShowAnswers(true);
      
      // Update scores
      if (data.scores) {
        setUserScores(data.scores);
      }
      
      // If we have current question info, update it with correct answer
      if (currentQuestion) {
        setCurrentQuestion({
          ...currentQuestion,
          correctAnswer: data.correctAnswer
        });
      }
      
      // Stop the timer when both have answered
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      // Start countdown to next question
      setNextQuestionCountdown(5);
      const countdownInterval = setInterval(() => {
        setNextQuestionCountdown(prev => {
          if (prev === null || prev <= 1) {
            clearInterval(countdownInterval);
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    });
    
    // Listen for user answer broadcasts
    socket.on('user_answer', (data: UserAnswer) => {
      console.log('User answer received:', data);
      setUserAnswers(prev => [...prev, data]);
    });
    
    // Listen for score broadcasts
    socket.on('score_broadcast', (data: { 
      userId: string, 
      userName: string, 
      score: number, 
      isCorrect: boolean 
    }) => {
      console.log('Score broadcast received:', data);
      
      // Update the score for this user
      setUserScores(prev => ({
        ...prev,
        [data.userId]: data.score
      }));
      
      // Show a toast notification for the score
      if (data.userId !== user?._id) {
        const scoreMessage = data.isCorrect 
          ? `${data.userName} answered correctly (+10 points)` 
          : `${data.userName} answered incorrectly (0 points)`;
          
        toast(scoreMessage, {
          icon: data.isCorrect ? '✅' : '❌',
          duration: 2000,
          position: 'top-right',
          style: {
            background: data.isCorrect ? '#4ade80' : '#f87171',
            color: 'white',
            fontSize: '14px',
            padding: '12px'
          }
        });
      }
    });
    
    // Listen for time sync from server
    socket.on('time_sync', (data: { timeLeft: number }) => {
      console.log('Time sync received:', data);
      // Set exact time left, no manipulation
      setTimeLeft(data.timeLeft);
    });
    
    // Listen for new questions
    socket.on('new_question', (data: any) => {
      // Clear preparing questions state when first question arrives
      setPreparingQuestions(false);
      setErrorMessage(null);
      // Dismiss any loading toasts
      toast.dismiss('preparing-questions');
      toast.dismiss('waiting-for-players');
      
      console.log('Received question data:', data);
      
      // Validate the question data
      if (!data.question || !data.question.id || !data.question.text || !Array.isArray(data.question.options)) {
        console.error('Invalid question data received:', data);
        toast.error('Invalid question received. Using fallback question.', {
          id: 'invalid-question',
          duration: 3000
        });
        return;
      }
      
      // Check if this is a duplicate question by tracking question IDs
      const questionId = data.question?.id || '';
      const isDuplicate = receivedQuestions.has(questionId);
      
      if (isDuplicate) {
        console.warn(`⚠️ DUPLICATE QUESTION DETECTED! Question ID: ${questionId}`);
        
        if (roomId && user?._id) {
          console.log(`Handling duplicate question (ID: ${questionId})`);
          toast.error('Duplicate question detected', {
            id: 'duplicate-question',
            duration: 3000
          });
          
          // Get array of all previously received question IDs to exclude
          const questionIdsToExclude = Array.from(receivedQuestions);
          
          try {
            // Try to request a new question (if server supports it)
            socketService.requestNewQuestion(roomId, user._id, questionIdsToExclude);
          } catch (error) {
            console.error('Failed to request new question:', error);
          }
          
          // Fallback: Since the server may not support requesting new questions,
          // we'll handle the duplicate by marking it as such but still showing it
          data.question.text = `[⚠️ REPEAT QUESTION] ${data.question.text}`;
        }
      } else {
        // Only increment unique question count for new questions
        setUniqueQuestionCount(prev => prev + 1);
      }
      
      // Track this question ID
      setReceivedQuestions(prev => {
        const updated = new Set(prev);
        updated.add(questionId);
        return updated;
      });
      
      // Update the question counter and use the new value directly
      setQuestionCounter(prev => {
        const newCounter = prev + 1;
        
        // Log the counter for debugging
        console.log(`Current question number: ${newCounter}`);
        console.log(`Unique questions count: ${uniqueQuestionCount + (isDuplicate ? 0 : 1)}`);
        
        // Always use the enforced total questions for display
        const totalQuestionsToDisplay = enforcedTotalQuestions;
        
        console.log(`Displaying as: Question ${newCounter} of ${totalQuestionsToDisplay}`);
        
        // Validate question data - IMPORTANT: This is the fix for the template questions issue
        const questionToShow = data.question && typeof data.question === 'object' ? data.question : null;
        
        // Debug log the actual question data
        console.log('Raw question data received:', questionToShow);
        
        // Make sure we have valid question data with all required fields
        if (!questionToShow || !questionToShow.text || !Array.isArray(questionToShow.options) || questionToShow.options.length < 2) {
          console.error('Invalid question data received:', questionToShow);
          
          // Alert the developers about the issue
          toast.error('Invalid question data received. Contact support.', {
            id: 'invalid-question',
            duration: 5000
          });
          
          // Don't update the state with invalid data
          return prev;
        }
        
        // Enhance question object with question number info
        const enhancedQuestion = {
          ...questionToShow, // Use the validated question data
          questionNumber: newCounter,
          totalQuestions: totalQuestionsToDisplay
        };
        
        console.log('Enhanced question with numbers:', enhancedQuestion);
        setCurrentQuestion(enhancedQuestion);
        setTimeLeft(data.timeLimit || 15);  // Default to 15 seconds if not specified
        setBothAnswered(false);
        setSelectedOption(null);
        setUserAnswers([]);
        setShowAnswers(false);
        setNextQuestionCountdown(null);
        
        // Reset timer
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
        
        // Start the timer for this question
        questionStartTime.current = Date.now();
        
        // Set up a countdown timer
        timerRef.current = setInterval(() => {
          setTimeLeft(prev => {
            if (prev <= 0) {
              if (timerRef.current) clearInterval(timerRef.current);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        
        setIsLoading(false); // Question is loaded, remove loading state
        return newCounter;
      });
    });
    
    // Let TypeScript infer the type from the socketService
    const cleanupUserAnswer = socketService.onUserAnswer((data) => {
      console.log('User answer received via helper:', data);
      // This is handled directly by the socket.on('user_answer') above
    });
    
    // Let TypeScript infer the type from the socketService
    const cleanupTimeSync = socketService.onTimeSync((data) => {
      console.log('Time sync received via helper:', data);
      // This is handled directly by the socket.on('time_sync') above
    });
    
    return () => {
      socket.off('answer_error');
      socket.off('both_answered');
      socket.off('new_question');
      socket.off('user_answer');
      socket.off('time_sync');
      socket.off('score_broadcast');
      socket.off('challenge_started');
      cleanupUserAnswer();
      cleanupTimeSync();
    };
  }, [user?._id]);

  // Add challenge status update handler
  useEffect(() => {
    const socket = socketRef.current;
    
    // Reset receivedResultsRef to false when this effect runs
    receivedResultsRef.current = false;
    
    // Listen for challenge results to redirect to results page with proper type
    socket.on('challenge_results', (data: { 
      roomId: string;
      questions?: any[];
      [key: string]: any;
    }) => {
      console.log('Challenge results received:', data);
      
      // Debug the actual questions count from server
      if (data.questions && Array.isArray(data.questions)) {
        const actualQuestionCount = data.questions.length;
        console.log(`ACTUAL QUESTION COUNT FROM SERVER: ${actualQuestionCount}`);
        console.log('All questions from server:', data.questions);
        
        // Check for duplicate questions in the results
        const uniqueQuestionIds = new Set<string>();
        const duplicates: string[] = [];
        
        data.questions.forEach((q: { id?: string }) => {
          if (q.id) {
            if (uniqueQuestionIds.has(q.id)) {
              duplicates.push(q.id);
            } else {
              uniqueQuestionIds.add(q.id);
            }
          }
        });
        
        // Display in console how many unique questions were actually received
        const uniqueCount = uniqueQuestionIds.size;
        console.log(`Number of unique questions received: ${uniqueCount} out of ${actualQuestionCount} total`);
        
        if (duplicates.length > 0) {
          console.warn(`⚠️ FOUND ${duplicates.length} DUPLICATE QUESTIONS IN RESULTS:`, duplicates);
        }
        
        // Check if server is sending fewer questions than expected
        if (uniqueCount < enforcedTotalQuestions) {
          console.warn(`⚠️ SERVER SENT ONLY ${uniqueCount} UNIQUE QUESTIONS INSTEAD OF ${enforcedTotalQuestions}!`);
        }
      }
      
      // Prevent duplicate redirects
      if (receivedResultsRef.current) {
        console.log('Already received results, ignoring duplicate');
        return;
      }
      
      // Store challenge results in localStorage
      localStorage.setItem(`challenge_results_${data.roomId}`, JSON.stringify(data));
      
      // Mark that we've received results to prevent leaderboard redirect
      receivedResultsRef.current = true;
      
      // Redirect to results page
      router.push(`/course/${title}/challenge-result?roomId=${data.roomId}`);
    });
    
    // Store challenge results event
    socket.on('store_challenge_results', (data: { 
      roomId: string;
      [key: string]: any;
    }) => {
      console.log('Storing challenge results in localStorage:', data);
      localStorage.setItem(`challenge_results_${data.roomId}`, JSON.stringify(data));
    });
    
    // NEW: Handle forced redirect to results page
    socket.on('force_redirect_to_results', (data: {
      url: string;
      roomId: string;
    }) => {
      console.log('Received forced redirect to results:', data);
      
      // Prevent duplicate redirects
      if (receivedResultsRef.current) {
        console.log('Already redirecting to results, ignoring duplicate');
        return;
      }
      
      // Mark that we're redirecting to results
      receivedResultsRef.current = true;
      
      // Clean up before redirecting
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      // Cancel any other redirect timers
      toast.dismiss();
      
      // Show a toast notification
      toast.success('Challenge completed! Redirecting to results...', {
        duration: 2000,
        position: 'top-center',
        style: {
          background: '#4ade80',
          color: '#fff',
          fontWeight: 'bold',
          fontSize: '16px',
          padding: '16px',
        },
        icon: '🏆',
      });
      
      // Redirect immediately to results page with the correct URL parameters
      console.log(`Redirecting to results page: ${data.url}`);
      router.push(data.url);
    });
    
    socket.on('challenge_status_update', (data: ChallengeStatusUpdate) => {
      // If we're no longer in a challenge, redirect back ONLY if we haven't received results
      if (!data.isInChallenge && !receivedResultsRef.current) {
        console.log('Challenge ended without results, redirecting to leaderboard');
        
        // Clean up before redirecting
        socket.off('challenge_results');
        socket.off('store_challenge_results');
        socket.off('challenge_status_update');
        socket.off('force_redirect_to_results');
        
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
        localStorage.removeItem('challengeRoomInfo');
        localStorage.removeItem('roomUrl');
        router.push(`/course/${title}/leaderboard`);
      }
    });

    return () => {
      socket.off('challenge_status_update');
      socket.off('challenge_results');
      socket.off('store_challenge_results');
      socket.off('force_redirect_to_results');
    };
  }, [title, router]);

  // Format time from seconds to display format
  const formatTime = (seconds: number): string => {
    // Ensure seconds is a valid number
    const validSeconds = Math.max(0, Math.round(seconds));
    return `${validSeconds}s`;
  };
  
  const handleSubmit = (answer: string, answerIndex?: number) => {
    if (!user?._id || !roomId) {
      setErrorMessage('Cannot submit answer: Missing user ID or room ID');
      return;
    }
    
    setSelectedOption(answer);
    
    const timeSpent = (Date.now() - questionStartTime.current) / 1000; // in seconds
    
    // Use the actual roomId from URL params and current question ID
    const questionId = currentQuestion?.id || 'question-1';
    
    console.log(`Submitting answer to room ${roomId}`);
    
    // Include both the answer text and the answer letter (A, B, C, D)
    const answerLetter = answerIndex !== undefined 
      ? String.fromCharCode(65 + answerIndex) // Convert 0 to A, 1 to B, etc.
      : '';
    
    // Pass the answer letter as a parameter
    socketService.submitAnswer(
      roomId,
      user._id,
      questionId,
      answer,
      timeSpent,
      answerLetter
    );
  };
  
  const handleExitGame = () => {
    if (roomData && user?._id) {
      try {
        // Debug logs
        console.log("[DEBUG] Starting exit game process");
        
        // Use the room ID from URL if available, otherwise fallback to constructed ID
        const actualRoomId = roomId || `${title}_${user1}_${user2}`;
        console.log("[DEBUG] Using room ID:", actualRoomId);
        
        // Store leave data for confirmation instead of immediately leaving
        const data = socketService.leaveRoom(
          actualRoomId,
          user._id,
          roomData.challenger.id === user._id,
          'Sorry, I had to leave the challenge. Maybe we can play again later!'
        );
        
        // Save the leave data and show confirmation dialog
        setLeaveData(data);
        setShowConfirmExit(true);
      } catch (error) {
        console.error('Error preparing to exit game:', error);
        setErrorMessage('Failed to prepare game exit. Please refresh the page.');
      }
    }
  };
  
  // New function to confirm leaving the game
  const confirmExitGame = () => {
    if (!leaveData) return;
    
    try {
      // Actually send the leave room event using the stored data
      confirmLeaveRoom(leaveData);
      
      // Clear any existing timers
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      // Reset local state
      setSelectedOption(null);
      setTimeLeft(30);
      setErrorMessage(null);
      setBothAnswered(false);
      setRoomData(null);
      setQuestionCounter(0);
      setReceivedQuestions(new Set());
      setUniqueQuestionCount(0);
      setShowConfirmExit(false);
      
      // Clear localStorage data
      localStorage.removeItem('roomUrl');
      localStorage.removeItem('challengeRoomInfo');

      // Navigate back to course page
      router.push(`/course/${title}/leaderboard`);

      // Don't disconnect socket, just re-identify
      const socket = socketRef.current;
      socket.emit('identify', { userId: user?._id });
    } catch (error) {
      console.error('Error during game exit:', error);
      setErrorMessage('Failed to exit game properly. Please refresh the page.');
    }
  };
  
  // Cancel exit function
  const cancelExitGame = () => {
    setShowConfirmExit(false);
    setLeaveData(null);
  };

  // Join the challenge room when the component mounts
  useEffect(() => {
    if (roomId && user?._id) {
      console.log(`[DEBUG] Joining room ${roomId} for user ${user._id}`);
      
      // Reset the question counter and tracking when joining a new room
      setQuestionCounter(0);
      setReceivedQuestions(new Set());
      setUniqueQuestionCount(0);
      
      // Clear any previous error messages
      setErrorMessage(null);
      
      // Use the improved joinChallengeRoom function that returns a Promise
      joinChallengeRoom(roomId, user._id)
        .then(success => {
          if (success) {
            console.log(`[DEBUG] Successfully joined room ${roomId}`);
            setErrorMessage(null);
          } else {
            console.error(`[DEBUG] Failed to join room ${roomId}`);
            setErrorMessage('Failed to join the challenge room. Please try refreshing the page.');
            setIsLoading(false);
          }
        })
        .catch(error => {
          console.error('[DEBUG] Error joining challenge room:', error);
          setErrorMessage(`Error joining room: ${error.message || 'Unknown error'}`);
          setIsLoading(false);
        });
      
      // Add a listener for socket connection status
      const socket = socketRef.current;
      socket.on('connect_status', (status: { connected: boolean, userId?: string }) => {
        console.log('[DEBUG] Socket connection status:', status);
      });
      
      return () => {
        socket.off('connect_status');
      };
    }
  }, [roomId, user?._id]);

  // Replace the opponent left handler with the new approach
  useEffect(() => {
    console.log("[DEBUG] Setting up opponent_left and leave_room handlers");
    
    // Use the onOpponentLeft function from socketService
    const cleanupOpponentLeft = socketService.onOpponentLeft((data: OpponentLeftData & { customMessage?: string }) => {
      console.log("[DEBUG] OPPONENT LEFT EVENT RECEIVED via helper:", data);
      
      // Only show notification if this user is still in a room
      // This prevents old notifications from appearing in new games
      const currentRoomUrl = localStorage.getItem('roomUrl');
      if (!currentRoomUrl || !currentRoomUrl.includes(roomId || '')) {
        console.log("[DEBUG] Ignoring opponent_left event - not in this room anymore");
        return;
      }
      
      // Create a clear message about who left
      const opponentName = data.userName;
      const message = data.customMessage 
        ? `${opponentName}: "${data.customMessage}"` 
        : `${opponentName} has left the challenge.`;
      
      // Show a more visible error message in the UI
      setErrorMessage(`OPPONENT LEFT: ${message}`);
      
      // Clear any existing timers
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      // Reset game state
      setSelectedOption(null);
      setTimeLeft(30);
      setBothAnswered(false);
      
      // Keep room data to show who left
      // setRoomData(null);
      
      // Show a prominent toast notification (duration: 5 seconds)
      toast.error(`Opponent Left: ${message}`, {
        duration: 5000,
        position: 'top-center',
        style: {
          background: '#ff4f4f',
          color: '#fff',
          fontWeight: 'bold',
          fontSize: '16px',
          padding: '16px',
        },
        icon: '🚫',
      });
      
      // Clear localStorage data
      localStorage.removeItem('roomUrl');
      localStorage.removeItem('challengeRoomInfo');
      
      // Wait longer before redirecting to ensure message is seen
      setTimeout(() => {
        router.push(`/course/${title}/leaderboard`);
        // Re-identify to ensure proper socket state
        const socket = socketRef.current;
        socket.emit('identify', { userId: user?._id });
      }, 5000); // Increased from 2000 to 5000 ms
    });
    
    // Use the onLeaveRoom function from socketService
    const cleanupLeaveRoom = socketService.onLeaveRoom((data: OpponentLeftData) => {
      console.log('[DEBUG] Leave room event received via helper:', data);
      
      // Only show notification if this user is still in a room
      // This prevents old notifications from appearing in new games
      const currentRoomUrl = localStorage.getItem('roomUrl');
      if (!currentRoomUrl || !currentRoomUrl.includes(roomId || '')) {
        console.log("[DEBUG] Ignoring leave_room event - not in this room anymore");
        return;
      }
      
      // Also show a toast notification for this event
      toast.error(`${data.userName} has left the game`, {
        duration: 5000,
        position: 'top-center',
        style: {
          background: '#ff4f4f',
          color: '#fff',
          fontWeight: 'bold',
          fontSize: '16px',
          padding: '16px',
        },
        icon: '🚫',
      });
      
      // Handle 'leave_room' similar to 'opponent_left' if needed
      // This can help in case one event is working but not the other
      if (data.userId !== user?._id) {
        // This is another player leaving, handle it like opponent_left
        const opponentName = data.userName;
        const message = `${opponentName} has left the challenge.`;
        
        // Show a more visible error message in the UI
        setErrorMessage(`PLAYER LEFT: ${message}`);
        
        // Clear any existing timers
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
        
        // Reset game state
        setSelectedOption(null);
        setTimeLeft(30);
        setBothAnswered(false);
        
        // Wait before redirecting
        setTimeout(() => {
          router.push(`/course/${title}/leaderboard`);
        }, 5000);
      }
    });

    return () => {
      console.log("[DEBUG] Removing opponent_left and leave_room listeners in ChallengeQuiz");
      cleanupOpponentLeft();
      cleanupLeaveRoom();
    };
  }, [title, router, user, roomId]);

  // Component cleanup
  useEffect(() => {
    return () => {
      const socket = socketRef.current;
      console.log('[DEBUG] Component unmounting - removing all game-specific listeners');
      // Only remove game-specific listeners
      socket.off('new_question');
      socket.off('both_answered');
      socket.off('answer_error');
      socket.off('opponent_left');
      socket.off('room_data');
      socket.off('user_answer');
      socket.off('time_sync');
      socket.off('score_broadcast');
    };
  }, []);

  // Get user name for displaying answers
  const getUserName = (userId: string): string => {
    if (!roomData) return 'Unknown User';
    
    if (userId === roomData.challenger.id) {
      return roomData.challenger.name;
    } else if (userId === roomData.challenged.id) {
      return roomData.challenged.name;
    }
    
    return 'Unknown User';
  };

  // Add disconnect handler
  useEffect(() => {
        const socket = socketRef.current;
    
    socket.on('opponent_disconnected', (data: OpponentLeftData & { message: string }) => {
      console.log("[DEBUG] OPPONENT DISCONNECTED EVENT:", data);
      
      // Show toast notification
      toast.error(`${data.userName} disconnected from the game. You'll be declared the winner.`, {
        duration: 5000,
        position: 'top-center',
        style: {
          background: '#4d2a84',
          color: '#fff',
          fontWeight: 'bold',
          fontSize: '16px',
          padding: '16px',
          border: '2px solid black',
          borderRadius: '8px',
        },
        icon: '🏆',
      });
      
      // Show message in UI
      setErrorMessage(`OPPONENT DISCONNECTED: ${data.message} You'll be declared the winner automatically.`);
      
      // No need to redirect - we'll wait for the challenge_results event that will follow
    });
    
    return () => {
      socket.off('opponent_disconnected');
    };
  }, []);

  // Add a timeout mechanism for question preparation
  useEffect(() => {
    if (preparingQuestions) {
      // If questions are being prepared, set a timeout to show a message after 10 seconds
      const timeoutId = setTimeout(() => {
        toast.loading('Still preparing your questions. This may take a moment...', {
          id: 'preparing-questions-timeout',
          duration: 5000
        });
      }, 10000);
      
      // Set a longer timeout to provide a fallback if it's taking too long
      const fallbackTimeoutId = setTimeout(() => {
        if (preparingQuestions) {
          setErrorMessage('Questions are taking longer than expected. Please try again.');
          toast.error('Questions preparation timeout. Please try again.', {
            id: 'questions-timeout-error',
            duration: 5000
          });
          
          // Since we failed to load questions, provide a way back
          // This could be a retry button or redirecting back to the course page
          if (title) {
            router.push(`/course/${title}`);
          }
        }
      }, 30000);
      
      return () => {
        clearTimeout(timeoutId);
        clearTimeout(fallbackTimeoutId);
      };
    }
  }, [preparingQuestions, router, title]);

  // Initialize socket listeners in useEffect
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;
    
    // Handle system messages
    socket.on('system_message', (data: { type: string; message: string }) => {
      console.log('System message:', data);
      
      if (data.type === 'preparing_questions') {
        setPreparingQuestions(true);
      }
    });
    
    // Add synchronization listener for question index
    socket.on('sync_question_index', (data: { questionNumber: number; totalQuestions: number }) => {
      console.log('[DEBUG] Syncing question index:', data);
      // Force the component to update its question number
      setQuestionNumber(data.questionNumber);
      setTotalQuestions(data.totalQuestions);
    });
    
    // Handle new question
    socket.on('new_question', (data: any) => {
      console.log('[DEBUG] Received new question:', data);
      
      // Clear preparation status
      setPreparingQuestions(false);
      setErrorMessage('');
      
      // Validate question data
      if (!data.question || !data.question.id || !data.question.text || !Array.isArray(data.question.options)) {
        console.error('Invalid question received:', data);
        toast.error('Received invalid question data. Please report this issue.');
        return;
      }
      
      // Check if this question has already been received (prevent duplicates)
      if (processedQuestionIds.includes(data.question.id)) {
        console.warn('Duplicate question received:', data.question.id);
        return;
      }
      
      // Store this question ID to prevent duplicates
      setProcessedQuestionIds(prev => [...prev, data.question.id]);
      
      // Force the question number to match what the server says
      data.questionNumber = data.questionNumber || questionNumber;
      data.totalQuestions = data.totalQuestions || totalQuestions;
      
      // Update state with new question
      setCurrentQuestion(data);
      setTimeLeft(data.timeLimit || 30);
      setSelectedOption(null);
      setBothAnswered(false);
      setNextQuestionCountdown(null);
      setIsLoading(false);
    });

    // Handle time sync
    socket.on('time_sync', (data: { timeLeft: number; questionNumber?: number }) => {
      // Check if we need to update question number based on server state
      if (data.questionNumber && data.questionNumber !== questionNumber) {
        console.log('[DEBUG] Question number sync via time_sync:', data.questionNumber);
        setQuestionNumber(data.questionNumber);
      }
      
      setTimeLeft(data.timeLeft);
    });

    return () => {
      socket.off('system_message');
      socket.off('sync_question_index');
      socket.off('new_question');
      socket.off('time_sync');
    };
  }, [roomId, user?._id]);

  // Replace the beforeunload effect with an empty one to fix the linter error
  useEffect(() => {
    // No longer adding the beforeunload handler to prevent the "leave this site" prompt
    return () => {
      // Empty cleanup function
    };
  }, []);
  
  if (!user || !roomData) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FFD700]"></div>
    </div>
  );

  // Show loading screen while waiting for the question
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-8">
        <ChallengeRoom
          challenger={roomData.challenger}
          challenged={roomData.challenged}
          scores={userScores}
        />
        
        <div className="bg-[#2f235a] border-4 border-black rounded-lg w-full p-6 shadow-[8px_8px_0px_0px_#000000] flex flex-col items-center justify-center min-h-[300px]">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-t-4 border-[#FFD700] mb-6"></div>
          <h3 className="text-xl font-bold text-[#E6F1FF] text-center mb-2">
            {preparingQuestions ? 'Preparing Custom Questions...' : 'Loading Challenge...'}
          </h3>
          <p className="text-[#8892B0] text-center">
            {preparingQuestions 
              ? "We're creating personalized questions based on the course content"
              : 'Please wait while we set up your challenge'}
          </p>
          
          {preparingQuestions && (
            <div className="mt-4 bg-[#3f336a] rounded-lg p-2 w-48 relative overflow-hidden">
              <div className="h-2 rounded-full bg-[#8892B0] w-full">
                <div className="h-full bg-[#FFD700] rounded-full animate-pulse" style={{width: '60%'}}></div>
              </div>
            </div>
          )}
          
          {errorMessage && (
            <div className="mt-4 bg-red-500 bg-opacity-20 border border-red-500 text-white p-4 rounded w-full max-w-lg text-center">
              {errorMessage}
            </div>
          )}
        </div>
      </div>
    );
  }
  
  return (
    <div className="relative w-full max-w-5xl mx-auto bg-white rounded-lg overflow-hidden shadow-xl">
      {/* Add the preparing questions loading state */}
      {preparingQuestions && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white bg-opacity-90 z-10">
          <div className="w-20 h-20 border-t-4 border-blue-500 border-solid rounded-full animate-spin mb-4"></div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Preparing Your Challenge</h2>
          <p className="text-gray-600 text-center max-w-md">
            We're generating custom quiz questions for you and your opponent.
            <br />
            This will just take a moment...
          </p>
        </div>
      )}
      
      <div className="container mx-auto px-4 py-8 space-y-8">
        <ChallengeRoom
          challenger={roomData.challenger}
          challenged={roomData.challenged}
          scores={userScores}
        />
        
        {/* Quiz Section */}
        <div className="bg-[#2f235a] border-4 border-black rounded-lg w-full p-6 shadow-[8px_8px_0px_0px_#000000]">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-[#E6F1FF]">
              Question {questionNumber || currentQuestion?.questionNumber || '...'} of {totalQuestions || currentQuestion?.totalQuestions || '...'}
            </h2>
            
            <div className={`text-2xl font-bold ${
              bothAnswered ? 'text-green-500' : 
              timeLeft < 10 ? 'text-[#FF6B6B]' : 'text-[#FFD700]'
            }`}>
              {bothAnswered && nextQuestionCountdown !== null 
                ? `Next question in ${nextQuestionCountdown}s` 
                : bothAnswered 
                  ? 'Both answered!' 
                  : formatTime(timeLeft)}
            </div>
          </div>
          
          {errorMessage && (
            <div className={`${errorMessage.includes('OPPONENT LEFT') 
              ? 'bg-red-600 bg-opacity-90 border-2 border-white animate-pulse' 
              : 'bg-red-500 bg-opacity-20 border border-red-500'} 
              text-white p-4 rounded mb-4 font-bold text-center`}>
              {errorMessage}
              {errorMessage.includes('OPPONENT LEFT') && (
                <div className="mt-2 text-sm">
                  Redirecting to leaderboard in a few seconds...
                </div>
              )}
            </div>
          )}
          
          {/* Course and Topic Context */}
          {(courseName || currentQuestion?.topic) && (
            <div className="bg-[#1d2b4c] p-2 rounded-md mb-3 text-sm">
              <div className="flex flex-wrap gap-2">
                {courseName && (
                  <span className="bg-[#6016a7] px-2 py-1 rounded text-white">
                    Course: {courseName}
                  </span>
                )}
                {currentQuestion?.topic && (
                  <span className="bg-[#4d2a84] px-2 py-1 rounded text-white">
                    Topic: {currentQuestion.topic}
                  </span>
                )}
              </div>
            </div>
          )}
          
          {/* Question */}
          <div className="bg-[#294268] p-4 rounded-lg border-2 border-black mb-4">
              <p className="text-[#E6F1FF] text-xl">
              {currentQuestion ? (
                // Check if question contains code blocks (```code```) and render them properly
                currentQuestion.text.includes('```') ? (
                  <div className="whitespace-pre-wrap">
                    {currentQuestion.text.split(/```(?:[a-z]*\n)?/).map((part, index) => {
                      // Even indices are regular text, odd indices are code
                      if (index % 2 === 0) {
                        return <span key={index}>{part}</span>;
                      } else {
                        return (
                          <pre key={index} className="bg-[#1a2234] p-3 rounded my-2 overflow-x-auto text-sm font-mono">
                            <code>{part}</code>
                          </pre>
                        );
                      }
                    })}
                  </div>
                ) : (
                  // Regular text with line breaks preserved
                  <span className="whitespace-pre-wrap">{currentQuestion.text}</span>
                )
              ) : 'Waiting for question...'}
              </p>
            </div>
          
          {/* User Answers Display (when both have answered) */}
          {showAnswers && userAnswers.length > 0 && (
            <div className="bg-[#1d2b4c] p-3 rounded-lg border-2 border-black mb-4">
              <h3 className="text-[#E6F1FF] font-bold mb-2">Answers:</h3>
              <div className="space-y-2">
                {userAnswers.map((userAnswer, idx) => {
                  // Find the index of this answer in the options to get the letter
                  const answerIndex = currentQuestion?.options?.findIndex(option => option === userAnswer.answer) ?? -1;
                  const answerLetter = answerIndex >= 0 ? String.fromCharCode(65 + answerIndex) : '';
                  
                  return (
                    <div key={idx} className={`p-2 rounded flex justify-between items-center ${
                      userAnswer.isCorrect 
                        ? 'bg-green-700 bg-opacity-30 border border-green-500' 
                        : 'bg-red-700 bg-opacity-30 border border-red-500'
                    }`}>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#E6F1FF]">{getUserName(userAnswer.userId)}:</span>
                        {answerLetter && (
                          <span className="inline-block w-5 h-5 rounded-full bg-[#9D4EDD] text-white text-center font-bold text-xs flex items-center justify-center">
                            {answerLetter}
                          </span>
                        )}
                        <span className="text-[#E6F1FF]">{userAnswer.answer}</span>
            </div>
                    {userAnswer.isCorrect !== undefined && (
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        userAnswer.isCorrect ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                      }`}>
                        {userAnswer.isCorrect ? 'Correct' : 'Incorrect'}
                      </span>
                    )}
                  </div>
                );
              })}
              </div>
              {currentQuestion?.correctAnswer && (
                <div className="mt-3 p-2 bg-blue-700 bg-opacity-30 border border-blue-500 rounded">
                  <span className="font-bold text-[#E6F1FF]">Correct answer:</span>
                  {typeof currentQuestion.correctAnswer === 'string' && currentQuestion.correctAnswer.length === 1 && (
                    <span className="inline-block ml-2 w-5 h-5 rounded-full bg-[#FFD700] text-black text-center font-bold text-xs flex items-center justify-center">
                      {currentQuestion.correctAnswer}
                    </span>
                  )}
                  <span className="text-[#E6F1FF] ml-2">
                    {(() => {
                      // If correctAnswer is a letter (A, B, C, D), find the corresponding text
                      if (typeof currentQuestion.correctAnswer === 'string' && 
                          currentQuestion.correctAnswer.length === 1 &&
                          currentQuestion.correctAnswer.charCodeAt(0) >= 65 && 
                          currentQuestion.correctAnswer.charCodeAt(0) <= 68) {
                        const index = currentQuestion.correctAnswer.charCodeAt(0) - 65;
                        return currentQuestion.options[index] || currentQuestion.correctAnswer;
                      }
                      return currentQuestion.correctAnswer;
                    })()}
                  </span>
                </div>
              )}
            </div>
          )}
          
          {/* Options */}
          <div className="space-y-3">
            {currentQuestion && currentQuestion.options ? (
              currentQuestion.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => !selectedOption && handleSubmit(option, index)}
                  disabled={selectedOption !== null}
                  className={`w-full p-4 rounded-lg border-2 border-black transition-colors text-left ${
                    selectedOption === option
                      ? 'bg-[#5CDB95] text-black'
                      : selectedOption !== null
                        ? 'bg-[#3f336a] text-[#8892B0]'
                      : 'bg-[#3f336a] text-[#E6F1FF] hover:bg-[#4a3e7d]'
                  }`}
                >
                  <span className="inline-block w-6 h-6 mr-3 rounded-full bg-[#9D4EDD] text-white text-center font-bold">
                    {String.fromCharCode(65 + index)}
                  </span>
                  {option}
                </button>
              ))
            ) : (
              // Placeholder options when no question is loaded
              ['Loading options...'].map((text, index) => (
                <div
                  key={index}
                  className="w-full p-4 rounded-lg border-2 border-black bg-[#3f336a] text-[#8892B0] opacity-50"
                >
                  {text}
                </div>
              ))
            )}
          </div>
          
          {selectedOption && !showAnswers && (
            <div className="mt-6 text-center text-[#8892B0]">
              <div className="animate-pulse text-lg font-bold">
                Waiting for opponent...
              </div>
            </div>
          )}

          {/* Exit Game Button */}
          <div className="mt-8 border-t-2 border-[#3f336a] pt-6">
            <button
              onClick={handleExitGame}
              className="w-full px-6 py-3 bg-[#FF6B6B] text-white font-bold rounded-lg border-2 border-black shadow-[4px_4px_0px_0px_#000000] hover:bg-[#ff4f4f] hover:shadow-[6px_6px_0px_0px_#000000] transition-all duration-200 flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1H3zm11 4.414l-4.293 4.293a1 1 0 01-1.414 0L4 7.414 5.414 6l3.293 3.293L12 5.586 14.414 8 14 8.414z" clipRule="evenodd" />
              </svg>
              Exit Game
            </button>
          </div>
        </div>
      </div>
      
      {/* Confirmation Dialog */}
      {showConfirmExit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#2f235a] p-6 rounded-lg border-4 border-black shadow-[8px_8px_0px_0px_#000000] max-w-md w-full"
          >
            <h3 className="text-xl font-bold text-[#E6F1FF] mb-4">Leave Challenge?</h3>
            <p className="text-[#E6F1FF] mb-6">
              Are you sure you want to leave? Your opponent will be notified and the challenge will end.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={cancelExitGame}
                className="px-4 py-2 bg-[#8892B0] text-white font-bold rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_#000000] hover:bg-[#767f9b] hover:shadow-[1px_1px_0px_0px_#000000] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmExitGame}
                className="px-4 py-2 bg-[#FF6B6B] text-white font-bold rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_#000000] hover:bg-[#ff4f4f] hover:shadow-[1px_1px_0px_0px_#000000] transition-all"
              >
                Leave
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
} 