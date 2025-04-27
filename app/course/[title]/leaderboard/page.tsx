"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useDashboard } from '../../../provider';
import { useActivity } from '../../../activity-provider';
import { useTheme } from '../../../provider/theme-provider';
import { LeaderboardEntry } from '../../../types';
import Avatar from "boring-avatars";
import Loading from '../../../../components/ui/Loading';
import { createChallengeRoom, checkInRoom, initSocket } from '../../../services/socketService';

import { toast } from 'react-hot-toast';

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
}

const ITEMS_PER_PAGE = 20;

export default function CourseLeaderboardPage() {
  const { title } = useParams();
  const router = useRouter();
  const { token, user, refreshUserData } = useDashboard();
  const { isUserActive } = useActivity();
  const { theme } = useTheme();
  const [leaderboardData, setLeaderboardData] = useState<EnhancedLeaderboardEntry[]>([]);
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
  const dashboardUser = user as DashboardUser; // Explicitly cast to our local interface

  // Format time from seconds to MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Save challenge room info to localStorage
  const saveChallengeRoomToStorage = (data: { roomId: string; opponent: string; opponentAccepted: boolean }) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('challengeRoomInfo', JSON.stringify({
        ...data,
        timestamp: Date.now() // Add timestamp to track age
      }));
    }
  };

  // Clear challenge room info from localStorage
  const clearChallengeRoomFromStorage = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('challengeRoomInfo');
    }
  };

  // Get course ID from title slug
  const getCourseId = async (titleSlug: string) => {
    try {
      const response = await fetch(`/api/course/get`, {
        headers: {
          'Authorization': `Bearer ${token || ''}`
        }
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Find the course that matches the URL slug
      const matchingCourse = data.courses.find((c: ICourse) => {
        const courseSlug = c.title.toLowerCase().replace(/\s+/g, '-');
        return courseSlug === titleSlug;
      });
      
      if (matchingCourse) {
        setCourseData(matchingCourse);
        return matchingCourse._id;
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching course:', error);
      return null;
    }
  };

  // Fetch leaderboard data for specific course
  const fetchLeaderboard = async (courseId: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/leaderboard/course/${courseId}`, {
        headers: {
          'Authorization': `Bearer ${token || ''}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Handle new response format
      if (data.users) {
        setLeaderboardData(data.users);
        setHasPassedUsers(data.hasPassedUsers);
        setHasMultipleUsers(data.hasMultipleUsers);
      } else {
        // For backward compatibility with older API
        setLeaderboardData(data);
        setHasPassedUsers(data.length > 0);
        setHasMultipleUsers(data.length > 1);
      }

      // Refresh user data to get latest points
      if (refreshUserData) {
        await refreshUserData();
      }
    } catch (error) {
      console.error('Error fetching course leaderboard:', error);
      setError(error instanceof Error ? error.message : 'Failed to load leaderboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initData = async () => {
      if (title) {
        const titleSlug = Array.isArray(title) ? title[0] : title;
        const courseId = await getCourseId(titleSlug);
        if (courseId) {
          fetchLeaderboard(courseId);
        } else {
          setError('Course not found');
          setLoading(false);
        }
      }
    };
    
    initData();
  }, [title, token]);

  // Load challenge room info from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && user) {
      const storedRoom = localStorage.getItem('challengeRoomInfo');
      
      if (storedRoom) {
        try {
          const roomData = JSON.parse(storedRoom);
          
          // Check if stored data is too old (more than 2 hours)
          const twoHoursMs = 2 * 60 * 60 * 1000;
          const isTooOld = Date.now() - roomData.timestamp > twoHoursMs;
          
          if (isTooOld) {
            // Clear outdated data
            clearChallengeRoomFromStorage();
          } else {
            // Verify if the room still exists on the server
            const socket = initSocket();
            socket.emit('check_room_exists', { roomId: roomData.roomId });
            
            // Handle response
            const handleRoomExistsResponse = (data: { exists: boolean }) => {
              socket.off('room_exists_response', handleRoomExistsResponse);
              
              if (data.exists) {
                // Set the room info from storage
                setChallengeRoomInfo({
                  roomId: roomData.roomId,
                  opponent: roomData.opponent,
                  opponentAccepted: roomData.opponentAccepted
                });
              } else {
                // Room no longer exists, clear storage
                clearChallengeRoomFromStorage();
              }
            };
            
            socket.on('room_exists_response', handleRoomExistsResponse);
            
            // Set a timeout to avoid hanging if server doesn't respond
            setTimeout(() => {
              socket.off('room_exists_response', handleRoomExistsResponse);
              
              // Set the room info anyway as a fallback if we don't get a response
              setChallengeRoomInfo({
                roomId: roomData.roomId,
                opponent: roomData.opponent,
                opponentAccepted: roomData.opponentAccepted
              });
            }, 3000);
          }
        } catch (error) {
          console.error('Error parsing stored challenge room data:', error);
          clearChallengeRoomFromStorage();
        }
      }
    }
  }, [user]);

  // Calculate pagination
  const totalPages = Math.ceil(leaderboardData.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentData = leaderboardData.slice(startIndex, endIndex);

  // Find user's rank in this course
  const userRank = user ? leaderboardData.findIndex(entry => entry._id === user._id) + 1 : 0;

  // Listen for challenge acceptance
  useEffect(() => {
    if (!user) return;
    
    const socket = initSocket();
    
    // Listen for challenge accepted event
    socket.on('challenge_accepted', (data: { roomId: string }) => {
      // If this roomId matches our current challenge room, update status
      if (challengeRoomInfo && challengeRoomInfo.roomId === data.roomId) {
        const updatedInfo = {
          ...challengeRoomInfo,
          opponentAccepted: true
        };
        
        setChallengeRoomInfo(updatedInfo);
        
        // Update localStorage with accepted status
        saveChallengeRoomToStorage(updatedInfo);
      }
    });
    
    // Listen for challenge completed/ended event
    socket.on('challenge_results', () => {
      // Clear the challenge info when the challenge is completed
      setChallengeRoomInfo(null);
      clearChallengeRoomFromStorage();
    });
    
    // Listen for opponent leaving the room
    socket.on('opponent_left', (data: { roomId: string, userName: string }) => {
      // Check if this is for our current room
      console.log("opponent_left", data);
      if (challengeRoomInfo && challengeRoomInfo.roomId === data.roomId) {
        // Clear challenge info
        setChallengeRoomInfo(null);
        clearChallengeRoomFromStorage();
        
        // Notify the user
        toast.error(`${data.userName} has left the challenge room.`);
      }
    });

    socket.on("leave_room", (data: { roomId: string, userId: string, userName: string }) => {
      console.log("leave_room", data);
    });
    
    // Listen for challenge being canceled
    socket.on('challenge_canceled', (data: { roomId: string }) => {
      if (challengeRoomInfo && challengeRoomInfo.roomId === data.roomId) {
        setChallengeRoomInfo(null);
        clearChallengeRoomFromStorage();
        toast.error('The challenge has been canceled.');
      }
    });
    
    // Listen for user being disconnected
    socket.on('user_disconnected', (data: { userId: string }) => {
      if (user._id === data.userId) {
        setChallengeRoomInfo(null);
        clearChallengeRoomFromStorage();
      }
    });

    return () => {
      socket.off('challenge_accepted');
      socket.off('challenge_results');
      socket.off('opponent_left');
      socket.off('challenge_canceled');
      socket.off('user_disconnected');
    };
  }, [user, challengeRoomInfo]);

  // Function to handle exiting the challenge room
  const exitChallengeRoom = () => {
    if (challengeRoomInfo?.roomId) {
      const socket = initSocket();
      
      // Notify the server that we're leaving
      socket.emit('leave_room', {
        roomId: challengeRoomInfo.roomId,
        userId: user?._id,
        isExplicit: true // Flag to indicate this is an explicit leave action
      });
      
      // Clear all local storage related to challenges
      setChallengeRoomInfo(null);
      clearChallengeRoomFromStorage();
      
      if (typeof window !== 'undefined') {
        // Clear any session storage flags
        sessionStorage.removeItem('enteringChallengeRoom');
      }
      
      toast.success('Left the challenge room');
    }
  };

  // Add function to check room status
  const checkUserRoomStatus = async (userId: string) => {
    try {
      const isInRoom = await checkInRoom(userId);
      setUsersInRoom(prev => ({ ...prev, [userId]: isInRoom }));
      return isInRoom;
    } catch (error) {
      console.error('Error checking room status:', error);
      // Don't update the state on error to keep previous values
      return false;
    }
  };

  // Add useEffect to check room status periodically for active users
  useEffect(() => {
    // Only check users who are active
    const activeUsers = currentData.filter(entry => 
      isUserActive(entry._id) && entry._id !== user?._id
    );
    
    // Skip if no active users to check
    if (activeUsers.length === 0) return;
    
    // Create an async function to check all users with a small delay between each
    const checkActiveUsersRoomStatus = async () => {
      for (const entry of activeUsers) {
        try {
          await checkUserRoomStatus(entry._id);
          // Add a small delay between API calls to prevent overwhelming the server
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (err) {
          // Silently continue with the next user if one check fails
          continue;
        }
      }
    };

    // Initial check
    checkActiveUsersRoomStatus();
    
    // Check periodically
    const interval = setInterval(checkActiveUsersRoomStatus, 15000); // Check every 15 seconds instead of 10

    return () => clearInterval(interval);
  }, [currentData, user?._id, isUserActive]);

  // Handle sending challenge request
  const handleSendChallenge = async (challengedId: string, challengedName: string) => {
    if (!user || !courseData) return;
    
    setIsSendingChallenge(challengedId);
    
    try {
      // Check if either user is in a room
      const [challengerInRoom, challengedInRoom] = await Promise.all([
        checkInRoom(user._id),
        checkInRoom(challengedId)
      ]);

      if (challengerInRoom) {
        toast.error('You are already in an active challenge!');
        return;
      }

      if (challengedInRoom) {
        toast.error(`${challengedName} is already in an active challenge!`);
        setUsersInRoom(prev => ({ ...prev, [challengedId]: true }));
        return;
      }

      // If neither user is in a room, create the challenge
      const roomId = await createChallengeRoom(
        user._id, 
        challengedId,
        courseData._id
      );
      
      // Store the challenge room info
      const roomInfo = {
        roomId,
        opponent: challengedName,
        opponentAccepted: false
      };
      
      setChallengeRoomInfo(roomInfo);
      
      // Save to localStorage for persistence
      saveChallengeRoomToStorage(roomInfo);
      
      // Show success message
      toast.success(`Challenge sent to ${challengedName}! Waiting for them to accept...`);
      
      // Don't navigate to the room yet - wait for the opponent to accept
      // The challenger will be redirected when they receive the 'challenge_started' event
      // via the ChallengeNotification component
    } catch (error) {
      console.error('Error sending challenge:', error);
      toast.error('Failed to send challenge. Please try again.');
    } finally {
      setIsSendingChallenge(null);
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen pt-[100px] flex items-center justify-center text-[var(--text-color)]">
        <Loading />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen pt-[100px] text-[var(--text-color)]">
        <div className="container mx-auto px-4">
          <div className="bg-[var(--card-bg)] p-4 rounded-lg border-2 border-[var(--card-border)] text-[var(--error-text)]">
            <p>⚠️ {error}</p>
            <Link 
              href="/dashboard"
              className="mt-2 px-4 py-2 bg-[var(--purple-primary)] text-white rounded-md hover:bg-[var(--purple-secondary)] transition-colors inline-block"
            >
              Return to Dashboard
            </Link>
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
          <div className="bg-[var(--card-bg)] border-4 border-[var(--card-border)] rounded-lg p-3 sm:p-4 md:p-6 shadow-[8px_8px_0px_0px_var(--card-border)]">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-center justify-between">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-[var(--text-color)] font-mono text-center sm:text-left">
                {courseData?.title} Leaderboard
              </h1>
              <Link 
                href={`/course/${title}`}
                className="px-3 py-1.5 sm:px-4 sm:py-2 bg-[var(--yellow-light)] text-black font-bold rounded-md border-2 border-[var(--card-border)] shadow-[4px_4px_0px_0px_var(--card-border)] hover:shadow-[6px_6px_0px_0px_var(--card-border)] transition-all duration-200"
              >
                Back to Course
              </Link>
            </div>
          </div>

          {/* User's Current Rank */}
          {user && userRank > 0 && (
            <div className="bg-[var(--card-bg)] border-4 border-[var(--card-border)] rounded-lg p-4 sm:p-5 md:p-6 shadow-[8px_8px_0px_0px_var(--card-border)]">
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
                        {leaderboardData.find(entry => entry._id === dashboardUser._id)?.points || 0} {isUserActive(dashboardUser._id) ? '🟢' : '🔴'}
                      </span>
                      <p className="text-xs text-[var(--text-secondary)] ml-2 sm:ml-0">points</p>
                    </div>
                    
                 
                    
                    {challengeRoomInfo?.roomId && challengeRoomInfo.opponentAccepted && (
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Link 
                          href={`/room/course/${typeof title === 'string' ? title.toLowerCase().replace(/\s+/g, '-') : 'challenge'}/${user?.firstName?.toLowerCase() || 'user1'}/${challengeRoomInfo.opponent.split(' ')[0]?.toLowerCase() || 'user2'}?roomId=${challengeRoomInfo.roomId}`}
                          className="mt-2 px-3 py-1 bg-[var(--yellow-light)] text-black font-bold rounded border-2 border-[var(--card-border)] shadow-[4px_4px_0px_0px_var(--card-border)] hover:shadow-[2px_2px_0px_0px_var(--card-border)] transition-all duration-200 text-sm"
                          onClick={() => {
                            // Mark that we're entering the room (for session tracking)
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
                    {/* Waiting for opponent message */}
                    {challengeRoomInfo?.roomId && !challengeRoomInfo.opponentAccepted && (
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
            </div>
          )}

          {/* Course Rankings */}
          <div className="bg-[var(--card-bg)] border-4 border-[var(--card-border)] rounded-lg p-6 shadow-[8px_8px_0px_0px_var(--card-border)]">
            <h2 className="text-2xl font-bold text-[var(--text-color)] mb-6 font-mono">
              Top Performers
            </h2>
            
            {!hasPassedUsers ? (
              <div className="bg-[var(--question-bg)] p-8 rounded-lg border-2 border-[var(--card-border)] text-center">
                <p className="text-xl text-[var(--text-color)]">No users have passed any tests for this course yet.</p>
                <p className="mt-2 text-[var(--text-secondary)]">Be the first to complete a test and earn points!</p>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {currentData.map((entry, index) => (
                  <div
                    key={entry._id}
                    className="flex flex-col justify-between md:flex-row items-start md:items-center bg-[var(--question-bg)] p-3 sm:p-4 rounded-lg border-2 border-[var(--card-border)] shadow-[4px_4px_0px_0px_var(--card-border)] transition-transform hover:transform hover:translate-x-1 hover:-translate-y-1"
                  >
                    <div className="flex items-center w-full md:w-auto mb-3 md:mb-0">
                      {/* Rank & Avatar (desktop) */}
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

                      <div className="ml-4 flex-grow">
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-[var(--text-color)]">
                            {entry.firstName} {entry.lastName}
                          </h3>
                        </div>
                          <p className="text-sm text-[var(--text-secondary)]">
                          Tests: {entry.testsCompleted} | Avg Score: {Math.round(entry.averageScore)}%
                          {entry.averageTimeSpent && entry.averageTimeSpent < Number.MAX_SAFE_INTEGER && (
                            <> | Avg Time: {formatTime(entry.averageTimeSpent)}</>
                          )}
                        </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex-shrink-0 flex flex-row md:flex-col items-center md:items-end justify-between w-full md:w-auto mt-2 md:mt-0">
                      <div className="flex items-center">
                        <span className="text-[var(--text-highlight)] font-bold text-xl">
                          {isUserActive(entry._id) ? '🟢' : '🔴'} {entry.points || 0} 
                        </span>
                        <p className="text-xs text-[var(--text-secondary)] ml-1 md:ml-0 md:text-right">points</p>
                      </div>
                      
                    
                      
                      {isUserActive(entry._id) && entry._id !== user?._id && (
                        <button 
                          className={`px-3 py-1 border-[var(--card-border)] text-xs font-bold rounded border border-[var(--card-border)] transition-colors md:mt-2 shadow-[4px_5px_0px_0px_var(--card-border)] active:shadow-[0px_0px_0px_0px_var(--card-border)] ${
                            usersInRoom[entry._id] 
                              ? 'bg-gray-400 cursor-not-allowed text-gray-700' 
                              : 'bg-[var(--yellow-light)] text-black hover:bg-[var(--red-primary)]'
                          }`}
                          onClick={() => handleSendChallenge(entry._id, `${entry.firstName} ${entry.lastName}`)}
                          disabled={usersInRoom[entry._id] || !!challengeRoomInfo || isSendingChallenge !== null}
                        >
                          {isSendingChallenge === entry._id ? (
                            <span className="inline-block animate-pulse">Sending...</span>
                          ) : usersInRoom[entry._id] ? (
                            "In Challenge"
                          ) : (
                            "Challenge"
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-8">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                      className="w-full sm:w-auto px-4 py-2 bg-[var(--question-bg)] text-[var(--text-color)] rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--card-bg)] transition-colors"
                >
                  Previous
                </button>
                    
                    <div className="flex gap-2">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum = i + 1;
                        
                        // Adjust page numbers for pagination with more than 5 pages
                        if (totalPages > 5) {
                          if (currentPage > 3 && currentPage < totalPages - 1) {
                            pageNum = currentPage + i - 2;
                          } else if (currentPage >= totalPages - 1) {
                      pageNum = totalPages - 4 + i;
                          }
                    }

                        return pageNum <= totalPages ? (
                      <button
                            key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-8 h-8 sm:w-10 sm:h-10 rounded-md flex items-center justify-center ${
                          currentPage === pageNum
                                ? 'bg-[var(--purple-primary)] text-white'
                                : 'bg-[var(--question-bg)] text-[var(--text-secondary)] hover:bg-[var(--card-bg)]'
                        }`}
                      >
                        {pageNum}
                      </button>
                        ) : null;
                  })}
                      
                  {totalPages > 5 && currentPage < totalPages - 2 && (
                    <>
                          <span className="text-[var(--text-secondary)]">...</span>
                      <button
                        onClick={() => setCurrentPage(totalPages)}
                            className="w-8 h-8 sm:w-10 sm:h-10 rounded-md flex items-center justify-center bg-[var(--question-bg)] text-[var(--text-secondary)] hover:bg-[var(--card-bg)]"
                      >
                        {totalPages}
                      </button>
                    </>
                  )}
                </div>
                    
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                      className="w-full sm:w-auto px-4 py-2 bg-[var(--question-bg)] text-[var(--text-color)] rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--card-bg)] transition-colors"
                >
                  Next
                </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 