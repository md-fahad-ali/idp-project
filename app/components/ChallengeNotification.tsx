import { useState, useEffect } from 'react';
import { useDashboard } from '../provider';
import { useActivity } from '../activity-provider';
import { 
  useChallengeNotifications, 
  acceptChallenge, 
  declineChallenge,
  navigateToChallengeRoom,
  checkInRoom
} from '../services/socketService';
import { AnimatePresence, motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

export default function ChallengeNotification() {
  const { user } = useDashboard();
  const { pendingChallenges, activeChallenge, declinedChallenges } = useChallengeNotifications(user?._id || '');
  const [showNotifications, setShowNotifications] = useState(false);
  const [userInRoom, setUserInRoom] = useState(false);
  const [roomInfo, setRoomInfo] = useState(null);
  const router = useRouter();

  // Auto-open notifications when new challenges arrive
  useEffect(() => {
    if (pendingChallenges.length > 0 || declinedChallenges.length > 0) {
      setShowNotifications(true);
    }
  }, [pendingChallenges.length, declinedChallenges.length]);

  // Check if user is in a room according to the server
  useEffect(() => {
    if (!user) return;
    
    const checkUserRoomStatus = async () => {
      try {
        const result = await checkInRoom(user._id);
        if (result && typeof result === 'object' && result.inRoom) {
          setUserInRoom(true);
          setRoomInfo(result.roomInfo || null);
        } else {
          setUserInRoom(false);
          setRoomInfo(null);
        }
      } catch (error) {
        console.error('Error checking room status:', error);
      }
    };
    
    checkUserRoomStatus();
    const interval = setInterval(checkUserRoomStatus, 30000); // Check every 30 seconds
    
    return () => clearInterval(interval);
  }, [user]);

  // Navigate to challenge room when active challenge starts
  useEffect(() => {
    if (!activeChallenge || !user) return;
    
    try {
      console.log('Active challenge data:', activeChallenge);
      
      // Show a toast notification if this user is the challenger
      if (activeChallenge.challengerId === user._id) {
        toast.success('Your challenge has been accepted!');
      }
      
      // For both challenger and challenged users, use the complete data from activeChallenge
      const roomUrl = navigateToChallengeRoom(
        activeChallenge.courseName,
        activeChallenge.challengerName,
        activeChallenge.challengedName,
        activeChallenge.roomId
      );
      
      console.log('Navigating to challenge room:', roomUrl);
      router.push(roomUrl);
    } catch (error) {
      console.error('Error navigating to challenge room:', error);
      toast.error('Could not join the challenge room. Please try again.');
    }
  }, [activeChallenge, router, user]);

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
  
  const handleRejoinRoom = () => {
    if (!roomInfo) return;
    
    try {
      // Use room info to navigate back to the challenge room
      const roomUrl = navigateToChallengeRoom(
        roomInfo.courseName,
        roomInfo.challengerName,
        roomInfo.challengedName,
        roomInfo.roomId
      );
      
      console.log('Rejoining challenge room:', roomUrl);
      router.push(roomUrl);
      toast.success('Rejoining your active challenge...');
    } catch (error) {
      console.error('Error rejoining challenge room:', error);
      toast.error('Could not rejoin the challenge room. Please try again.');
    }
  };
  
  // If user is in active challenge with UI rendered, don't show this component
  if (activeChallenge) return null;

  // Calculate total notifications
  const totalNotifications = pendingChallenges.length + declinedChallenges.length;
  
  return (
    <>
      {/* Bell icon with notification indicator */}
      <div className="fixed top-20 right-6 z-50">
        <button 
          onClick={() => setShowNotifications(!showNotifications)}
          className="relative p-2 bg-[#9D4EDD] rounded-full shadow-lg border-2 border-black hover:bg-[#8a2be2] transition-colors"
          aria-label={`${totalNotifications} challenge notifications`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
          
          {totalNotifications > 0 && (
            <span className="absolute -top-1 -right-1 bg-[#FF6B6B] text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center border border-black animate-pulse">
              {totalNotifications}
            </span>
          )}
        </button>
        
        {/* Rejoin Challenge Button - Show only when user is in room but not seeing challenge UI */}
        {userInRoom && !activeChallenge && roomInfo && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-14 right-0 px-3 py-2 bg-[#FFD700] text-black text-sm font-bold rounded-lg border-2 border-black shadow-[4px_4px_0px_0px_#000000] hover:bg-[#FFC107] hover:shadow-[2px_2px_0px_0px_#000000] transition-all whitespace-nowrap animate-bounce"
            onClick={handleRejoinRoom}
          >
            Rejoin Challenge
          </motion.button>
        )}
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
            
            {/* Rejoin Active Challenge Card */}
            {userInRoom && !activeChallenge && roomInfo && (
              <div className="bg-[#FFD700] p-3 rounded-lg border-2 border-black mb-4">
                <p className="text-black font-bold">You have an active challenge!</p>
                <p className="text-black text-sm mb-2">
                  You appear to be in a challenge room but aren't connected to it.
                </p>
                <button
                  onClick={handleRejoinRoom}
                  className="w-full px-3 py-1 bg-black text-white text-sm font-bold rounded hover:bg-[#333] transition-colors"
                >
                  Rejoin Challenge Room
                </button>
              </div>
            )}
            
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
            
            {pendingChallenges.length === 0 && declinedChallenges.length === 0 && !userInRoom ? (
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