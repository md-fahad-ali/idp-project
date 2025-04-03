"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useDashboard } from '../../../provider';
import { useActivity } from '../../../activity-provider';
import { LeaderboardEntry } from '../../../types';
import Avatar from "boring-avatars";
import Loading from '../../../../components/ui/Loading';
import { createChallengeRoom, navigateToChallengeRoom, checkInRoom } from '../../../services/socketService';
import ChallengeNotification from '../../../components/ChallengeNotification';
import ChallengeQuiz from '../../../components/ChallengeQuiz';
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

const ITEMS_PER_PAGE = 20;

export default function CourseLeaderboardPage() {
  const { title } = useParams();
  const router = useRouter();
  const { token, user, refreshUserData } = useDashboard();
  const { isUserActive } = useActivity();
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [courseData, setCourseData] = useState<ICourse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasPassedUsers, setHasPassedUsers] = useState(false);
  const [hasMultipleUsers, setHasMultipleUsers] = useState(false);
  const [isSendingChallenge, setIsSendingChallenge] = useState<string | null>(null);
  const [usersInRoom, setUsersInRoom] = useState<{ [key: string]: boolean }>({});

  // Format time from seconds to MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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

  // Calculate pagination
  const totalPages = Math.ceil(leaderboardData.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentData = leaderboardData.slice(startIndex, endIndex);

  // Find user's rank in this course
  const userRank = user ? leaderboardData.findIndex(entry => entry._id === user._id) + 1 : 0;

  // Add function to check room status
  const checkUserRoomStatus = async (userId: string) => {
    try {
      const isInRoom = await checkInRoom(userId);
      setUsersInRoom(prev => ({ ...prev, [userId]: isInRoom }));
      return isInRoom;
    } catch (error) {
      console.error('Error checking room status:', error);
      return false;
    }
  };

  // Add useEffect to check room status periodically for active users
  useEffect(() => {
    const checkActiveUsersRoomStatus = async () => {
      for (const entry of currentData) {
        if (isUserActive(entry._id) && entry._id !== user?._id) {
          await checkUserRoomStatus(entry._id);
        }
      }
    };

    checkActiveUsersRoomStatus();
    const interval = setInterval(checkActiveUsersRoomStatus, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [currentData, user?._id]);

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
      <div className="min-h-screen pt-[100px] bg-[#6016a7] flex items-center justify-center text-[#E6F1FF]">
        <Loading />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen pt-[100px] bg-[#6016a7] text-[#E6F1FF]">
        <div className="container mx-auto px-4">
          <div className="bg-[#2f235a] p-4 rounded-lg border-2 border-black text-[#FF6B6B]">
            <p>⚠️ {error}</p>
            <Link 
              href="/dashboard"
              className="mt-2 px-4 py-2 bg-[#9D4EDD] text-white rounded-md hover:bg-[#8A2BE2] transition-colors inline-block"
            >
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-[100px] pb-20 bg-[#6016a7] text-[#E6F1FF]">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 gap-8">
          {/* Course Title */}
          <div className="bg-[#294268] border-4 border-black rounded-lg p-4 sm:p-6 shadow-[8px_8px_0px_0px_#000000]">
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-0 items-center sm:justify-between">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#E6F1FF] font-mono text-center sm:text-left">
                {courseData?.title} Leaderboard
              </h1>
              <Link 
                href={`/course/${title}`}
                className="px-4 py-2 bg-[#FFD700] text-black font-bold rounded-md border-2 border-black shadow-[4px_4px_0px_0px_#000000] hover:shadow-[6px_6px_0px_0px_#000000] transition-all duration-200"
              >
                Back to Course
              </Link>
            </div>
          </div>

          {/* User's Current Rank */}
          {user && userRank > 0 && (
            <div className="bg-[#294268] border-4 border-black rounded-lg p-6 shadow-[8px_8px_0px_0px_#000000]">
              <h2 className="text-2xl font-bold text-[#E6F1FF] mb-4 font-mono">
                Your Ranking in This Course
              </h2>
              <div className="bg-[#2f235a] p-4 rounded-lg border-2 border-black">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
                  <div className="flex items-center mb-3 sm:mb-0">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center">
                      <span className="text-xl sm:text-2xl font-bold">#{userRank}</span>
                    </div>
                    <div className="flex-shrink-0 w-10 h-10 bg-[#9D4EDD] rounded-full overflow-hidden border-2 border-black ml-2">
                      {user.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt="Your avatar"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Avatar
                          size={40}
                          name={user._id}
                          variant="beam"
                          colors={["#6016a7", "#9D4EDD", "#FFD700", "#5CDB95", "#E6F1FF"]}
                        />
                      )}
                    </div>
                    <div className="ml-4">
                      <h3 className="font-bold text-[#E6F1FF]">
                        {user.firstName} {user.lastName}
                      </h3>
                      <p className="text-sm text-[#8892B0]">
                        Tests: {user.testsCompleted || 0} | Avg Score: {Math.round(user.averageScore || 0)}%
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center sm:flex-col sm:items-end">
                    <span className="text-[#FFD700] font-bold text-xl">
                      {leaderboardData.find(entry => entry._id === user._id)?.points || 0} {isUserActive(user._id) ? '🟢' : '🔴'}
                    </span>
                    <p className="text-xs text-[#8892B0] ml-2 sm:ml-0">points</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Course Rankings */}
          <div className="bg-[#294268] border-4 border-black rounded-lg p-6 shadow-[8px_8px_0px_0px_#000000]">
            <h2 className="text-2xl font-bold text-[#E6F1FF] mb-6 font-mono">
              Top Performers
            </h2>
            
            {!hasPassedUsers ? (
              <div className="bg-[#2f235a] p-8 rounded-lg border-2 border-black text-center">
                <p className="text-xl text-[#E6F1FF]">No users have passed any tests for this course yet.</p>
                <p className="mt-2 text-[#8892B0]">Be the first to complete a test and earn points!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {currentData.map((entry, index) => (
                  <div
                    key={entry._id}
                    className="flex flex-col justify-between md:flex-row items-start md:items-center bg-[#2f235a] p-4 rounded-lg border-2 border-black transition-transform hover:transform hover:translate-x-1 hover:-translate-y-1"
                  >
                    <div className="flex items-center w-full md:w-auto mb-3 md:mb-0">
                      {/* Rank Number */}
                      <div className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 flex items-center justify-center">
                        {startIndex + index + 1 <= 3 ? (
                          <span className="text-xl md:text-2xl">
                            {startIndex + index + 1 === 1 ? '🥇' : startIndex + index + 1 === 2 ? '🥈' : '🥉'}
                          </span>
                        ) : (
                          <span className="text-lg md:text-xl font-bold text-[#8892B0]">#{startIndex + index + 1}</span>
                        )}
                      </div>

                      {/* Avatar */}
                      <div className="flex-shrink-0 w-10 h-10 bg-[#9D4EDD] rounded-full overflow-hidden border-2 border-black ml-2">
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
                            variant="beam"
                            colors={["#6016a7", "#9D4EDD", "#FFD700", "#5CDB95", "#E6F1FF"]}
                          />
                        )}
                      </div>

                      {/* User Info */}
                      <div className="ml-4 flex-grow">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-[#E6F1FF]">
                            {entry.firstName} {entry.lastName}
                          </h3>
                        </div>
                        <p className="text-sm text-[#8892B0]">
                          Tests: {entry.testsCompleted} | Avg Score: {Math.round(entry.averageScore)}%
                          {entry.averageTimeSpent && entry.averageTimeSpent < Number.MAX_SAFE_INTEGER && (
                            <> | Avg Time: {formatTime(entry.averageTimeSpent)}</>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Score and Challenge Button */}
                    <div className="flex-shrink-0 flex flex-row md:flex-col items-center md:items-end justify-between w-full md:w-auto mt-2 md:mt-0">
                      <div className="flex items-center">
                        <span className="text-[#FFD700] font-bold text-xl">
                          {isUserActive(entry._id) ? '🟢' : '🔴'} {entry.points || 0} 
                        </span>
                        <p className="text-xs text-[#8892B0] ml-1 md:ml-0 md:text-right">points</p>
                      </div>
                      
                      {isUserActive(entry._id) && entry._id !== user?._id && (
                        <button 
                          className={`px-3 py-1 border-black text-xs font-bold rounded border border-black transition-colors md:mt-2 shadow-[4px_5px_0px_0px_black] active:shadow-[0px_0px_0px_0px_black] ${
                            usersInRoom[entry._id] 
                              ? 'bg-gray-400 cursor-not-allowed text-gray-700' 
                              : 'bg-[#ffb500] text-black hover:bg-[#ff4f4f]'
                          }`}
                          onClick={() => handleSendChallenge(entry._id, `${entry.firstName} ${entry.lastName}`)}
                          disabled={isSendingChallenge === entry._id || usersInRoom[entry._id]}
                          title={usersInRoom[entry._id] ? 'User is currently in a challenge' : 'Send challenge'}
                        >
                          {isSendingChallenge === entry._id ? (
                            <span className="inline-flex items-center">
                              <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Sending...
                            </span>
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
              </div>
            )}

            {/* Pagination - only show if we have multiple users */}
            {hasMultipleUsers && totalPages > 1 && (
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-0 sm:space-x-4">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="w-full sm:w-auto px-4 py-2 bg-[#2f235a] text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#3f336a] transition-colors"
                >
                  Previous
                </button>
                <div className="flex items-center space-x-2">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={i}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-8 h-8 sm:w-10 sm:h-10 rounded-md flex items-center justify-center ${
                          currentPage === pageNum
                            ? 'bg-[#9D4EDD] text-white'
                            : 'bg-[#2f235a] text-[#8892B0] hover:bg-[#3f336a]'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  {totalPages > 5 && currentPage < totalPages - 2 && (
                    <>
                      <span className="text-[#8892B0]">...</span>
                      <button
                        onClick={() => setCurrentPage(totalPages)}
                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-md flex items-center justify-center bg-[#2f235a] text-[#8892B0] hover:bg-[#3f336a]"
                      >
                        {totalPages}
                      </button>
                    </>
                  )}
                </div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="w-full sm:w-auto px-4 py-2 bg-[#2f235a] text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#3f336a] transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </div>

          <ChallengeNotification />
          
        </div>
      </div>
    </div>
  );
} 