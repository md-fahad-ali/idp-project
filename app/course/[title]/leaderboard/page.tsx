"use client";

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useDashboard } from '../../../provider';
import { useActivity } from '../../../activity-provider';
import { useTheme } from '../../../provider/theme-provider';
import { LeaderboardEntry } from '../../../types';
import Avatar from "boring-avatars";
import Loading from '../../../../components/ui/Loading';
import { createChallengeRoom, checkInRoom, useSocketStatus, initSafeSocket } from '../../../services/socketService';
import initSocket from '../../../services/socketService';
import { toast } from 'react-hot-toast';
import useSWR from 'swr';
import { motion } from 'framer-motion';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.3
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { 
    opacity: 1, 
    y: 0,
    transition: { 
      type: "spring", 
      stiffness: 100,
      damping: 12
    }
  },
  hover: {
    scale: 1.02,
    boxShadow: "6px 6px 0px 0px var(--card-border)",
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 10
    }
  },
  tap: {
    scale: 0.98,
    boxShadow: "2px 2px 0px 0px var(--card-border)",
  }
};

// Add hover animation variants
const hoverVariants = {
  hover: {
    scale: 1.02,
    boxShadow: "6px 6px 0px 0px var(--card-border)",
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 10
    }
  },
  tap: {
    scale: 0.98,
    boxShadow: "2px 2px 0px 0px var(--card-border)",
  }
};

interface ICourse {
  _id: string;
  title: string;
  category: string;
  description: string;
  lessons: any[];
  createdAt: string;
  user?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    _id: string;
  };
}

interface DashboardUser {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl?: string;
  testsCompleted?: number;
  averageScore?: number;
  points?: number;
}

// Add an extended LeaderboardEntry interface that includes activityDates
interface EnhancedLeaderboardEntry extends LeaderboardEntry {
  activityDates?: string[];
  badges?: {
    brained?: number;
    warrior?: number;
    unbeatable?: number;
  };
}

// Add interface for challenge event data
interface ChallengeEventData {
  challengerId: string;
  challengerName: string;
  challengedId: string;
  challengedName: string;
  courseId: string;
  courseName: string;
  roomId: string;
}

const ITEMS_PER_PAGE = 20;

// Add a cache expiration time constant
const CACHE_EXPIRATION_TIME = 60000; // 1 minute cache

// Get the API URL utility function remains the same
const getApiUrl = (path: string): string => {
  // Get the base URL dynamically (will work in both dev and production)
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  return `${baseUrl}${path}`;
};

// Update the fetcher function with proper types
const fetcher = async (url: string): Promise<any> => {
  try {
    console.log("Fetching leaderboard data from:", url);
    const token = localStorage.getItem('token');
    console.log("Token available:", Boolean(token));
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error fetching leaderboard data:", response.status, errorText);
      throw new Error(`HTTP error! Status: ${response.status}. Details: ${errorText}`);
    }
    
    const data = await response.json();
    console.log("Leaderboard data received:", data);
    console.log("Number of leaderboard entries:", Array.isArray(data?.users) ? data.users.length : 0);
    return data;
  } catch (error) {
    console.error("Error in leaderboard fetcher:", error);
    throw error;
  }
};

// Update getTitleSlug function to better extract the actual course title from URL
const getTitleSlug = (title: string | string[] | undefined): string => {
  if (!title) {
    // If no title is provided, extract from URL path in client-side
    if (typeof window !== 'undefined') {
      // Parse the URL path to get the actual course title
      const pathSegments = window.location.pathname.split('/');
      // The course title should be the third segment in /course/[title]/leaderboard
      if (pathSegments.length >= 3) {
        console.log('Extracted title from URL path:', pathSegments[2]);
        return decodeURIComponent(pathSegments[2]).trim();
      }
    }
    return '';
  }
  
  // If we got a literal "[title]" string, this is a bug - extract from URL instead
  if (title === '[title]' || title === '%5Btitle%5D') {
    console.log('Detected literal [title] parameter, falling back to URL path extraction');
    if (typeof window !== 'undefined') {
      const pathSegments = window.location.pathname.split('/');
      if (pathSegments.length >= 3) {
        console.log('Extracted title from URL path instead:', pathSegments[2]);
        return decodeURIComponent(pathSegments[2]).trim();
      }
    }
    return '';
  }
  
  let rawTitle = '';
  if (Array.isArray(title)) {
    rawTitle = title[0] || '';
  } else if (typeof title === 'string') {
    rawTitle = title;
  }
  
  // Clean up and normalize the title
  return decodeURIComponent(rawTitle).trim();
};

// Move the socket initialization to the module level outside of the component
let globalSocket: any = null;

export default function CourseLeaderboardPage() {
  // ===== HOOK DECLARATIONS - All hooks must be called before any conditional logic =====
  // URL and router hooks
  const { title } = useParams();
  const router = useRouter();
  
  // Context hooks 
  const { token, user } = useDashboard();
  const { isUserActive } = useActivity();
  const { theme } = useTheme();
  
  // All state must be initialized unconditionally
  const [titleSlug, setTitleSlug] = useState<string>('');
  const [courseId, setCourseId] = useState<string | null>(null);
  const [courseData, setCourseData] = useState<ICourse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasPassedUsers, setHasPassedUsers] = useState(false);
  const [hasMultipleUsers, setHasMultipleUsers] = useState(false);
  const [isSendingChallenge, setIsSendingChallenge] = useState<string | null>(null);
  const [usersInRoom, setUsersInRoom] = useState<{ [key: string]: boolean }>({});
  const [challengeRoomInfo, setChallengeRoomInfo] = useState<{
    roomId: string;
    opponent: string;
    opponentAccepted: boolean;
  } | null>(null);
  const [initializing, setInitializing] = useState(true);
  
  // Socket status hook - call before any conditional logic
  const { isConnected: isSocketConnected, isChecking: isCheckingSocket } = useSocketStatus();
  
  // ===== SOCKET DECLARATION - Create socket safely =====
  // Use a ref to store the socket instance - refs don't cause re-renders
  const socketRef = useRef<any>(null);
  
  // ===== DATA FETCHING HOOK - Use SWR for data fetching =====
  // Place all SWR hooks at the top level to maintain consistent order
  const { data: leaderboardResponse, error: leaderboardError, isLoading, mutate } = useSWR<{users: EnhancedLeaderboardEntry[]}>(
    courseId && token ? getApiUrl(`/api/leaderboard/course/${courseId}`) : null,
    fetcher,
    {
      dedupingInterval: CACHE_EXPIRATION_TIME,
      // Add these SWR options to optimize loading speed
      keepPreviousData: true,
      revalidateOnFocus: false,
      revalidateIfStale: false,
      revalidateOnMount: false, // Don't fetch immediately on mount
      onSuccess: (data) => {
        console.log("SWR success - leaderboard data:", data);
        if (data?.users && Array.isArray(data.users)) {
          console.log(`Received ${data.users.length} users in leaderboard data`);
          setHasPassedUsers(data.users.length > 0);
        } else {
          console.warn("Unexpected data format from leaderboard API:", data);
          setHasPassedUsers(false);
        }
      },
      onError: (err) => {
        console.error("SWR error fetching leaderboard data:", err);
        setHasPassedUsers(false);
        setError("Failed to load leaderboard data. Please try again later.");
      }
    }
  );
  
  // Process leaderboard data safely
  const leaderboardData = leaderboardResponse?.users || [];

  // Add a useEffect to fetch data after component mount
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if (courseId && token) {
      // Delay data fetching to ensure UI renders first
      timeoutId = setTimeout(() => {
        mutate(); // Trigger data fetching after a short delay
      }, 500);
    }
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [courseId, token, mutate]);
  
  // ===== DERIVED VALUES =====
  const dashboardUser = user as DashboardUser; // Explicitly cast to our local interface
  const userRank = user ? (Array.isArray(leaderboardData) ? leaderboardData : []).findIndex(entry => entry._id === user._id) + 1 : 0;
  
  // Define getCourseId before it's used - define as a named function that doesn't depend on state
  const getCourseId = async (titleSlug: string) => {
    try {
      console.log('Fetching course with slug:', titleSlug);
      
      // Special handling for when we accidentally get the literal "[title]" parameter
      if (titleSlug === '[title]') {
        console.log('Detected literal [title] as slug, extracting actual title from URL');
        if (typeof window !== 'undefined') {
          const pathSegments = window.location.pathname.split('/');
          if (pathSegments.length >= 3) {
            titleSlug = decodeURIComponent(pathSegments[2]).trim();
            console.log('Using actual title from URL instead:', titleSlug);
          }
        }
      }
      
      console.log('Using token:', token ? 'Token exists' : 'No token');
      
      const response = await fetch(getApiUrl('/api/course/get'), {
        headers: {
          'Authorization': `Bearer ${token || ''}`
        }
      });
      
      if (!response.ok) {
        console.error(`HTTP error! status: ${response.status}`);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.courses || !Array.isArray(data.courses) || data.courses.length === 0) {
        console.error('No courses found in API response');
        return null;
      }
      
      // Normalize the search term
      const normalizedTitleSlug = titleSlug.toLowerCase();
      
      // First attempt: Direct title match (case insensitive)
      let matchingCourse = data.courses.find((c: ICourse) => 
        c.title.toLowerCase() === normalizedTitleSlug
      );
      
      // Second attempt: Slug match (spaces replaced with hyphens)
      if (!matchingCourse) {
        matchingCourse = data.courses.find((c: ICourse) => {
          const courseSlug = c.title.toLowerCase().replace(/\s+/g, '-');
          return courseSlug === normalizedTitleSlug;
        });
      }
      
      // Third attempt: Check if normalizedTitleSlug is part of the course title
      if (!matchingCourse) {
        matchingCourse = data.courses.find((c: ICourse) => 
          c.title.toLowerCase().includes(normalizedTitleSlug) || 
          normalizedTitleSlug.includes(c.title.toLowerCase())
        );
      }
      
      // Fourth attempt: Try with spaces replaced by hyphens but only comparing the first part
      if (!matchingCourse && normalizedTitleSlug.includes('-')) {
        const firstPart = normalizedTitleSlug.split('-')[0];
        matchingCourse = data.courses.find((c: ICourse) => 
          c.title.toLowerCase().startsWith(firstPart)
        );
      }
      
      if (matchingCourse) {
        setCourseData(matchingCourse);
        return matchingCourse._id;
      }
      
      console.error('No matching course found for slug:', titleSlug);
      return null;
    } catch (error) {
      console.error('Error fetching course:', error);
      return null;
    }
  };
  
  // Define the renderSkeletonUI function - should not depend on any state that might cause re-renders
  const renderSkeletonUI = () => {
    return (
      <motion.div 
        initial="hidden"
        animate="show"
        variants={containerVariants}
        className="space-y-4 mt-4"
      >
        {[...Array(6)].map((_, i) => (
          <motion.div 
            key={i}
            variants={itemVariants}
            className="flex items-center bg-[var(--card-bg-lighter)] p-4 rounded-lg border-2 border-[var(--card-border)] opacity-70 animate-pulse"
          >
            {/* Rank placeholder */}
            <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center">
              <div className="w-8 h-8 rounded-full bg-[var(--placeholder)]"></div>
            </div>
            
            {/* Avatar placeholder */}
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[var(--placeholder)]"></div>
            
            {/* User info placeholder */}
            <div className="ml-4 flex-grow">
              <div className="h-4 w-24 bg-[var(--placeholder)] rounded mb-2"></div>
              <div className="h-3 w-36 bg-[var(--placeholder)] rounded"></div>
            </div>
            
            {/* Score placeholder */}
            <div className="flex-shrink-0 text-right">
              <div className="h-5 w-10 bg-[var(--placeholder)] rounded mb-1"></div>
              <div className="h-3 w-8 bg-[var(--placeholder)] rounded"></div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    );
  };
  
  // ===== EFFECT HOOKS =====
  
  // 1. Initialize socket safely on mount - only once
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    try {
      // Always create a fresh socket connection
      const socket = initSocket();
      
      // Force reconnect if disconnected
      if (socket && !socket.connected) {
        socket.connect();
      }
      
      // Store in both global and ref
      globalSocket = socket;
      socketRef.current = socket;
      
      console.log('Socket initialized in leaderboard page, connected:', socket.connected);
      
      // Set up listeners
      socket.on('connect', () => {
        console.log('Socket connected!');
      });
      
      socket.on('disconnect', () => {
        console.log('Socket disconnected!');
      });
      
      socket.on('connect_error', (err: Error) => {
        console.error('Socket connection error:', err);
      });
      
      return () => {
        socket.off('connect');
        socket.off('disconnect');
        socket.off('connect_error');
      };
    } catch (err) {
      console.error('Error initializing socket:', err);
    }
  }, []);
  
  // 2. Extract title from URL on mount
  useEffect(() => {
    try {
      const extractedTitle = getTitleSlug(title);
      setTitleSlug(extractedTitle);
    } catch (err) {
      console.error('Error extracting title:', err);
      setError('Failed to parse course title');
    }
  }, [title]);

  // Optimize initData to prioritize UI rendering
  useEffect(() => {
    const initData = async () => {
      try {
        // Extract the title slug from URL params
        const extractedTitleSlug = getTitleSlug(title);
        console.log('Title slug extracted:', extractedTitleSlug);
        setTitleSlug(extractedTitleSlug);
        
        // UI is now ready to show, set initializing to false
        setInitializing(false);
        
        // Now initiate course ID fetch in the background
        let id = null;
        try {
          id = await getCourseId(extractedTitleSlug);
          console.log('Course ID fetched:', id);
          setCourseId(id);
        } catch (err) {
          console.error('Error fetching course ID:', err);
          setError('Could not find this course. Please check the URL and try again.');
        }
        
        // Loading is considered complete even if there are errors
        // This allows error states to render properly
        setLoading(false);
      } catch (err) {
        console.error('Error in initData:', err);
        setLoading(false);
        setError('An error occurred while loading the page. Please try again.');
      }
    };

    // Run init immediately on component mount
    initData();
  }, [title]);
  
  // 4. Handle missing token separately
  useEffect(() => {
    if (!token && !initializing) {
      setLoading(false);
      setError('User information not available');
    }
  }, [token, initializing]);

  // 5. Safely handle localStorage and challenge room info
  useEffect(() => {
    if (typeof window === 'undefined' || !user) return;
    
    try {
      const storedRoom = localStorage.getItem('challengeRoomInfo');
      
      if (storedRoom) {
        try {
          const roomData = JSON.parse(storedRoom);
          
          // Check if stored data is too old (more than 2 hours)
          const twoHoursMs = 2 * 60 * 60 * 1000;
          const isTooOld = Date.now() - roomData.timestamp > twoHoursMs;
          
          if (isTooOld) {
            localStorage.removeItem('challengeRoomInfo');
          } else {
            // Simply set the room info from storage without checking with socket
            setChallengeRoomInfo({
              roomId: roomData.roomId,
              opponent: roomData.opponent,
              opponentAccepted: roomData.opponentAccepted
            });
          }
        } catch (parseError) {
          console.error('Error parsing stored challenge room data:', parseError);
          localStorage.removeItem('challengeRoomInfo');
        }
      }
    } catch (e) {
      console.error('Error in challengeRoom useEffect:', e);
    }
  }, [user]);

  // Define helper functions for challenge rooms that don't depend on state
  const saveChallengeRoomToStorage = (data: { roomId: string; opponent: string; opponentAccepted: boolean }) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('challengeRoomInfo', JSON.stringify({
        ...data,
        timestamp: Date.now() // Add timestamp to track age
      }));
    }
  };

  const clearChallengeRoomFromStorage = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('challengeRoomInfo');
    }
  };

  // Add a state variable for showing a confirmation dialog
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [exitData, setExitData] = useState<any>(null);

  // Modify the exitChallengeRoom function to be more resilient
  const exitChallengeRoom = () => {
    try {
      if (challengeRoomInfo?.roomId) {
        // Prepare the exit data but don't send it immediately
        try {
          const socket = initSocket();
          if (socket && socket.connected) {
            // Get the data for leaving, but don't emit the event yet
            const leaveData = {
              roomId: challengeRoomInfo.roomId,
              userId: user?._id,
              isExplicit: true // Flag to indicate this is an explicit leave action
            };
            
            // Store the data and show confirmation dialog
            setExitData(leaveData);
            setShowExitConfirm(true);
          }
        } catch (socketError) {
          console.error('Socket error during exit challenge room preparation:', socketError);
        }
      }
    } catch (e) {
      console.error('Error in exitChallengeRoom:', e);
      setChallengeRoomInfo(null);
      clearChallengeRoomFromStorage();
    }
  };

  // Confirm exit room action
  const confirmExit = () => {
    if (exitData && challengeRoomInfo?.roomId) {
      try {
        const socket = initSocket();
        if (socket && socket.connected) {
          // Now actually send the leave room event
          socket.emit('leave_room', exitData);
        }
        
        // Clean up local state
        setChallengeRoomInfo(null);
        clearChallengeRoomFromStorage();
        
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('enteringChallengeRoom');
        }
        
        toast.success('Left the challenge room');
      } catch (error) {
        console.error('Error confirming exit:', error);
        setChallengeRoomInfo(null);
        clearChallengeRoomFromStorage();
      }
    }
    
    // Reset confirmation state
    setShowExitConfirm(false);
    setExitData(null);
  };

  // Cancel exit room action
  const cancelExit = () => {
    setShowExitConfirm(false);
    setExitData(null);
  };

  // Define the retry function for error handling
  const retry = () => {
    setError(null);
    setLoading(true);
    // No need to refresh leaderboard, SWR will handle it
    
    try {
      const extractedTitle = getTitleSlug(title);
      setTitleSlug(extractedTitle);
      setInitializing(true);
    } catch (err) {
      console.error('Error re-extracting title during retry:', err);
    }
  };

  // Calculate pagination
  const totalPages = Math.ceil((Array.isArray(leaderboardData) ? leaderboardData : []).length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentData = (Array.isArray(leaderboardData) ? leaderboardData : []).slice(startIndex, endIndex);

  // Fix the handleSendChallenge function to properly emit socket events
  const handleSendChallenge = async (challengedId: string, challengedName: string) => {
    if (!user || !courseData) return;
    
    setIsSendingChallenge(challengedId);
    
    try {
      // Get socket instance directly
      const socket = typeof window !== 'undefined' ? initSocket() : null;
      
      if (!socket) {
        throw new Error('Socket not available');
      }
      
      // Create the challenge room
      const roomId = await createChallengeRoom(
        user._id, 
        challengedId,
        courseData._id
      );
      
      // Explicitly emit the challenge event for notifications
      socket.emit('challenge_request', {
        challengerId: user._id,
        challengerName: `${user.firstName} ${user.lastName}`,
        challengedId: challengedId,
        challengedName: challengedName,
        courseId: courseData._id,
        courseName: courseData.title,
        roomId: roomId
      });
      
      // Store the challenge room info
      const roomInfo = {
        roomId,
        opponent: challengedName,
        opponentAccepted: false
      };
      
      setChallengeRoomInfo(roomInfo);
      saveChallengeRoomToStorage(roomInfo);
      toast.success(`Challenge sent to ${challengedName}! Waiting for them to accept...`);
    } catch (error) {
      console.error('Error sending challenge:', error);
      toast.error('Failed to send challenge. Please try again.');
    } finally {
      setIsSendingChallenge(null);
    }
  };

  // Update the renderChallengeButton function to check if user is online and hide for Ali Baset
  const renderChallengeButton = (entry: EnhancedLeaderboardEntry) => {
    // Don't show challenge button for Ali Baset
    if (entry.firstName === 'Ali' && entry.lastName === 'Baset') {
      return (
        <span className="text-xs text-[var(--text-secondary)] italic px-3 py-1">
          Offline
        </span>
      );
    }
    
    // Always show Challenge button for all other users (for debugging)
    return (
      <button 
        className="px-3 py-1 bg-[var(--yellow-light)] text-black text-sm font-bold rounded border-2 border-[var(--card-border)] shadow-[4px_4px_0px_0px_var(--card-border)] hover:shadow-[2px_2px_0px_0px_var(--card-border)] transition-all duration-200"
        onClick={() => handleSendChallenge(entry._id, `${entry.firstName} ${entry.lastName}`)}
        disabled={isSendingChallenge === entry._id}
      >
        {isSendingChallenge === entry._id ? "Sending..." : "Challenge"}
      </button>
    );
  };

  // Update the checkUserRoomStatus function with proper types
  const checkUserRoomStatus = async (userId: string): Promise<boolean> => {
    if (!userId) {
      console.log("No userId provided to checkUserRoomStatus");
      return false;
    }
    
    try {
      const timeoutPromise = new Promise<boolean>((_, reject) => {
        setTimeout(() => reject(new Error("Timeout checking room status")), 8000);
      });
      
      const requestPromise = new Promise<boolean>(async (resolve) => {
        try {
          const result = await checkInRoom(userId);
          resolve(result);
        } catch (error) {
          console.error("Error checking room status:", error);
          resolve(false);
        }
      });
      
      return await Promise.race([requestPromise, timeoutPromise]);
    } catch (error) {
      console.error("Error checking room status:", error);
      return false;
    }
  };

  // Add a useEffect for socket event listeners
  useEffect(() => {
    if (!user || !socketRef.current) return;
    
    const socket = socketRef.current;
    
    // Set up socket event listeners for challenges
    socket.on('challenge_accepted', (data: any) => {
      if (data.challengerId === user._id) {
        // Our challenge was accepted
        toast.success(`${data.challengedName} accepted your challenge!`);
        
        if (challengeRoomInfo && challengeRoomInfo.roomId === data.roomId) {
          setChallengeRoomInfo({
            ...challengeRoomInfo,
            opponentAccepted: true
          });
          
          saveChallengeRoomToStorage({
            ...challengeRoomInfo,
            opponentAccepted: true
          });
        }
      }
    });
    
    socket.on('challenge_declined', (data: any) => {
      if (data.challengerId === user._id) {
        toast.error(`${data.challengedName} declined your challenge.`);
        
        // Remove challenge info if it matches
        if (challengeRoomInfo && challengeRoomInfo.roomId === data.roomId) {
          setChallengeRoomInfo(null);
          clearChallengeRoomFromStorage();
        }
      }
    });
    
    // Clean up
    return () => {
      socket.off('challenge_accepted');
      socket.off('challenge_declined');
    };
  }, [user, challengeRoomInfo]);

  // Add a state variable to track if the challenge is completed
  const [isChallengeCompleted, setIsChallengeCompleted] = useState(false);
  
  // Add a useEffect to check if the challenge is completed when the component mounts
  useEffect(() => {
    if (!challengeRoomInfo?.roomId) return;
    
    const checkChallengeStatus = async () => {
      try {
        // Check if we have a record of this challenge being completed in localStorage
        const completedChallenges = localStorage.getItem('completedChallenges');
        if (completedChallenges) {
          const challenges = JSON.parse(completedChallenges);
          if (challenges.includes(challengeRoomInfo.roomId)) {
            setIsChallengeCompleted(true);
            return;
          }
        }
        
        // If not in local storage, use the socket to check room status
        const socket = initSocket();
        if (socket && socket.connected) {
          socket.emit('check_room_status', { roomId: challengeRoomInfo.roomId }, (response: any) => {
            if (response && response.status === 'completed') {
              setIsChallengeCompleted(true);
              
              // Store this completed challenge in localStorage
              const completedChallenges = localStorage.getItem('completedChallenges');
              const challenges = completedChallenges ? JSON.parse(completedChallenges) : [];
              if (!challenges.includes(challengeRoomInfo.roomId)) {
                challenges.push(challengeRoomInfo.roomId);
                localStorage.setItem('completedChallenges', JSON.stringify(challenges));
              }
            }
          });
        }
      } catch (error) {
        console.error('Error checking challenge status:', error);
      }
    };
    
    checkChallengeStatus();
  }, [challengeRoomInfo?.roomId]);
  
  // Also listen for game completion events
  useEffect(() => {
    if (!socketRef.current || !challengeRoomInfo?.roomId) return;
    
    const socket = socketRef.current;
    
    const handleChallengeComplete = (data: any) => {
      if (data.roomId === challengeRoomInfo?.roomId) {
        setIsChallengeCompleted(true);
        
        // Store this completed challenge in localStorage
        const completedChallenges = localStorage.getItem('completedChallenges');
        const challenges = completedChallenges ? JSON.parse(completedChallenges) : [];
        if (!challenges.includes(data.roomId)) {
          challenges.push(data.roomId);
          localStorage.setItem('completedChallenges', JSON.stringify(challenges));
        }
      }
    };
    
    socket.on('challenge_complete', handleChallengeComplete);
    socket.on('challenge_ended', handleChallengeComplete);
    
    return () => {
      socket.off('challenge_complete', handleChallengeComplete);
      socket.off('challenge_ended', handleChallengeComplete);
    };
  }, [socketRef.current, challengeRoomInfo?.roomId]);
  
  // Split leaderboard data into current user and others
  const myEntry = user ? leaderboardData.find(entry => entry._id === user._id) : null;
  const otherEntries = user ? leaderboardData.filter(entry => entry._id !== user._id) : leaderboardData;
  
  // Add a state variable for showing all rankers
  const [showAllRankers, setShowAllRankers] = useState(false);

  if (initializing || loading) {
    return renderSkeletonUI();
  }

  if (error) {
    return (
      <div className={`min-h-screen bg-[var(--background-color)] text-[var(--text-color)] pt-[100px] px-4`}>
        <div className="max-w-lg mx-auto text-center">
          <div className={`bg-[var(--card-bg)] rounded-xl p-8 ${theme === 'dark' ? 'shadow-[0_10px_25px_-5px_rgba(0,0,30,0.3),0_8px_10px_-6px_rgba(0,0,30,0.3)] border-2 border-[#3d4583]' : 'shadow-[8px_8px_0px_0px_#000000] border-4 border-black'}`}>
            <div className="text-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-14 w-14 mx-auto mb-4 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h2 className="text-2xl font-bold mb-4">Error Loading Results</h2>
              <p className="mb-6 text-[var(--text-secondary)]">{error}</p>
              <div className="flex flex-col gap-4 mt-2">
                <button
                  onClick={retry}
                  className="px-4 py-2 bg-[var(--yellow-light)] text-black font-bold rounded-md border-2 border-[var(--card-border)] shadow-[4px_4px_0px_0px_var(--card-border)] hover:shadow-[2px_2px_0px_0px_var(--card-border)] transition-all duration-200"
                >
                  Retry
                </button>
                <button
                  onClick={() => {
                    // Clear token and refresh page to force re-login
                    if (typeof window !== 'undefined') {
                      localStorage.removeItem('token');
                      window.location.reload();
                    }
                  }}
                  className="px-4 py-2 bg-[var(--purple-primary)] text-white font-bold rounded-md border-2 border-[var(--card-border)] shadow-[4px_4px_0px_0px_var(--card-border)] hover:shadow-[2px_2px_0px_0px_var(--card-border)] transition-all duration-200"
                >
                  Refresh Login
                </button>
                <Link
                  href="/dashboard"
                  className="px-4 py-2 bg-[var(--question-bg)] text-[var(--text-color)] font-bold rounded-md border-2 border-[var(--card-border)] shadow-[4px_4px_0px_0px_var(--card-border)] hover:shadow-[2px_2px_0px_0px_var(--card-border)] transition-all duration-200"
                >
                  Back to Dashboard
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-[80px] sm:pt-[100px] pb-10 sm:pb-20 text-[var(--text-color)]">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="grid grid-cols-1 gap-8">
          {/* Course Title */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-[var(--card-bg)] border-4 border-[var(--card-border)] rounded-lg p-3 sm:p-4 md:p-6 shadow-[8px_8px_0px_0px_var(--card-border)]"
          >
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-center justify-between">
              <motion.h1 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="text-xl sm:text-2xl md:text-3xl font-bold text-[var(--text-color)] font-mono text-center sm:text-left"
              >
                {courseData?.title} Leaderboard
              </motion.h1>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4, duration: 0.5 }}
              >
                <Link 
                  href={`/course/${getTitleSlug(title)}`}
                  className="px-3 py-1.5 sm:px-4 sm:py-2 bg-[var(--yellow-light)] text-black font-bold rounded-md border-2 border-[var(--card-border)] shadow-[4px_4px_0px_0px_var(--card-border)] hover:shadow-[6px_6px_0px_0px_var(--card-border)] transition-all duration-200"
                  prefetch={false}
                >
                  Back to Course
                </Link>
              </motion.div>
            </div>
          </motion.div>

          {/* User's Current Rank */}
          {user && userRank > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="bg-[var(--card-bg)] border-4 border-[var(--card-border)] rounded-lg p-4 sm:p-5 md:p-6 shadow-[8px_8px_0px_0px_var(--card-border)]"
            >
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-color)] mb-3 sm:mb-4 font-mono">
                  Your Ranking in This Course
                </h2>
              </div>
              <div className="bg-[var(--question-bg)] p-3 sm:p-4 rounded-lg border-2 border-[var(--card-border)] shadow-[4px_4px_0px_0px_var(--card-border)]">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
                  <div className="flex items-center mb-3 sm:mb-0">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center">
                      <span className="text-xl sm:text-2xl font-bold">#{userRank}</span>
                    </div>
                    <div className="flex-shrink-0 w-10 h-10 bg-[var(--purple-primary)] rounded-full overflow-hidden border-2 border-[var(--card-border)] ml-2">
                      {dashboardUser && dashboardUser.avatarUrl ? (
                        <img
                          src={dashboardUser.avatarUrl}
                          alt={`${dashboardUser.firstName}'s avatar`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Avatar
                          size={40}
                          name={dashboardUser._id || 'user'}
                          variant="beam" 
                          colors={['#92A1C6', '#146A7C', '#F0AB3D', '#C271B4', '#C20D90']}
                        />
                      )}
                    </div>
                    <div className="ml-4">
                      <h3 className="font-bold text-[var(--text-color)]">
                        {dashboardUser.firstName} {dashboardUser.lastName}
                      </h3>
                      <p className="text-sm text-[var(--text-secondary)]">
                        Tests: {dashboardUser.testsCompleted || 0} | Avg Score: {Math.round(dashboardUser.averageScore || 0)}%
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                    <div className="flex items-center sm:flex-col sm:items-end">
                      <span className="text-[var(--text-highlight)] font-bold text-xl">
                        {Array.isArray(leaderboardData) && leaderboardData.find(entry => entry._id === dashboardUser._id)?.points || 0} {isUserActive(dashboardUser._id) ? '🟢' : '🔴'}
                      </span>
                      <p className="text-xs text-[var(--text-secondary)] ml-2 sm:ml-0">points</p>
                    </div>
                    
                    {/* Show challenge buttons only if the challenge is not completed */}
                    {challengeRoomInfo?.roomId && challengeRoomInfo.opponentAccepted && !isChallengeCompleted && (
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Link 
                          href={`/room/course/${typeof title === 'string' ? title.toLowerCase().replace(/\s+/g, '-') : 'challenge'}/${user?.firstName?.toLowerCase() || 'user1'}/${challengeRoomInfo.opponent.split(' ')[0]?.toLowerCase() || 'user2'}?roomId=${challengeRoomInfo.roomId}`}
                          className="mt-2 px-3 py-1 bg-[var(--yellow-light)] text-black font-bold rounded border-2 border-[var(--card-border)] shadow-[4px_4px_0px_0px_var(--card-border)] hover:shadow-[2px_2px_0px_0px_var(--card-border)] transition-all duration-200 text-sm"
                          onClick={() => {
                            if (typeof window !== 'undefined') {
                              sessionStorage.setItem('enteringChallengeRoom', 'true');
                            }
                          }}
                        >
                          Enter Challenge
                        </Link>
                        <button
                          onClick={exitChallengeRoom}
                          className="mt-2 px-3 py-1 bg-[var(--red-primary)] text-white font-bold rounded border-2 border-[var(--card-border)] shadow-[4px_4px_0px_0px_var(--card-border)] hover:shadow-[2px_2px_0px_0px_var(--card-border)] transition-all duration-200 text-sm"
                        >
                          Leave Challenge
                        </button>
                      </div>
                    )}
                    
                    {/* Show completed message if the challenge is completed */}
                    {challengeRoomInfo?.roomId && isChallengeCompleted && (
                      <div className="flex flex-col items-end">
                        <p className="text-sm text-[var(--green-light)] font-semibold">
                          Challenge Completed!
                        </p>
                        <button
                          onClick={() => {
                            // Clear challenge room info when closing a completed challenge
                            setChallengeRoomInfo(null);
                            clearChallengeRoomFromStorage();
                          }}
                          className="mt-2 px-3 py-1 bg-[var(--green-light)] text-black font-bold rounded border-2 border-[var(--card-border)] shadow-[4px_4px_0px_0px_var(--card-border)] hover:shadow-[2px_2px_0px_0px_var(--card-border)] transition-all duration-200 text-sm"
                        >
                          Close
                        </button>
                      </div>
                    )}
                    
                    {/* Waiting for opponent message */}
                    {challengeRoomInfo?.roomId && !challengeRoomInfo.opponentAccepted && !isChallengeCompleted && (
                      <div className="flex flex-col items-end">
                        <p className="text-sm text-[var(--text-secondary)] italic">
                          Waiting for {challengeRoomInfo.opponent} to accept...
                        </p>
                        <button
                          onClick={exitChallengeRoom}
                          className="mt-2 px-3 py-1 bg-[var(--red-primary)] text-white font-bold rounded border-2 border-[var(--card-border)] shadow-[4px_4px_0px_0px_var(--card-border)] hover:shadow-[2px_2px_0px_0px_var(--card-border)] transition-all duration-200 text-sm"
                        >
                          Cancel Challenge
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Course Rankings */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="bg-[var(--card-bg)] border-4 border-[var(--card-border)] rounded-lg p-6 shadow-[8px_8px_0px_0px_var(--card-border)]"
          >
            <motion.h2 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.5 }}
              className="text-2xl font-bold text-[var(--text-color)] mb-6 font-mono"
            >
              Top Performers
            </motion.h2>
            
            {/* Show current user's entry at the top, if present */}
            {myEntry && (
              <motion.div 
                initial="hidden"
                animate="show"
                variants={itemVariants}
                whileHover="hover"
                whileTap="tap"
                className="flex flex-col justify-between md:flex-row items-start md:items-center bg-[var(--question-bg)] p-3 sm:p-4 rounded-lg border-2 border-[var(--card-border)] shadow-[4px_4px_0px_0px_var(--card-border)] mb-4"
              >
                <div className="flex items-center w-full md:w-auto mb-3 md:mb-0">
                  {/* Rank & Avatar */}
                  <div className="flex items-center">
                    <div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center">
                      <span className="text-lg md:text-xl font-bold text-[var(--text-secondary)]">#{userRank}</span>
                    </div>
                    {/* Avatar */}
                    <div className="flex-shrink-0 w-10 h-10 bg-[var(--purple-primary)] rounded-full overflow-hidden border-2 border-[var(--card-border)] ml-2">
                      {myEntry.avatarUrl ? (
                        <img 
                          src={myEntry.avatarUrl} 
                          alt={`${myEntry.firstName}'s avatar`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Avatar
                          size={40}
                          name={myEntry._id}
                          variant="pixel"
                          colors={['#92A1C6', '#146A7C', '#F0AB3D', '#C271B4', '#C20D90']}
                        />
                      )}
                    </div>
                    {/* User Info */}
                    <div className="ml-3">
                      <div className="flex items-center">
                        <h3 className="font-bold text-[var(--text-color)]">
                          {myEntry.firstName} {myEntry.lastName}
                          {isUserActive(myEntry._id) && (
                            <span className="ml-2 inline-block">🟢</span>
                          )}
                        </h3>
                        {/* Badges display */}
                        {myEntry.badges && Object.keys(myEntry.badges).length > 0 && (
                          <div className="flex ml-2 items-center">
                            {myEntry.badges.brained && myEntry.badges.brained > 0 && (
                              <div className="ml-1 flex items-center" title="Challenge Winner Badge">
                                <img src="/badge/brained.jpeg" alt="Brained Badge" className="w-6 h-6 rounded-full" />
                                {myEntry.badges.brained > 1 && (
                                  <span className="text-xs font-bold ml-0.5">
                                    ×{myEntry.badges.brained}
                                  </span>
                                )}
                              </div>
                            )}
                            {myEntry.badges.warrior && myEntry.badges.warrior > 0 && (
                              <div className="ml-1 flex items-center" title="Fastest Challenger Badge">
                                <img src="/badge/warrior.jpeg" alt="Warrior Badge" className="w-6 h-6 rounded-full" />
                                {myEntry.badges.warrior > 1 && (
                                  <span className="text-xs font-bold ml-0.5">
                                    ×{myEntry.badges.warrior}
                                  </span>
                                )}
                              </div>
                            )}
                            {myEntry.badges.unbeatable && myEntry.badges.unbeatable > 0 && (
                              <div className="ml-1 flex items-center" title="Top Course Score Badge">
                                <img src="/badge/unbitable.jpeg" alt="Unbeatable Badge" className="w-6 h-6 rounded-full" />
                                {myEntry.badges.unbeatable > 1 && (
                                  <span className="text-xs font-bold ml-0.5">
                                    ×{myEntry.badges.unbeatable}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-[var(--text-secondary)]">
                        Tests: {myEntry.testsCompleted || 0} | Avg Score: {Math.round(myEntry.averageScore || 0)}%
                      </p>
                    </div>
                  </div>
                </div>
                {/* Points (no Challenge button for self) */}
                <div className="flex flex-row md:flex-col items-center md:items-end justify-between w-full md:w-auto gap-3">
                  <div className="flex items-center md:flex-col md:items-end">
                    <span className="text-[var(--text-highlight)] font-bold text-xl">{myEntry.points || 0}</span>
                    <p className="text-xs text-[var(--text-secondary)] ml-2 md:ml-0">points</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Show other users below, with Challenge button logic */}
            {otherEntries.length > 0 ? (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="space-y-2"
              >
                {otherEntries.map((entry, index) => (
                  <motion.div
                    key={entry._id}
                    variants={itemVariants}
                    whileHover="hover"
                    whileTap="tap"
                    className="flex flex-col justify-between md:flex-row items-start md:items-center bg-[var(--question-bg)] p-3 sm:p-4 rounded-lg border-2 border-[var(--card-border)] shadow-[4px_4px_0px_0px_var(--card-border)] mb-2"
                  >
                    <div className="flex items-center w-full md:w-auto mb-3 md:mb-0">
                      {/* Rank & Avatar */}
                      <div className="flex items-center">
                        <div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center">
                          {index + startIndex < 3 ? (
                            <span className="text-lg md:text-xl">
                              {index + startIndex === 0 ? '🥇' : index + startIndex === 1 ? '🥈' : '🥉'}
                            </span>
                          ) : (
                            <span className="text-lg md:text-xl font-bold text-[var(--text-secondary)]">#{startIndex + index + 1}</span>
                          )}
                        </div>
                        {/* Avatar */}
                        <div className="flex-shrink-0 w-10 h-10 bg-[var(--purple-primary)] rounded-full overflow-hidden border-2 border-[var(--card-border)] ml-2">
                          {entry.avatarUrl ? (
                            <img 
                              src={entry.avatarUrl} 
                              alt={`${entry.firstName}'s avatar`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Avatar
                              size={40}
                              name={entry._id}
                              variant="pixel"
                              colors={['#92A1C6', '#146A7C', '#F0AB3D', '#C271B4', '#C20D90']}
                            />
                          )}
                        </div>
                        {/* User Info */}
                        <div className="ml-3">
                          <div className="flex items-center">
                            <h3 className="font-bold text-[var(--text-color)]">
                              {entry.firstName} {entry.lastName}
                              {isUserActive(entry._id) && (
                                <span className="ml-2 inline-block">🟢</span>
                              )}
                            </h3>
                            {/* Badges display */}
                            {entry.badges && Object.keys(entry.badges).length > 0 && (
                              <div className="flex ml-2 items-center">
                                {entry.badges.brained && entry.badges.brained > 0 && (
                                  <div className="ml-1 flex items-center" title="Challenge Winner Badge">
                                    <img src="/badge/brained.jpeg" alt="Brained Badge" className="w-6 h-6 rounded-full" />
                                    {entry.badges.brained > 1 && (
                                      <span className="text-xs font-bold ml-0.5">
                                        ×{entry.badges.brained}
                                      </span>
                                    )}
                                  </div>
                                )}
                                {entry.badges.warrior && entry.badges.warrior > 0 && (
                                  <div className="ml-1 flex items-center" title="Fastest Challenger Badge">
                                    <img src="/badge/warrior.jpeg" alt="Warrior Badge" className="w-6 h-6 rounded-full" />
                                    {entry.badges.warrior > 1 && (
                                      <span className="text-xs font-bold ml-0.5">
                                        ×{entry.badges.warrior}
                                      </span>
                                    )}
                                  </div>
                                )}
                                {entry.badges.unbeatable && entry.badges.unbeatable > 0 && (
                                  <div className="ml-1 flex items-center" title="Top Course Score Badge">
                                    <img src="/badge/unbitable.jpeg" alt="Unbeatable Badge" className="w-6 h-6 rounded-full" />
                                    {entry.badges.unbeatable > 1 && (
                                      <span className="text-xs font-bold ml-0.5">
                                        ×{entry.badges.unbeatable}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          <p className="text-sm text-[var(--text-secondary)]">
                            Tests: {entry.testsCompleted || 0} | Avg Score: {Math.round(entry.averageScore || 0)}%
                          </p>
                        </div>
                      </div>
                    </div>
                    {/* Points & Challenge Button */}
                    <div className="flex flex-row md:flex-col items-center md:items-end justify-between w-full md:w-auto gap-3">
                      <div className="flex items-center md:flex-col md:items-end">
                        <span className="text-[var(--text-highlight)] font-bold text-xl">{entry.points || 0}</span>
                        <p className="text-xs text-[var(--text-secondary)] ml-2 md:ml-0">points</p>
                      </div>
                      {/* Challenge button logic for others */}
                      <div className="mt-1">
                        {entry.firstName === 'Ali' && entry.lastName === 'Baset' ? (
                          <span className="text-xs text-[var(--text-secondary)] italic px-3 py-1">
                            Offline
                          </span>
                        ) : (
                          renderChallengeButton(entry)
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <div className="bg-[var(--question-bg)] p-8 rounded-lg border-2 border-[var(--card-border)] text-center">
                <p className="text-xl text-[var(--text-color)]">No data to display</p>
                <p className="mt-2 text-[var(--text-secondary)]">Try refreshing or check back later</p>
              </div>
            )}
          </motion.div>

          {/* Find More Button */}
          {!showAllRankers && leaderboardData.length > 4 && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.5 }}
              onClick={() => setShowAllRankers(true)}
              className="w-full mt-6 p-3 text-center border-4 border-black rounded-md bg-[#FFD700] text-black font-bold shadow-[4px_4px_0px_0px_#000000] transition-all duration-200 hover:bg-[#F8C100] hover:shadow-[6px_6px_0px_0px_#000000]"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Find More
            </motion.button>
          )}

          {/* View Full Rankings Link */}
          {showAllRankers && !courseId && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.5 }}
            >
              <Link
                href="/rankings"
                className="block w-full mt-6 p-3 text-center border-4 border-black rounded-md bg-[#9D4EDD] text-white font-bold shadow-[4px_4px_0px_0px_#000000] transition-all duration-200 hover:bg-[#7B2CBF] hover:shadow-[6px_6px_0px_0px_#000000]"
                prefetch={false}
              >
                View Full Rankings
              </Link>
            </motion.div>
          )}
        </div>
      </div>
      
      {/* Exit Confirmation Dialog */}
      {showExitConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[var(--card-bg)] p-6 rounded-lg border-4 border-[var(--card-border)] shadow-[8px_8px_0px_0px_var(--card-border)] max-w-md w-full">
            <h3 className="text-xl font-bold text-[var(--text-color)] mb-4">Leave Challenge?</h3>
            <p className="text-[var(--text-secondary)] mb-6">
              Are you sure you want to leave this challenge? The other player will be notified.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={cancelExit}
                className="px-4 py-2 bg-[var(--question-bg)] text-[var(--text-color)] font-bold rounded-lg border-2 border-[var(--card-border)] shadow-[4px_4px_0px_0px_var(--card-border)] hover:shadow-[2px_2px_0px_0px_var(--card-border)] transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={confirmExit}
                className="px-4 py-2 bg-[var(--red-primary)] text-white font-bold rounded-lg border-2 border-[var(--card-border)] shadow-[4px_4px_0px_0px_var(--card-border)] hover:shadow-[2px_2px_0px_0px_var(--card-border)] transition-all duration-200"
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}