'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { useDashboard } from '../provider';
import initSocket, { forceIdentify } from '../services/socketService';

// Interface for opponent left data
interface OpponentLeftData {
  roomId: string;
  userId: string;
  userName: string;
}

// Custom hook for room management
export const useRoomManagement = (userId: string) => {
  const [roomUrl, setRoomUrl] = useState<string | null>(null);
  const [isInRoom, setIsInRoom] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const router = useRouter();
  const socketRef = useRef(initSocket());

  // Check localStorage for room URL
  const checkRoomUrl = () => {
    if (typeof window !== 'undefined') {
      const savedRoomUrl = localStorage.getItem('roomUrl');
      setRoomUrl(savedRoomUrl);
      setIsInRoom(!!savedRoomUrl);
      
      // Extract roomId from URL if it exists
      if (savedRoomUrl) {
        const urlParams = new URLSearchParams(savedRoomUrl.split('?')[1] || '');
        const extractedRoomId = urlParams.get('roomId');
        setRoomId(extractedRoomId);
      }
    }
  };

  // Function to send leave room event to server
  const sendLeaveRoomEvent = () => {
    if (userId && roomId) {
      console.log('Sending leave_room event for user:', userId, 'roomId:', roomId);
      
      // Ensure user is identified first
      forceIdentify(userId);
      
      // Wait a brief moment for the identify to complete
      setTimeout(() => {
        const socket = socketRef.current;
        socket.emit('leave_room', { 
          roomId: roomId,
          userId: userId,
          isChallenger: true, // Default to true; server will determine the actual role
          customMessage: 'I had to leave the challenge room. See you next time!'
        });
      }, 200);
    }
  };

  // Setup socket listeners and check localStorage
  useEffect(() => {
    // Initial check
    checkRoomUrl();
    
    const socket = socketRef.current;
    
    // Set up interval to check localStorage periodically
    const intervalId = setInterval(checkRoomUrl, 1000);
    
    // Auto-start challenge function
    const autoStartChallengeIfNeeded = () => {
      if (roomId && userId) {
        // Get room info from localStorage
        const savedRoomInfo = localStorage.getItem('challengeRoomInfo');
        const isNewRoomJoin = sessionStorage.getItem(`autoStarted_${roomId}`) !== 'true';
        
        // Only auto-start if we haven't already started this room in this session
        if (isNewRoomJoin) {
          console.log('Auto-starting challenge for room:', roomId);
          
          // Mark this room as auto-started in this session
          sessionStorage.setItem(`autoStarted_${roomId}`, 'true');
          
          // Make sure user is identified
          forceIdentify(userId);
          
          // Short delay to ensure identification happens first
          setTimeout(() => {
            console.log('Emitting start_challenge event');
            socket.emit('start_challenge', { roomId });
          }, 500);
        }
      }
    };
    
    // Listen for any relevant socket events that might indicate a room change
    socket.on('challenge_started', () => {
      checkRoomUrl();
    });
    
    socket.on('challenge_room_created', () => {
      checkRoomUrl();
    });
    
    socket.on('room_data', () => {
      checkRoomUrl();
      // Auto-start when room data is received (usually happens after joining)
      autoStartChallengeIfNeeded();
    });
    
    // Auto-start on initial check if needed
    if (roomId) {
      autoStartChallengeIfNeeded();
    }
    
    // Clean up
    return () => {
      clearInterval(intervalId);
      socket.off('challenge_started');
      socket.off('challenge_room_created');
      socket.off('room_data');
    };
  }, [roomId, userId]);

  // Add event listener for page unload
  useEffect(() => {
    if (!userId || !isInRoom || !roomId) return;

    // No longer adding beforeunload handler to prevent automatic leaving
    // This will prevent the "Leave site?" dialog and automatic room leaving
    
    return () => {
      // Empty cleanup function
    };
  }, [userId, isInRoom, roomId]);

  // Handle opponent leaving
  useEffect(() => {
    if (!userId) return;

    const socket = socketRef.current;
    
    console.log("Setting up opponent_left listener in RoomControls");
    
    // Re-identify the user in case socket was disconnected
    if (userId) {
      forceIdentify(userId);
    }
    
    const handleOpponentLeft = (data: OpponentLeftData) => {
      console.log('OPPONENT LEFT EVENT RECEIVED in RoomControls:', data);
      
      // Use window.alert for guaranteed visibility
      window.alert(`Opponent Left: ${data.userName} has left the room.`);
      
      // Clear roomUrl from localStorage
      localStorage.removeItem('roomUrl');
      
      // Update state
      setRoomUrl(null);
      setRoomId(null);
      setIsInRoom(false);
      
      // Get course title from localStorage if available
      const roomInfo = localStorage.getItem('challengeRoomInfo');
      const courseTitle = roomInfo ? JSON.parse(roomInfo).courseTitle : '';
      
      // Navigate to leaderboard
      router.push(courseTitle ? `/course/${courseTitle}/leaderboard` : '/dashboard');
    };
    
    socket.on('opponent_left', handleOpponentLeft);
    
    return () => {
      console.log("Removing opponent_left listener in RoomControls");
      socket.off('opponent_left', handleOpponentLeft);
    };
  }, [userId, router]);

  const enterRoom = () => {
    if (!roomUrl) {
      toast.error('No room information found.');
      return;
    }

    try {
      // Get the roomId from the URL
      const urlParams = new URLSearchParams(roomUrl.split('?')[1] || '');
      const roomIdFromUrl = urlParams.get('roomId');
      
      // If we have a roomId, start the challenge
      if (roomIdFromUrl) {
        console.log('Starting challenge for room:', roomIdFromUrl);
        
        // Mark this room as not auto-started yet in this session 
        // This allows the auto-start function to trigger after navigation
        if (roomIdFromUrl) {
          sessionStorage.removeItem(`autoStarted_${roomIdFromUrl}`);
        }
        
        // Ensure user is identified first
        if (userId) {
          forceIdentify(userId);
          
          // Wait a moment for the identify to take effect
          setTimeout(() => {
            // Get socket and emit start_challenge event
            const socket = socketRef.current;
            socket.emit('start_challenge', { roomId: roomIdFromUrl });
            console.log('Emitted start_challenge event for room:', roomIdFromUrl);
            
            // Store in localStorage that we're joining an active room
            const roomInfo = localStorage.getItem('challengeRoomInfo');
            if (!roomInfo) {
              // Create basic room info if not available
              const basicRoomInfo = {
                roomId: roomIdFromUrl,
                courseName: 'javascript', // Fallback
                challengerName: 'User',
                challengedName: 'Opponent'
              };
              localStorage.setItem('challengeRoomInfo', JSON.stringify(basicRoomInfo));
            }
          }, 300);
        }
      }
      
      // Show feedback before navigation
      toast.success('Entering challenge room...');
      
      // Navigate to the room URL
      if (typeof window !== 'undefined') {
        // Short delay to ensure the start_challenge event is sent
        setTimeout(() => {
          window.location.href = roomUrl;
        }, 500);
      } else {
        router.push(roomUrl);
      }
    } catch (error) {
      console.error('Error entering room:', error);
      toast.error('Failed to enter room. Please try again.');
    }
  };

  const leaveRoom = () => {
    // Show confirmation dialog instead of directly leaving
    setShowConfirmDialog(true);
  };

  const confirmLeaveRoom = () => {
    if (!userId || !roomId) {
      toast.error('Unable to leave room: Missing user or room information.');
      setShowConfirmDialog(false);
      return;
    }

    try {
      // Send leave room event
      sendLeaveRoomEvent();
      
      // Get course title from localStorage if available
      const roomInfo = localStorage.getItem('challengeRoomInfo');
      const courseTitle = roomInfo ? JSON.parse(roomInfo).courseTitle : '';
      
      // Clear the room URL from localStorage
      localStorage.removeItem('roomUrl');
      localStorage.removeItem('challengeRoomInfo');
      
      // Update state
      setRoomUrl(null);
      setRoomId(null);
      setIsInRoom(false);
      setShowConfirmDialog(false);
      
      toast.success('You have left the room.');
      
      // Navigate to leaderboard page if we have the course title, otherwise dashboard
      router.push(courseTitle ? `/course/${courseTitle}/leaderboard` : '/dashboard');
    } catch (error) {
      console.error('Error leaving room:', error);
      toast.error('Failed to leave room. Please try again.');
    }
  };

  const cancelLeaveRoom = () => {
    setShowConfirmDialog(false);
  };

  return {
    roomUrl,
    isInRoom,
    showConfirmDialog,
    enterRoom,
    leaveRoom,
    confirmLeaveRoom,
    cancelLeaveRoom
  };
};

export default function RoomControls() {
  const { user } = useDashboard();
  const { 
    roomUrl, 
    isInRoom, 
    showConfirmDialog,
    enterRoom, 
    leaveRoom, 
    confirmLeaveRoom,
    cancelLeaveRoom 
  } = useRoomManagement(user?._id || '');

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
        {roomUrl && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-4 py-2 bg-[#5CDB95] text-black font-bold rounded-lg border-2 border-black shadow-[4px_4px_0px_0px_#000000] hover:bg-[#44c47d] hover:shadow-[2px_2px_0px_0px_#000000] transition-all"
            onClick={enterRoom}
          >
            Enter Room
          </motion.button>
        )}
        
        {isInRoom && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-4 py-2 bg-[#FF6B6B] text-white font-bold rounded-lg border-2 border-black shadow-[4px_4px_0px_0px_#000000] hover:bg-[#ff4f4f] hover:shadow-[2px_2px_0px_0px_#000000] transition-all"
            onClick={leaveRoom}
          >
            Leave Room
          </motion.button>
        )}
      </div>

      {/* Custom confirmation dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#2f235a] p-6 rounded-lg border-4 border-black shadow-[8px_8px_0px_0px_#000000] max-w-md w-full"
          >
            <h3 className="text-xl font-bold text-[#E6F1FF] mb-4">Leave Challenge Room?</h3>
            <p className="text-[#E6F1FF] mb-6">
              Are you sure you want to leave? Your opponent will be notified and the challenge will end.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={cancelLeaveRoom}
                className="px-4 py-2 bg-[#8892B0] text-white font-bold rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_#000000] hover:bg-[#767f9b] hover:shadow-[1px_1px_0px_0px_#000000] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmLeaveRoom}
                className="px-4 py-2 bg-[#FF6B6B] text-white font-bold rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_#000000] hover:bg-[#ff4f4f] hover:shadow-[1px_1px_0px_0px_#000000] transition-all"
              >
                Leave
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
} 