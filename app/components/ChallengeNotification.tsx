import { useState, useEffect } from 'react';
import { useDashboard } from '../provider';
import { useActivity } from '../activity-provider';
import { 
  useChallengeNotifications, 
  acceptChallenge, 
  declineChallenge,
  navigateToChallengeRoom
} from '../services/socketService';
import { AnimatePresence, motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

export default function ChallengeNotification() {
  const { user } = useDashboard();
  const { pendingChallenges, activeChallenge, declinedChallenges } = useChallengeNotifications(user?._id || '');
  const [showNotifications, setShowNotifications] = useState(false);
  const router = useRouter();

  // Auto-open notifications when new challenges arrive
  useEffect(() => {
    if (pendingChallenges.length > 0 || declinedChallenges.length > 0) {
      setShowNotifications(true);
    }
  }, [pendingChallenges.length, declinedChallenges.length]);

  // Navigate to challenge room when active challenge starts
  useEffect(() => {
    if (!activeChallenge || !user) return;
    
    try {
      // Handle when a user's sent challenge has been accepted
      if (activeChallenge.challengerId === user._id) {
        toast.success('Your challenge has been accepted!');
        
        // Use the roomId along with placeholder values to create a valid URL
        const roomUrl = navigateToChallengeRoom(
          activeChallenge.courseName || '',
          activeChallenge.challengerName || '',
          activeChallenge.challengedName || '',
          activeChallenge.roomId
        );
        
        console.log('Navigating challenger to room:', roomUrl);
        router.push(roomUrl);
        return;
      }
      
      // Handle when a user accepts a challenge sent to them
      if (activeChallenge.challengedId === user._id) {
        // Find the accepted challenge from pending challenges
        const acceptedChallenge = pendingChallenges.find(c => c.challengeId === activeChallenge.roomId);
        
        if (acceptedChallenge) {
          // Navigate to challenge room with full course and user information
          const roomUrl = navigateToChallengeRoom(
            acceptedChallenge.courseName,
            acceptedChallenge.challengerName,
            acceptedChallenge.challengedName,
            activeChallenge.roomId // Add roomId for consistency
          );
          
          console.log('Navigating challenged user to room:', roomUrl);
          router.push(roomUrl);
        } else {
          // Fallback in case we don't have the detailed info
          const roomUrl = navigateToChallengeRoom(
            activeChallenge.courseName || '',
            activeChallenge.challengerName || '',
            activeChallenge.challengedName || '',
            activeChallenge.roomId
          );
          
          console.log('Navigating challenged user to room (fallback):', roomUrl);
          router.push(roomUrl);
        }
      }
    } catch (error) {
      console.error('Error navigating to challenge room:', error);
      toast.error('Could not join the challenge room. Please try again.');
    }
  }, [activeChallenge, pendingChallenges, router, user]);

  if (!user) return null;
  
  const handleAccept = (challengeId: string) => {
    acceptChallenge(challengeId, user._id);
    // Notification will be auto-removed by the socket hook when challenge starts
  };
  
  const handleDecline = (challengeId: string) => {
    declineChallenge(challengeId, user._id);
    // We can manually remove it from UI for immediate feedback
    // The actual list update will come from the socket
  };
  
  // If there's an active challenge, render nothing here as we'll show the quiz interface elsewhere
  if (activeChallenge) return null;

  // Calculate total notifications
  const totalNotifications = pendingChallenges.length + declinedChallenges.length;
  
  return (
    <>
      {/* Bell icon with notification indicator */}
      <div className="fixed top-20 right-6 z-50">
        <button 
          onClick={() => setShowNotifications(!showNotifications)}
          className="relative p-2 bg-[#9D4EDD] rounded-full shadow-lg border-2 border-black"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
          
          {totalNotifications > 0 && (
            <span className="absolute -top-1 -right-1 bg-[#FF6B6B] text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center border border-black">
              {totalNotifications}
            </span>
          )}
        </button>
      </div>
      
      {/* Challenge notifications panel */}
      <AnimatePresence>
        {showNotifications && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="fixed top-32 right-6 z-50 w-80 bg-[#2f235a] border-4 border-black rounded-lg shadow-[8px_8px_0px_0px_#000000] p-4"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[#E6F1FF] font-bold">Challenge Requests</h3>
              <button 
                onClick={() => setShowNotifications(false)}
                className="text-[#8892B0] hover:text-[#E6F1FF]"
              >
                ✕
              </button>
            </div>
            
            {/* Declined challenges notifications */}
            {declinedChallenges.length > 0 && (
              <div className="space-y-3 mb-4">
                {declinedChallenges.map((decline) => (
                  <motion.div 
                    key={decline.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="bg-[#3f336a] p-3 rounded-lg border-2 border-black"
                  >
                    <div className="flex items-center gap-2">
                      <div className="bg-[#FF6B6B] rounded-full w-6 h-6 flex items-center justify-center text-sm">
                        ✕
                      </div>
                      <p className="text-[#E6F1FF] text-sm">
                        <span className="font-bold">{decline.declinerName}</span> declined your challenge
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
            
            {pendingChallenges.length === 0 && declinedChallenges.length === 0 ? (
              <p className="text-[#8892B0] text-sm">No pending challenges</p>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {pendingChallenges.map((challenge) => (
                  <div 
                    key={challenge.challengeId}
                    className="bg-[#3f336a] p-3 rounded-lg border-2 border-black"
                  >
                    <p className="text-[#E6F1FF] font-bold">{challenge.challengerName}</p>
                    <p className="text-[#8892B0] text-sm mb-2">
                      wants to challenge you in {challenge.courseName}!
                    </p>
                    <div className="flex justify-between gap-2">
                      <button
                        onClick={() => handleAccept(challenge.challengeId)}
                        className="flex-1 px-3 py-1 bg-[#5CDB95] text-black text-xs font-bold rounded border border-black hover:bg-[#44c47d] transition-colors"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleDecline(challenge.challengeId)}
                        className="flex-1 px-3 py-1 bg-[#FF6B6B] text-white text-xs font-bold rounded border border-black hover:bg-[#ff4f4f] transition-colors"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
} 