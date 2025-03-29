"use client";

import { useState, useEffect } from 'react';
import { useDashboard } from '../provider';
import { LeaderboardEntry, User } from '../types';
import Avatar from "boring-avatars";

const ITEMS_PER_PAGE = 20;

interface Achievement {
  emoji: string;
  title: string;
  description: string;
}

export default function RankingsPage() {
  const { user, refreshUserData } = useDashboard();
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasPassedUsers, setHasPassedUsers] = useState(false);
  const [hasMultipleUsers, setHasMultipleUsers] = useState(false);

  // Format time from seconds to MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Fetch leaderboard data
  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/leaderboard');
      
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
      console.error('Error fetching leaderboard:', error);
      setError(error instanceof Error ? error.message : 'Failed to load leaderboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  // Calculate pagination
  const totalPages = Math.ceil(leaderboardData.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentData = leaderboardData.slice(startIndex, endIndex);

  console.log(user?.points);
  // Find user's rank
  const userRank = leaderboardData.findIndex(entry => entry._id === user?._id) + 1;

  if (loading) {
    return (
      <div className="min-h-screen pt-[100px] bg-[#6016a7] text-[#E6F1FF]">
        <div className="container mx-auto px-4">
          <div className="animate-pulse space-y-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="bg-[#2f235a] h-16 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen pt-[100px] bg-[#6016a7] text-[#E6F1FF]">
        <div className="container mx-auto px-4">
          <div className="bg-[#2f235a] p-4 rounded-lg border-2 border-black text-[#FF6B6B]">
            <p>⚠️ {error}</p>
            <button 
              onClick={fetchLeaderboard}
              className="mt-2 px-4 py-2 bg-[#9D4EDD] text-white rounded-md hover:bg-[#8A2BE2] transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-[100px] pb-20 bg-[#6016a7] text-[#E6F1FF]">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 gap-8">
          {/* User's Current Rank */}
          {user && userRank > 0 && (
            <div className="bg-[#294268] border-4 border-black rounded-lg p-6 shadow-[8px_8px_0px_0px_#000000]">
              <h2 className="text-2xl font-bold text-[#E6F1FF] mb-4 font-mono">
                Your Current Ranking
              </h2>
              <div className="bg-[#2f235a] p-4 rounded-lg border-2 border-black">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-12 h-12 flex items-center justify-center">
                      <span className="text-2xl font-bold">#{userRank}</span>
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
                  <div className="text-right">
                    <span className="text-[#FFD700] font-bold text-xl">
                      
                      {user.points || 0}
                    </span>
                    <p className="text-xs text-[#8892B0]">points</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Global Rankings */}
          <div className="bg-[#294268] border-4 border-black rounded-lg p-6 shadow-[8px_8px_0px_0px_#000000]">
            <h2 className="text-2xl font-bold text-[#E6F1FF] mb-6 font-mono">
              Global Rankings
            </h2>
            
            {!hasPassedUsers ? (
              <div className="bg-[#2f235a] p-8 rounded-lg border-2 border-black text-center">
                <p className="text-xl text-[#E6F1FF]">No users have passed any tests yet.</p>
                <p className="mt-2 text-[#8892B0]">Be the first to complete a test and earn points!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {currentData.map((entry, index) => (
                  <div
                    key={entry._id}
                    className="flex items-center bg-[#2f235a] p-4 rounded-lg border-2 border-black transition-transform hover:transform hover:translate-x-1 hover:-translate-y-1"
                  >
                    {/* Rank Number */}
                    <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center">
                      {startIndex + index + 1 <= 3 ? (
                        <span className="text-2xl">
                          {startIndex + index + 1 === 1 ? '🥇' : startIndex + index + 1 === 2 ? '🥈' : '🥉'}
                        </span>
                      ) : (
                        <span className="text-xl font-bold text-[#8892B0]">#{startIndex + index + 1}</span>
                      )}
                    </div>

                    {/* Avatar */}
                    <div className="flex-shrink-0 w-10 h-10 bg-[#9D4EDD] rounded-full overflow-hidden border-2 border-black">
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
                      <h3 className="font-bold text-[#E6F1FF]">
                        {entry.firstName} {entry.lastName}
                      </h3>
                      <p className="text-sm text-[#8892B0]">
                        Tests: {entry.testsCompleted} | Avg Score: {Math.round(entry.averageScore)}%
                        {entry.averageTimeSpent && entry.averageTimeSpent < Number.MAX_SAFE_INTEGER && (
                          <> | Avg Time: {formatTime(entry.averageTimeSpent)}</>
                        )}
                      </p>
                    </div>

                    {/* Score */}
                    <div className="flex-shrink-0 text-right">
                      <span className="text-[#FFD700] font-bold text-xl">
                        {entry.points || 0}
                      </span>
                      <p className="text-xs text-[#8892B0]">points</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination - only show if we have multiple users */}
            {hasMultipleUsers && totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center space-x-4">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-[#2f235a] text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#3f336a] transition-colors"
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
                        className={`w-10 h-10 rounded-md flex items-center justify-center ${
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
                        className="w-10 h-10 rounded-md flex items-center justify-center bg-[#2f235a] text-[#8892B0] hover:bg-[#3f336a]"
                      >
                        {totalPages}
                      </button>
                    </>
                  )}
                </div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 bg-[#2f235a] text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#3f336a] transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 