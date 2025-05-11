import { Socket } from 'socket.io-client';
import io from 'socket.io-client';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

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

interface UserAnswer {
  userId: string;
  userName: string;
  answer: string;
  isCorrect?: boolean;
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
  preparingQuestions?: boolean; // Flag to indicate that questions are being prepared
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

// Store the socket instance at the module level
let socket: any = null;

// Utility function to create a socket connection if it doesn't exist
export default function initSocket() {
  if (typeof window === 'undefined') {
    return null; // Return null on server-side
  }
  
  try {
    if (!socket) {
      // Get the base URL dynamically (works in both dev and production)
      const baseUrl = window.location.origin;
      
      // Create socket instance with options
      socket = io(baseUrl, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 10, // Increased from 5
        reconnectionDelay: 1000,
      });
      
      // Set up error handling
      socket.on('connect_error', (err: any) => {
        console.error('Socket connection error:', err);
      });
      
      socket.on('disconnect', (reason: string) => {
        console.log(`Socket disconnected: ${reason}`);
      });

      // Auto-reconnect and identify on connection
      socket.on('connect', () => {
        console.log('Socket connected, auto-identifying user');
        
        // Auto-identify if user ID is in localStorage
        const autoIdentifyUser = () => {
          try {
            // Get user from localStorage if available
            const user = localStorage.getItem('user');
            if (user) {
              const userData = JSON.parse(user);
              if (userData && userData._id) {
                // Auto-identify this user to the server
                console.log('Auto-identifying user:', userData._id);
                identifyUser(userData._id);
              }
            }
          } catch (err) {
            console.error('Error auto-identifying user:', err);
          }
        };
        
        // Try to identify after a short delay to ensure connection is stable
        setTimeout(autoIdentifyUser, 500);
      });
      
      // Setup reconnect event
      socket.io.on("reconnect", () => {
        console.log('Socket reconnected, re-identifying user');
        
        // Re-identify user after reconnection
        try {
          const user = localStorage.getItem('user');
          if (user) {
            const userData = JSON.parse(user);
            if (userData && userData._id) {
              console.log('Re-identifying user after reconnect:', userData._id);
              identifyUser(userData._id);
            }
          }
        } catch (err) {
          console.error('Error re-identifying user after reconnect:', err);
        }
      });
      
      console.log('Socket initialized');
    }
    
    return socket;
  } catch (error) {
    console.error('Error initializing socket:', error);
    return null;
  }
}

// Safe socket initialization (won't throw errors)
export function initSafeSocket() {
  try {
    return initSocket();
  } catch (e) {
    console.error('Error in initSafeSocket:', e);
    return null;
  }
}

// Check if user is in a challenge room
export async function checkInRoom(userId: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    try {
      const s = initSocket();
      
      if (!s || !s.connected) {
        console.warn('Socket not connected when checking room status');
        resolve(false);
        return;
      }
      
      // Set timeout to prevent hanging
      const timeout = setTimeout(() => {
        s.off('in_room_response');
        reject('Timeout checking room status');
      }, 5000);
      
      s.emit('check_in_room', { userId });
      
      s.on('in_room_response', (data: { inRoom: boolean, roomId?: string }) => {
        clearTimeout(timeout);
        s.off('in_room_response'); // Remove the listener
        resolve(data.inRoom);
      });
    } catch (error) {
      console.error('Error in checkInRoom:', error);
      reject(error);
    }
  });
}

// Create a challenge room
export async function createChallengeRoom(
  challengerId: string,
  challengedId: string,
  courseId: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const s = initSocket();
      
      if (!s || !s.connected) {
        reject('Socket not connected');
        return;
      }
      
      // Set timeout to prevent hanging
      const timeout = setTimeout(() => {
        s.off('room_created');
        reject('Timeout creating challenge room');
      }, 5000);
      
      s.emit('create_challenge_room', {
        challengerId,
        challengedId,
        courseId
      });
      
      s.on('room_created', (data: { roomId: string }) => {
        clearTimeout(timeout);
        s.off('room_created'); // Remove the listener
        resolve(data.roomId);
      });
    } catch (error) {
      console.error('Error in createChallengeRoom:', error);
      reject(error);
    }
  });
}

// Utility function to check if socket is working
export async function isSocketWorking(): Promise<boolean> {
  return new Promise(resolve => {
    try {
      // Return false immediately for server-side rendering
      if (typeof window === 'undefined') {
        resolve(false);
        return;
      }
      
      const s = initSocket();
      
      // If we couldn't create a socket or it's not connected, return false
      if (!s || !s.connected) {
        resolve(false);
        return;
      }
      
      // Set a timeout for the ping test
      const timeout = setTimeout(() => {
        resolve(false);
      }, 3000);
      
      // Try a simple ping to verify socket is responsive
      s.emit('ping');
      
      // Set up a one-time listener for the response
      s.once('pong', () => {
        clearTimeout(timeout);
        resolve(true);
      });
    } catch (error) {
      console.error('Error checking socket status:', error);
      resolve(false);
    }
  });
}

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
  console.log('[DEBUG] navigateToChallengeRoom called with:', { courseName, challengerName, challengedName, roomId });
  
  // Ensure we have actual values, not placeholders
  if (!courseName || courseName === 'challenge') {
    console.error('[ERROR] Invalid course name for challenge room navigation:', courseName);
  }
  
  if (!challengerName || challengerName === 'challenger' || !challengedName || challengedName === 'opponent') {
    console.error('[ERROR] Invalid user names for challenge room navigation:', { challengerName, challengedName });
  }
  
  // Always use actual course name and user names, never use placeholders
  const courseSlug = getCourseSlug(courseName);
  const user1 = challengerName.split(' ')[0].toLowerCase();
  const user2 = challengedName.split(' ')[0].toLowerCase();
  
  // Include roomId as a query parameter when it's provided
  const baseUrl = `/room/course/${courseSlug}/${user1}/${user2}`;
  
  // Log the constructed URL for debugging
  const finalUrl = roomId ? `${baseUrl}?roomId=${roomId}` : baseUrl;
  console.log('[DEBUG] Challenge room URL constructed:', finalUrl);
  
  return finalUrl;
};

// Join a challenge room
export const joinChallengeRoom = (roomId: string, userId: string): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    if (!roomId || !userId) {
      console.error('Missing required parameters for joinChallengeRoom:', { roomId, userId });
      reject('Room ID and User ID are required');
      return;
    }
    
    try {
      console.log(`[DEBUG] Joining challenge room ${roomId} with user ${userId}`);
      const socket = initSocket();
      
      // Set up a one-time handler for join confirmation
      const handleJoinConfirm = (data: { success: boolean, error?: string }) => {
        socket.off('join_challenge_confirm', handleJoinConfirm);
        
        if (data.success) {
          console.log(`[DEBUG] Successfully joined room ${roomId}`);
          resolve(true);
        } else {
          console.error(`[DEBUG] Failed to join room: ${data.error}`);
          reject(data.error || 'Failed to join room');
        }
      };
      
      // Set up timeout for join confirmation
      const timeoutId = setTimeout(() => {
        socket.off('join_challenge_confirm', handleJoinConfirm);
        console.warn(`[DEBUG] Join room ${roomId} timed out after 5 seconds`);
        // Resolve with false instead of rejecting to avoid unhandled promises
        resolve(false);
      }, 5000);
      
      // Register the confirmation handler
      socket.on('join_challenge_confirm', handleJoinConfirm);
      
      // Actually emit the join event
      socket.emit('join_challenge', { roomId, userId });
      
      console.log(`[DEBUG] Sent join_challenge event for room ${roomId}`);
      
    } catch (error) {
      console.error('[DEBUG] Error in joinChallengeRoom:', error);
      reject(error);
    }
  });
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
  timeSpent: number,
  answerLetter: string = ''
): void => {
  console.log(`[DEBUG SOCKET] submitAnswer called with:`, { roomId, userId, questionId, answer, timeSpent, answerLetter });
  
  const socket = initSocket();
  
  // Check if socket is connected
  if (!socket.connected) {
    console.error(`[DEBUG SOCKET] Socket not connected! Attempting reconnection before submitting answer`);
    
    // Force connect
    socket.connect();
    
    // Set up a one-time event listener for when the socket connects
    socket.once('connect', () => {
      console.log(`[DEBUG SOCKET] Socket reconnected, now submitting answer`);
      socket.emit('submit_answer', { roomId, userId, questionId, answer, timeSpent, answerLetter });
    });
  } else {
    // Socket is connected, emit normally
    console.log(`[DEBUG SOCKET] Socket connected, emitting submit_answer event`);
    socket.emit('submit_answer', { roomId, userId, questionId, answer, timeSpent, answerLetter });
  }
  
  // Ping the server after answer submission to maintain connection
  try {
    console.log(`[DEBUG SOCKET] Pinging server after answer submission to maintain connection`);
    socket.emit('ping_test', { userId, timestamp: Date.now(), message: 'Post-answer submission ping' });
  } catch (error) {
    console.error(`[DEBUG SOCKET] Error pinging server after answer submission:`, error);
  }
};

// Broadcast score update to opponents
export const broadcastScore = (
  roomId: string,
  userId: string,
  userName: string,
  score: number,
  isCorrect: boolean,
  questionId?: string
): void => {
  console.log(`[DEBUG SOCKET] broadcastScore called with:`, {
    roomId, userId, userName, score, isCorrect, questionId
  });

  const socket = initSocket();
  
  // Check if socket is connected
  if (!socket.connected) {
    console.error(`[DEBUG SOCKET] Socket not connected! Attempting reconnection before broadcasting score`);
    
    // Force connect
    socket.connect();
    
    // Wait for connection and then emit
    socket.once('connect', () => {
      console.log(`[DEBUG SOCKET] Socket reconnected, now broadcasting score`);
      socket.emit('broadcast_score', {
        roomId,
        userId,
        userName,
        score,
        isCorrect,
        questionId
      });
    });
  } else {
    // Socket is connected, emit normally
    console.log(`[DEBUG SOCKET] Socket connected, emitting broadcast_score event`);
    socket.emit('broadcast_score', {
      roomId,
      userId,
      userName,
      score,
      isCorrect,
      questionId
    });
  }
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

// Leave a challenge room with a custom message
export const leaveRoom = (
  roomId: string, 
  userId: string, 
  isChallenger: boolean = false,
  customMessage?: string
): {
  roomId: string;
  userId: string;
  isChallenger: boolean;
  customMessage: string;
} => {
  if (!socket || !socket.connected) {
    console.warn('Cannot leave room: socket not connected');
    return { roomId, userId, isChallenger, customMessage: customMessage || 'Player has left the game.' };
  }
  
  console.log('Preparing leave room data:', { roomId, userId, isChallenger, customMessage });
  
  // Instead of emitting the event, just prepare the data to be used by confirmLeaveRoom
  const leaveData = { 
    roomId, 
    userId, 
    isChallenger,
    customMessage: customMessage || 'Player has left the game.'
  };
  
  // Return the data so the component can show a confirmation dialog
  return leaveData;
};

// Enhanced pingServer function with response handling
export const pingServer = (userId: string, callback?: (success: boolean) => void): void => {
  try {
  const socket = initSocket();
    const timestamp = Date.now();
    
    // If a callback was provided, set up a one-time response handler
    if (callback) {
      // Set a timeout in case server doesn't respond
      const timeoutId = setTimeout(() => {
        socket.off('pong_test');
        callback(false);
      }, 3000);
      
      // Listen for pong response
      socket.once('pong_test', (data: { timestamp: number }) => {
        clearTimeout(timeoutId);
        const responseTime = Date.now() - data.timestamp;
        console.log(`[SOCKET] Ping response received in ${responseTime}ms`);
        callback(true);
      });
    }
    
    // Send the ping request with timestamp and userId for tracking
    socket.emit('ping_test', { userId, timestamp });
  } catch (error) {
    console.error('[SOCKET] Error pinging server:', error);
    if (callback) callback(false);
  }
};

// Register a callback for when an opponent leaves
export const onOpponentLeft = (callback: (data: any) => void): () => void => {
  const socket = initSocket();
  
  // Remove any existing listeners to prevent duplicates
  socket.off('opponent_left');
  
  // Add the new listener
  socket.on('opponent_left', (data: any) => {
    console.log('OPPONENT LEFT EVENT in onOpponentLeft handler:', data);
    callback(data);
  });
  
  // Return a cleanup function
  return () => socket.off('opponent_left');
};

// Register a callback for leave_room events
export const onLeaveRoom = (callback: (data: any) => void): () => void => {
  const socket = initSocket();
  
  // Remove any existing listeners to prevent duplicates
  socket.off('leave_room');
  
  // Add the new listener
  socket.on('leave_room', (data: any) => {
    console.log('LEAVE ROOM EVENT in onLeaveRoom handler:', data);
    callback(data);
  });
  
  // Return a cleanup function
  return () => socket.off('leave_room');
};

// Register a callback for system messages
export const onSystemMessage = (callback: (data: any) => void): () => void => {
  const socket = initSocket();
  
  // Remove any existing listeners to prevent duplicates
  socket.off('system_message');
  
  // Add the new listener
  socket.on('system_message', (data: any) => {
    console.log('SYSTEM MESSAGE EVENT in handler:', data);
    callback(data);
  });
  
  // Return a cleanup function
  return () => socket.off('system_message');
};

// Identify user to socket server
export const forceIdentify = (userId: string): void => {
  try {
    if (!userId) {
      console.error('[SOCKET] Cannot identify: userId is empty');
      return;
    }
    
    const socket = initSocket();
    
    if (!socket) {
      console.error('[SOCKET] Cannot identify: failed to initialize socket');
      return;
    }
    
    // Store userId in localStorage for reconnection
    if (typeof window !== 'undefined') {
      localStorage.setItem('socketUserId', userId);
    }
    
    // Check if socket is connected
    if (!socket.connected) {
      console.warn('[SOCKET] Socket not connected when trying to identify. Connecting...');
      socket.connect();
      
      // Wait for connection and then identify
      socket.once('connect', () => {
        console.log('[SOCKET] Socket connected, now identifying user:', userId);
        socket.emit('identify', { userId });
        
        // Double check by emitting a ping after identification
        setTimeout(() => {
          socket.emit('ping_test', { userId, timestamp: Date.now() });
        }, 500);
      });
    } else {
      // Socket is already connected, just identify
      console.log('[SOCKET] Identifying user to socket server:', userId);
      socket.emit('identify', { userId });
      
      // Double check by emitting a ping after identification
      setTimeout(() => {
        socket.emit('ping_test', { userId, timestamp: Date.now() });
      }, 500);
    }
  } catch (error) {
    console.error('[SOCKET] Error in forceIdentify:', error);
  }
};

// Modified identify that will always try to identify, supporting reconnection
export const identifyUser = (userId: string): void => {
  // Always force identify to ensure user-socket mapping is current
  forceIdentify(userId);
};

// Add event handler for user answer
export const onUserAnswer = (callback: (data: UserAnswer) => void): () => void => {
  const socket = initSocket();
  
  const handler = (data: UserAnswer) => {
    console.log("[DEBUG] User answer received:", data);
    callback(data);
  };
  
  socket.on('user_answer', handler);
  
  return () => {
    socket.off('user_answer', handler);
  };
};

// Listen for time sync events
export const onTimeSync = (callback: (data: { timeLeft: number }) => void): () => void => {
  const socket = initSocket();
  
  const handler = (data: { timeLeft: number }) => {
    // Ensure time is a positive number
    const timeLeft = Math.max(0, Math.round(data.timeLeft));
    callback({ timeLeft });
  };
  
  socket.on('time_sync', handler);
  
  return () => {
    socket.off('time_sync', handler);
  };
};

// Request a new question when duplicate is detected
export const requestNewQuestion = (
  roomId: string,
  userId: string,
  excludeIds: string[]
): void => {
  console.log(`[DEBUG SOCKET] Requesting new question for room ${roomId}`);
  console.log(`[DEBUG SOCKET] Excluding question IDs:`, excludeIds);
  
  const socket = initSocket();
  
  // Check if socket is connected
  if (!socket.connected) {
    console.error(`[DEBUG SOCKET] Socket not connected! Attempting reconnection before requesting new question`);
    socket.connect();
    
    // Set up a one-time event listener for when the socket connects
    socket.once('connect', () => {
      console.log(`[DEBUG SOCKET] Socket reconnected, now requesting new question`);
      socket.emit('request_new_question', { roomId, userId, excludeIds });
    });
  } else {
    // Socket is connected, emit normally
    console.log(`[DEBUG SOCKET] Socket connected, emitting request_new_question event`);
    socket.emit('request_new_question', { roomId, userId, excludeIds });
  }
};

// Fixed useSocketStatus hook with proper initialization
export const useSocketStatus = () => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(true);
  
  // Initialize socket status checking
  useEffect(() => {
    // Skip on server-side
    if (typeof window === 'undefined') {
      setIsChecking(false);
      setIsConnected(false);
      return;
    }
    
    setIsChecking(true);
    
    // Check socket status immediately
    const checkSocketStatus = async () => {
      try {
        const isWorking = await isSocketWorking();
        setIsConnected(isWorking);
      } catch (error) {
        console.error('[SOCKET] Error checking status:', error);
        setIsConnected(false);
      } finally {
        setIsChecking(false);
      }
    };
    
    // Initial check
    checkSocketStatus();
    
    // Check periodically (every 30 seconds)
    const interval = setInterval(checkSocketStatus, 30000);
    
    // Check on window focus
    const handleFocus = () => {
      setIsChecking(true);
      checkSocketStatus();
    };
    
    window.addEventListener('focus', handleFocus);
    
    // Cleanup
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);
  
  return { isConnected, isChecking };
};

// Safe socket initialization function with error handling

// Add a new function to actually leave after confirmation
export const confirmLeaveRoom = (leaveData: any): void => {
  const socket = initSocket();
  if (!socket || !socket.connected) {
    console.warn('Cannot leave room: socket not connected');
    return;
  }
  
  console.log('Confirmed leave - emitting leave_room event with data:', leaveData);
  socket.emit('leave_room', leaveData);
};
