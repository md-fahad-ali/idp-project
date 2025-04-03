import { useState, useEffect, useRef } from 'react';
import { useDashboard } from '../provider';
import { initSocket, submitAnswer } from '../services/socketService';
import ChallengeRoom from './ChallengeRoom';
import { useParams, useRouter } from 'next/navigation';

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
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [bothAnswered, setBothAnswered] = useState(false);
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const questionStartTime = useRef(Date.now());
  const socketRef = useRef(initSocket());
  
  // Handle socket identification and reconnection
  useEffect(() => {
    const socket = socketRef.current;
    
    // Function to identify user to socket
    const identifyUser = () => {
      if (user?._id) {
        socket.emit('identify', { userId: user._id });
      }
    };

    // Initial identification
    identifyUser();

    // Handle socket disconnection and reconnection
    socket.on('connect', () => {
      console.log('Socket connected, identifying user...');
      identifyUser();
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    socket.on('error', (error: Error) => {
      console.error('Socket error:', error);
      setErrorMessage('Connection error. Please refresh the page.');
    });

    // Listen for room data
    socket.on('room_data', (data: RoomData) => {
      setRoomData(data);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('error');
      socket.off('room_data');
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
    
    return () => {
      socket.off('answer_error');
      socket.off('both_answered');
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
        router.push(`/course/${title}`);
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
    if (!user?._id) return;
    
    setSelectedOption(answer);
    
    const timeSpent = (Date.now() - questionStartTime.current) / 1000; // in seconds
    
    // For now, we're just simulating the room ID and question ID
    const mockRoomId = "mock-room-id";
    const mockQuestionId = "mock-question-id";
    
    submitAnswer(
      mockRoomId,
      user._id,
      mockQuestionId,
      answer,
      timeSpent
    );
  };
  
  const handleExitGame = () => {
    const socket = socketRef.current;
    
    if (roomData && user?._id) {
      try {
        // Emit leave_room event
        socket.emit('leave_room', {
          roomId: `${title}_${user1}_${user2}`,
          userId: user._id,
          isChallenger: roomData.challenger.id === user._id
        });

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

        // Navigate back to course page
        router.push(`/course/${title}`);

        // Don't disconnect socket, just re-identify
        socket.emit('identify', { userId: user._id });
      } catch (error) {
        console.error('Error during game exit:', error);
        setErrorMessage('Failed to exit game properly. Please refresh the page.');
      }
    }
  };

  // Add opponent left handler with better cleanup
  useEffect(() => {
    const socket = socketRef.current;
    
    socket.on('opponent_left', (data: OpponentLeftData) => {
      // Show a message that opponent left
      setErrorMessage(`${data.userName} has left the game`);
      
      // Clear any existing timers
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      // Reset local state
      setSelectedOption(null);
      setTimeLeft(30);
      setBothAnswered(false);
      setRoomData(null);
      
      // Wait a moment before redirecting
      setTimeout(() => {
        router.push(`/course/${title}`);
        // Re-identify to ensure proper socket state
        socket.emit('identify', { userId: user?._id });
      }, 2000);
    });

    return () => {
      socket.off('opponent_left');
    };
  }, [title, router, user]);

  // Component cleanup
  useEffect(() => {
    return () => {
      const socket = socketRef.current;
      // Only remove game-specific listeners
      socket.off('new_question');
      socket.off('both_answered');
      socket.off('answer_error');
      socket.off('opponent_left');
      socket.off('room_data');
    };
  }, []);

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
            Question 1 of 5
          </h2>
          <div className={`text-2xl font-bold ${
            bothAnswered ? 'text-green-500' : 
            timeLeft < 10 ? 'text-[#FF6B6B]' : 'text-[#FFD700]'
          }`}>
            {bothAnswered ? 'Both answered!' : `${timeLeft}s`}
          </div>
        </div>
        
        {errorMessage && (
          <div className="bg-red-500 bg-opacity-20 border border-red-500 text-white p-2 rounded mb-4">
            {errorMessage}
          </div>
        )}
        
        {/* Mock Question */}
        <div className="bg-[#294268] p-4 rounded-lg border-2 border-black mb-4">
          <p className="text-[#E6F1FF] text-xl">
            What is the capital of France?
          </p>
        </div>
        
        {/* Mock Options */}
        <div className="space-y-3">
          {['Paris', 'London', 'Berlin', 'Madrid'].map((option, index) => (
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
          ))}
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