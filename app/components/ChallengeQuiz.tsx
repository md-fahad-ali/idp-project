import { useState, useEffect, useRef } from 'react';
import { useDashboard } from '../provider';
import { initSocket, submitAnswer, leaveRoom, onOpponentLeft, onLeaveRoom, forceIdentify } from '../services/socketService';
import ChallengeRoom from './ChallengeRoom';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'react-hot-toast';

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
  const [currentQuestion, setCurrentQuestion] = useState<{
    id: string, 
    text: string, 
    options: string[], 
    topic?: string,
    questionNumber?: number,
    totalQuestions?: number
  } | null>(null);
  const [courseName, setCourseName] = useState<string>('');
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const questionStartTime = useRef(Date.now());
  const socketRef = useRef(initSocket());
  
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
        forceIdentify(user._id);
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
        forceIdentify(user._id);
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

  // Start timer when component mounts
  useEffect(() => {
        timerRef.current = setInterval(() => {
          setTimeLeft(prev => {
            if (prev <= 1 || bothAnswered) {
              if (timerRef.current) {
                clearInterval(timerRef.current);
              }
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
  
    return () => {
      if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    };
  }, [bothAnswered]);
  
  // Auto-submit when time runs out
  useEffect(() => {
    if (timeLeft === 0 && !selectedOption && !bothAnswered) {
      handleSubmit('timeout');
    }
  }, [timeLeft, bothAnswered]);
  
  // Add socket listeners
  useEffect(() => {
    const socket = socketRef.current;
    
    socket.on('answer_error', (message: string) => {
      setErrorMessage(`Error: ${message}`);
      console.error('Answer submission error:', message);
    });
    
    // Listen for when both users have answered
    socket.on('both_answered', () => {
      setBothAnswered(true);
      // Stop the timer when both have answered
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    });
    
    // Listen for new questions
    socket.on('new_question', (data: any) => {
      console.log('Received question:', data);
      
      // Enhance question object with question number info from server
      const enhancedQuestion = {
        ...data.question,
        questionNumber: data.questionNumber || 1,
        totalQuestions: data.totalQuestions || 5
      };
      
      console.log('Enhanced question with numbers:', enhancedQuestion);
      setCurrentQuestion(enhancedQuestion);
      setTimeLeft(data.timeLimit || 30);
      setBothAnswered(false);
      setSelectedOption(null);
      questionStartTime.current = Date.now();
      
      // Store course name if available
      if (data.courseName) {
        setCourseName(data.courseName);
      }
    });
    
    return () => {
      socket.off('answer_error');
      socket.off('both_answered');
      socket.off('new_question');
    };
  }, []);

  // Add challenge status update handler
  useEffect(() => {
    const socket = socketRef.current;
    
    socket.on('challenge_status_update', (data: ChallengeStatusUpdate) => {
      // If we're no longer in a challenge, redirect back
      if (!data.isInChallenge) {
        // Clean up before redirecting
        socket.removeAllListeners();
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
    };
  }, [title, router]);
  
  // Format time from seconds to MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const handleSubmit = (answer: string) => {
    if (!user?._id || !roomId) {
      setErrorMessage('Cannot submit answer: Missing user ID or room ID');
      return;
    }
    
    setSelectedOption(answer);
    
    const timeSpent = (Date.now() - questionStartTime.current) / 1000; // in seconds
    
    // Use the actual roomId from URL params and current question ID
    const questionId = currentQuestion?.id || 'question-1';
    
    console.log(`Submitting answer to room ${roomId}`);
    
    submitAnswer(
      roomId,
      user._id,
      questionId,
      answer,
      timeSpent
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
        
        // Use the leaveRoom function from socketService
        console.log("[DEBUG] Calling leaveRoom with:", {
          roomId: actualRoomId,
          userId: user._id,
          isChallenger: roomData.challenger.id === user._id,
          message: 'Sorry, I had to leave the challenge. Maybe we can play again later!'
        });
        
        leaveRoom(
          actualRoomId,
          user._id,
          roomData.challenger.id === user._id,
          'Sorry, I had to leave the challenge. Maybe we can play again later!'
        );
        
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
        
        // Clear localStorage data
        localStorage.removeItem('roomUrl');
        localStorage.removeItem('challengeRoomInfo');

        // Navigate back to course page
        router.push(`/course/${title}/leaderboard`);

        // Don't disconnect socket, just re-identify
        const socket = socketRef.current;
        socket.emit('identify', { userId: user._id });
      } catch (error) {
        console.error('Error during game exit:', error);
        setErrorMessage('Failed to exit game properly. Please refresh the page.');
      }
    }
  };

  // Replace the opponent left handler with the new approach
  useEffect(() => {
    console.log("[DEBUG] Setting up opponent_left and leave_room handlers");
    
    // Use the onOpponentLeft function from socketService
    const cleanupOpponentLeft = onOpponentLeft((data: OpponentLeftData & { customMessage?: string }) => {
      console.log("[DEBUG] OPPONENT LEFT EVENT RECEIVED via helper:", data);
      
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
          border: '2px solid black',
          borderRadius: '8px',
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
    const cleanupLeaveRoom = onLeaveRoom((data: OpponentLeftData) => {
      console.log('[DEBUG] Leave room event received via helper:', data);
      
      // Also show a toast notification for this event
      toast.error(`${data.userName} has left the game`, {
        duration: 5000,
        position: 'top-center',
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
  }, [title, router, user]);

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
    };
  }, []);

  // Join the challenge room when the component mounts
  useEffect(() => {
    if (roomId && user?._id) {
      console.log(`[DEBUG] Joining challenge room ${roomId} with user ${user._id}`);
      const socket = socketRef.current;
      socket.emit('join_challenge', { roomId, userId: user._id });
      
      // Add a listener for socket connection status
      socket.on('connect_status', (status: { connected: boolean, userId?: string }) => {
        console.log('[DEBUG] Socket connection status:', status);
      });
      
      return () => {
        socket.off('connect_status');
      };
    }
  }, [roomId, user?._id]);

  if (!user || !roomData) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FFD700]"></div>
        </div>
    );
  
  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <ChallengeRoom
        challenger={roomData.challenger}
        challenged={roomData.challenged}
      />
      
      {/* Quiz Section */}
      <div className="bg-[#2f235a] border-4 border-black rounded-lg w-full p-6 shadow-[8px_8px_0px_0px_#000000]">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-[#E6F1FF]">
            Question {currentQuestion?.questionNumber || '...'} of {currentQuestion?.totalQuestions || '...'}
          </h2>
          
          <div className={`text-2xl font-bold ${
            bothAnswered ? 'text-green-500' : 
            timeLeft < 10 ? 'text-[#FF6B6B]' : 'text-[#FFD700]'
          }`}>
            {bothAnswered ? 'Both answered!' : `${timeLeft}s`}
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
            {currentQuestion ? currentQuestion.text : 'Waiting for question...'}
          </p>
        </div>
        
        {/* Options */}
        <div className="space-y-3">
          {currentQuestion && currentQuestion.options ? (
            currentQuestion.options.map((option, index) => (
              <button
                key={index}
                onClick={() => !selectedOption && handleSubmit(option)}
                disabled={selectedOption !== null}
                className={`w-full p-4 rounded-lg border-2 border-black transition-colors text-left ${
                  selectedOption === option
                    ? 'bg-[#5CDB95] text-black'
                    : selectedOption !== null
                    ? 'bg-[#3f336a] text-[#8892B0]'
                    : 'bg-[#3f336a] text-[#E6F1FF] hover:bg-[#4a3e7d]'
                }`}
              >
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
        
        {selectedOption && (
          <div className="mt-6 text-center text-[#8892B0]">
            <div className="animate-pulse text-lg font-bold">
              {bothAnswered ? 'Loading next question...' : 'Waiting for opponent...'}
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
  );
} 