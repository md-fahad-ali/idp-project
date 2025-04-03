import { Socket } from 'socket.io-client';
import io from 'socket.io-client';
import { useEffect, useState } from 'react';

// Types for challenge data
interface ChallengeData {
  challengeId: string;
  challengerId: string;
  challengerName: string;
  challengedId: string;
  challengedName: string;
  courseId: string;
  courseName: string;
  timestamp: number;
}

interface QuestionData {
  question: {
    id: string;
    text: string;
    options: string[];
  };
  timeLimit: number;
  questionNumber?: number;
  totalQuestions?: number;
}

interface ActiveChallengeData {
  challengerName: string;
  challengedName: string;
  courseName: string;
  roomId: string;
  challengerId: string;
  challengedId: string;
  courseId: string;
  currentQuestion?: {
    id: string;
    text: string;
    options: string[];
  };
  timeLeft?: number;
  questionNumber?: number;
  totalQuestions?: number;
}

interface ChallengeResultData {
  roomId: string;
  challengerId: string;
  challengerName: string;
  challengerScore: number;
  challengerTimeSpent: number;
  challengedId: string;
  challengedName: string;
  challengedScore: number;
  challengedTimeSpent: number;
  winnerId: string;
  winnerName: string;
}

let socket: ReturnType<typeof io> | null = null;

// Initialize socket connection
export const initSocket = (): ReturnType<typeof io> => {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000', {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
      transports: ['websocket'],
      withCredentials: true
    } as any);
    
    // Setup listeners for connection events
    socket.on('connect', () => {
      console.log('Socket connected:', socket?.id);
    });
    
    socket.on('disconnect', (reason: any) => {
      console.log('Socket disconnected:', reason);
    });
    
    socket.on('reconnect', (attemptNumber: any) => {
      console.log('Socket reconnected after', attemptNumber, 'attempts');
    });
    
    socket.on('reconnect_error', (error:any) => {
      console.error('Socket reconnection error:', error);
    });
    
    socket.on('error', (error:any) => {
      console.error('Socket error:', error);
    });
  }
  
  // Force a reconnect if the socket exists but is not connected
  if (socket && !socket.connected) {
    console.log('Socket exists but not connected. Reconnecting...');
    socket.connect();
  }
  
  return socket;
};

// Get course slug from course name
export const getCourseSlug = (courseName: string): string => {
  return courseName.toLowerCase().replace(/\s+/g, '-');
};

// Navigate to challenge room
export const navigateToChallengeRoom = (
  courseName: string,
  challengerName: string,
  challengedName: string,
  roomId?: string
): string => {
  // Use meaningful defaults that describe the relationship
  const effectiveCourseName = courseName || 'challenge';
  const effectiveChallengerName = challengerName || 'challenger';
  const effectiveChallengedName = challengedName || 'opponent';
  
  const courseSlug = getCourseSlug(effectiveCourseName);
  const user1 = effectiveChallengerName.split(' ')[0].toLowerCase();
  const user2 = effectiveChallengedName.split(' ')[0].toLowerCase();
  
  // Include roomId as a query parameter when it's provided
  const baseUrl = `/room/course/${courseSlug}/${user1}/${user2}`;
  return roomId ? `${baseUrl}?roomId=${roomId}` : baseUrl;
};

export const checkInRoom = (userId: string): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    const socket = initSocket();
    
    // Create a handler function that we can reference for removal
    const handleRoomStatusResponse = (data: { isInRoom: boolean }) => {
      clearTimeout(timeoutId); // Clear the timeout when we get a response
      socket.off('room_status_response', handleRoomStatusResponse); // Remove the listener
      resolve(data.isInRoom);
    };
    
    // Add the event listener
    socket.on('room_status_response', handleRoomStatusResponse);
    
    // Emit the event to check room status
    socket.emit('check_room_status', userId);
    
    // Set timeout and store its ID so we can clear it if needed
    const timeoutId = setTimeout(() => {
      socket.off('room_status_response', handleRoomStatusResponse); // Clean up listener on timeout
      resolve(false); // Resolve with false instead of rejecting to avoid unhandled exceptions
      console.warn(`Room status check timed out for user ${userId}`);
    }, 5000);
  });
};

// Create a challenge room
export const createChallengeRoom = (
  challengerId: string, 
  challengedId: string, 
  courseId: string
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const socket = initSocket();
    socket.emit('create_challenge', { challengerId, challengedId, courseId });
    
    socket.on('challenge_room_created', (roomId: string) => {
      resolve(roomId);
    });
    
    socket.on('challenge_room_error', (error: string) => {
      reject(error);
    });
  });
};

// Join a challenge room
export const joinChallengeRoom = (roomId: string, userId: string): void => {
  const socket = initSocket();
  socket.emit('join_challenge', { roomId, userId });
};

// Start the challenge quiz
export const startChallenge = (roomId: string): void => {
  const socket = initSocket();
  socket.emit('start_challenge', { roomId });
};

// Submit an answer
export const submitAnswer = (
  roomId: string, 
  userId: string, 
  questionId: string, 
  answer: string,
  timeSpent: number
): void => {
  const socket = initSocket();
  socket.emit('submit_answer', { 
    roomId, 
    userId, 
    questionId, 
    answer,
    timeSpent 
  });
};

// React hook for challenge notifications
export const useChallengeNotifications = (userId: string) => {
  const [pendingChallenges, setPendingChallenges] = useState<ChallengeData[]>([]);
  const [activeChallenge, setActiveChallenge] = useState<ActiveChallengeData | null>(null);
  const [challengeResults, setChallengeResults] = useState<ChallengeResultData | null>(null);
  const [declinedChallenges, setDeclinedChallenges] = useState<{id: string, declinerName: string}[]>([]);
  const [sentChallenges, setSentChallenges] = useState<string[]>([]); // Track challenges sent by this user

  useEffect(() => {
    const socket = initSocket();
    
    // Listen for incoming challenges
    socket.on('challenge_received', (data: ChallengeData) => {
      setPendingChallenges(prev => [...prev, data]);
    });
    
    // Track when this user sends a challenge
    socket.on('challenge_room_created', (roomId: string) => {
      setSentChallenges(prev => [...prev, roomId]);
    });
    
    // Listen for when both users join and quiz starts
    socket.on('challenge_started', (data: ActiveChallengeData) => {
      // For the challenger: Handle navigation when their challenge is accepted
      if (data.challengerId === userId || sentChallenges.includes(data.roomId)) {
        setActiveChallenge(data);
      }
      
      // For the challenged user: Clear pending challenges and set active challenge
      if (data.challengedId === userId) {
        setPendingChallenges([]);
        setActiveChallenge(data);
      }
    });
    
    // Listen for new questions
    socket.on('new_question', (data: QuestionData) => {
      setActiveChallenge(prev => ({
        ...prev!,
        currentQuestion: data.question,
        timeLeft: data.timeLimit,
        questionNumber: data.questionNumber,
        totalQuestions: data.totalQuestions
      }));
    });
    
    // Listen for challenge results
    socket.on('challenge_results', (data: ChallengeResultData) => {
      setActiveChallenge(null);
      setChallengeResults(data);
      
      // Clean up sent challenges list when challenge completes
      if (data.challengerId === userId) {
        setSentChallenges(prev => prev.filter(id => id !== data.roomId));
      }
    });
    
    // Listen for declined challenges
    socket.on('challenge_declined', (data: {challengeId: string, declinerId: string, declinerName: string}) => {
      // Remove from pending challenges
      setPendingChallenges(prev => 
        prev.filter(challenge => challenge.challengeId !== data.challengeId)
      );
      
      // For the challenger: add to declined challenges (for notification)
      if (data.declinerId !== userId) {
        setDeclinedChallenges(prev => [...prev, {id: data.challengeId, declinerName: data.declinerName}]);
        
        // Clean up sent challenges list when challenge is declined
        setSentChallenges(prev => prev.filter(id => id !== data.challengeId));
        
        // Auto-remove the declined notification after 5 seconds
        setTimeout(() => {
          setDeclinedChallenges(prev => 
            prev.filter(challenge => challenge.id !== data.challengeId)
          );
        }, 5000);
      }
    });
    
    // Cleanup
    return () => {
      socket.off('challenge_received');
      socket.off('challenge_room_created');
      socket.off('challenge_started');
      socket.off('new_question');
      socket.off('challenge_results');
      socket.off('challenge_declined');
    };
  }, [userId, sentChallenges]);

  return { pendingChallenges, activeChallenge, challengeResults, declinedChallenges };
};

// Accept a challenge
export const acceptChallenge = (challengeId: string, userId: string): void => {
  const socket = initSocket();
  socket.emit('accept_challenge', { challengeId, userId });
};

// Decline a challenge
export const declineChallenge = (challengeId: string, userId: string): void => {
  const socket = initSocket();
  socket.emit('decline_challenge', { challengeId, userId });
}; 