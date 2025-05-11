'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useParams, useRouter } from 'next/navigation';
import { useDashboard } from '../../../provider';
import Link from 'next/link';
import initSocket from '../../../services/socketService';
import confetti from 'canvas-confetti';


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

export default function ChallengeResultPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { user } = useDashboard();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ChallengeResultData | null>(null);
  const title = params.title as string;
  const roomId = searchParams.get('roomId');
  const confettiRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef(initSocket());

  // Function to show confetti animation
  const showConfetti = () => {
    const duration = 5 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      
      // Generate confetti from different positions
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
      });
    }, 250);
  };

  // Fetch result data when component mounts
  useEffect(() => {
    if (!roomId || !user) {
      setError('Missing room ID or user information');
      setLoading(false);
      return;
    }

    console.log('Checking for results with roomId:', roomId);
    
    // Use socket to listen for challenge results
    const socket = socketRef.current;
    
    socket.on('challenge_results', (data: ChallengeResultData) => {
      console.log('Challenge results received:', data);
      
      // Verify this is for our room
      if (data.roomId === roomId) {
        setResult(data);
        setLoading(false);
        
        // Check if user is the winner
        if (data.winnerId === user._id) {
          setTimeout(() => {
            showConfetti();
            // Play victory sound
            const audio = new Audio('/sounds/victory.mp3');
            audio.play().catch(err => console.error('Error playing sound:', err));
          }, 500);
        }
      }
    });

    // Try to fetch results from localStorage first
    const storedResults = localStorage.getItem(`challenge_results_${roomId}`);
    if (storedResults) {
      try {
        const parsedResults = JSON.parse(storedResults);
        setResult(parsedResults);
        setLoading(false);
        
        // Check if user is the winner (for stored results too)
        if (parsedResults.winnerId === user._id) {
          setTimeout(showConfetti, 500);
        }
      } catch (error) {
        console.error('Error parsing stored results:', error);
      }
    }
    
    // Request results from server if not found in localStorage
    if (!storedResults) {
      socket.emit('request_challenge_results', { roomId });
      
      // Set a timeout to handle case where server doesn't respond
      const timeout = setTimeout(() => {
        if (loading) {
          setError('Unable to load challenge results. The server did not respond.');
          setLoading(false);
        }
      }, 5000);
      
      return () => clearTimeout(timeout);
    }
    
    return () => {
      socket.off('challenge_results');
    };
  }, [roomId, user, loading]);

  // Calculate score percentages for progress bars
  const getScorePercentage = (score: number, maxPossible: number = 50) => {
    return Math.min(100, (score / maxPossible) * 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-[100px] flex items-center justify-center text-[var(--text-color)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FFD700]"></div>
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
              href={`/course/${title}/leaderboard`}
              className="mt-2 px-4 py-2 bg-[var(--purple-primary)] text-white rounded-md hover:bg-[var(--purple-secondary)] transition-colors inline-block"
            >
              Return to Leaderboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen pt-[100px] text-[var(--text-color)]">
        <div className="container mx-auto px-4">
          <div className="bg-[var(--card-bg)] p-4 rounded-lg border-2 border-[var(--card-border)]">
            <p>No results found for this challenge.</p>
            <Link 
              href={`/course/${title}/leaderboard`}
              className="mt-2 px-4 py-2 bg-[var(--purple-primary)] text-white rounded-md hover:bg-[var(--purple-secondary)] transition-colors inline-block"
            >
              Return to Leaderboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isUserWinner = user && result.winnerId === user._id;
  const isUserChallenger = user && result.challengerId === user._id;

  const userScore = isUserChallenger ? result.challengerScore : result.challengedScore;
  const opponentScore = isUserChallenger ? result.challengedScore : result.challengerScore;
  const userTimeSpent = isUserChallenger ? result.challengerTimeSpent : result.challengedTimeSpent;
  const opponentTimeSpent = isUserChallenger ? result.challengedTimeSpent : result.challengerTimeSpent;

  return (
    <div className="min-h-screen pt-[80px] sm:pt-[100px] pb-10 sm:pb-20 text-[var(--text-color)]">
      <div className="container mx-auto px-4 max-w-4xl">
        <div ref={confettiRef} className="absolute inset-0 pointer-events-none"></div>
        
        <div className="grid grid-cols-1 gap-8">
          {/* Result Header */}
          <div className="bg-[var(--card-bg)] border-4 border-[var(--card-border)] rounded-lg p-6 shadow-[8px_8px_0px_0px_var(--card-border)]">
            <h1 className="text-3xl font-bold text-center mb-2">
              Challenge Results
            </h1>
            <p className="text-center text-[var(--text-secondary)] mb-4">
              {result.winnerName === "Tie" 
                ? "It's a tie! Both players performed equally well." 
                : `${result.winnerName} wins the challenge!`}
            </p>
            
            {isUserWinner ? (
              <div className="bg-[#5CDB95] p-4 rounded-lg border-2 border-black text-center mb-4 animate-pulse">
                <h2 className="text-xl font-bold text-black">🏆 Congratulations! You Won! 🏆</h2>
                <p className="text-black">You scored higher and completed the challenge successfully!</p>
              </div>
            ) : isUserWinner === false ? (
              <div className="bg-[#FFD700] p-4 rounded-lg border-2 border-black text-center mb-4">
                <h2 className="text-xl font-bold text-black">Good effort!</h2>
                <p className="text-black">You didn't win this time, but keep practicing to improve your skills!</p>
              </div>
            ) : null}
          </div>
          
          {/* Score Comparison */}
          <div className="bg-[var(--card-bg)] border-4 border-[var(--card-border)] rounded-lg p-6 shadow-[8px_8px_0px_0px_var(--card-border)]">
            <h2 className="text-xl font-bold mb-4">Score Comparison</h2>
            
            <div className="space-y-6">
              {/* Your Score */}
              <div>
                <div className="flex justify-between mb-2">
                  <span className="font-bold">Your Score:</span>
                  <span className="text-[var(--text-highlight)]">{userScore} points</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden">
                  <div 
                    className="bg-[#5CDB95] h-full rounded-full transition-all duration-1000"
                    style={{ width: `${getScorePercentage(userScore)}%` }}
                  ></div>
                </div>
                <div className="text-xs text-[var(--text-secondary)] mt-1">
                  Time spent: {Math.round(userTimeSpent)} seconds
                </div>
              </div>
              
              {/* Opponent Score */}
              <div>
                <div className="flex justify-between mb-2">
                  <span className="font-bold">Opponent Score:</span>
                  <span className="text-[var(--text-highlight)]">{opponentScore} points</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden">
                  <div 
                    className="bg-[#FF6B6B] h-full rounded-full transition-all duration-1000"
                    style={{ width: `${getScorePercentage(opponentScore)}%` }}
                  ></div>
                </div>
                <div className="text-xs text-[var(--text-secondary)] mt-1">
                  Time spent: {Math.round(opponentTimeSpent)} seconds
                </div>
              </div>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link 
              href={`/course/${title}/leaderboard`}
              className="flex-1 px-6 py-3 bg-[var(--purple-primary)] text-white font-bold rounded-lg border-2 border-black shadow-[4px_4px_0px_0px_#000000] hover:shadow-[2px_2px_0px_0px_#000000] transition-all text-center"
            >
              Return to Leaderboard
            </Link>
            
            <button 
              onClick={() => {
                router.push(`/course/${title}`);
              }}
              className="flex-1 px-6 py-3 bg-[#FFD700] text-black font-bold rounded-lg border-2 border-black shadow-[4px_4px_0px_0px_#000000] hover:shadow-[2px_2px_0px_0px_#000000] transition-all"
            >
              Back to Course
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 