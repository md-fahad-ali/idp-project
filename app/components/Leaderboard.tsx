"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Avatar from 'boring-avatars';

interface LeaderboardEntry {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  totalScore: number;
  testsCompleted: number;
  averageScore: number;
  rank?: number;
  avatarUrl?: string;
}

interface LeaderboardProps {
  currentUserId?: string;
  courseId?: string;  // Optional - if provided, shows leaderboard for specific course
  isAdmin?: boolean;
}

export default function Leaderboard({ currentUserId, courseId, isAdmin }: LeaderboardProps) {
  const [showAllRankers, setShowAllRankers] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);

  // Fetch leaderboard data
  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const endpoint = courseId 
        ? `/api/leaderboard/course/${courseId}`
        : '/api/leaderboard';
      
      const response = await fetch(endpoint);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Received non-JSON response from server");
      }

      const text = await response.text(); // Get the raw text first
      if (!text) {
        throw new Error("Empty response from server");
      }

      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error("Raw response:", text);
        throw new Error("Invalid JSON response from server");
      }

      if (!Array.isArray(data)) {
        throw new Error("Expected array of leaderboard entries");
      }

      // Validate and filter the data
      const validData = data.filter((entry: any) => {
        return (
          entry &&
          typeof entry._id === 'string' &&
          typeof entry.firstName === 'string' &&
          typeof entry.lastName === 'string' &&
          typeof entry.totalScore === 'number' &&
          typeof entry.testsCompleted === 'number' &&
          typeof entry.averageScore === 'number'
        );
      });
      
      // Filter out current user from top 4 if they're highly ranked
      const filteredData = validData.filter((entry: LeaderboardEntry) => entry._id !== currentUserId);
      setLeaderboardData(filteredData);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      setError(error instanceof Error ? error.message : 'Failed to load leaderboard data');
      setLeaderboardData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [courseId, currentUserId]); // Added currentUserId as dependency

  if (loading) {
    return (
      <div className="animate-pulse">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-[#2f235a] h-16 mb-2 rounded-lg"></div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#2f235a] p-4 rounded-lg border-2 border-black text-[#FF6B6B]">
        <p>⚠️ {error}</p>
        <button 
          onClick={fetchLeaderboard}
          className="mt-2 px-4 py-2 bg-[#9D4EDD] text-white rounded-md hover:bg-[#8A2BE2] transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  const topRankers = showAllRankers ? leaderboardData : leaderboardData.slice(0, 4);

  return (
    <div 
      className=" border-4 border-black rounded-lg p-6 shadow-[8px_8px_0px_0px_#000000]"
      suppressHydrationWarning={true}
    >
      <h2 className="text-2xl font-bold text-[#E6F1FF] mb-6 font-mono">
        {courseId ? 'Course Leaderboard' : 'Global Rankings'} 
        {isAdmin && ' - Your Course'}
      </h2>

      {leaderboardData.length === 0 ? (
        <p className="text-[#8892B0] text-center py-4">No rankings available yet.</p>
      ) : (
        <>
          <div 
            className="space-y-4"
            suppressHydrationWarning={true}
          >
            {topRankers.map((entry, index) => (
              <div
                key={entry._id}
                className="flex items-center bg-[#2f235a] p-4 rounded-lg border-2 border-black transition-transform hover:transform hover:translate-x-1 hover:-translate-y-1"
              >
                {/* Rank Medal/Number */}
                <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center">
                  {index + 1 <= 3 ? (
                    <span className="text-2xl">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                    </span>
                  ) : (
                    <span className="text-xl font-bold text-[#8892B0]">{index + 1}</span>
                  )}
                </div>

                {/* Avatar */}
                <div className="flex-shrink-0 w-10 h-10 bg-[#9D4EDD] rounded-full overflow-hidden border-2 border-black">
                  <Avatar 
                    name={`${entry.firstName} ${entry.lastName}`}
                    variant="beam"
                    size={36}
                  />
                </div>

                {/* User Info */}
                <div className="ml-4 flex-grow">
                  <h3 className="font-bold text-[#E6F1FF]">
                    {entry.firstName} {entry.lastName}
                  </h3>
                  <p className="text-sm text-[#8892B0]">
                    Tests: {entry.testsCompleted} | Avg Score: {Math.round(entry.averageScore)}%
                  </p>
                </div>

                {/* Score */}
                <div className="flex-shrink-0 text-right">
                  <span className="text-[#FFD700] font-bold text-xl">
                    {entry.totalScore}
                  </span>
                  <p className="text-xs text-[#8892B0]">points</p>
                </div>
              </div>
            ))}
          </div>

          {/* Find More Button */}
          {!showAllRankers && leaderboardData.length > 4 && (
            <button
              onClick={() => setShowAllRankers(true)}
              className="w-full mt-6 p-3 text-center border-4 border-black rounded-md bg-[#FFD700] text-black font-bold shadow-[4px_4px_0px_0px_#000000] transition-all duration-200 hover:bg-[#F8C100] hover:shadow-[6px_6px_0px_0px_#000000]"
            >
              Find More
            </button>
          )}

          {/* View Full Rankings Link */}
          {showAllRankers && !courseId && (
            <Link
              href="/rankings"
              className="block w-full mt-6 p-3 text-center border-4 border-black rounded-md bg-[#9D4EDD] text-white font-bold shadow-[4px_4px_0px_0px_#000000] transition-all duration-200 hover:bg-[#7B2CBF] hover:shadow-[6px_6px_0px_0px_#000000]"
              prefetch={false}
            >
              View Full Rankings
            </Link>
          )}
        </>
      )}
    </div>
  );
} 