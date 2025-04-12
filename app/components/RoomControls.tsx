'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { useDashboard } from '../provider';
import { initSocket, forceIdentify } from '../services/socketService';

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
    
    // Listen for any relevant socket events that might indicate a room change
    socket.on('challenge_started', () => {
      checkRoomUrl();
    });
    
    socket.on('challenge_room_created', () => {
      checkRoomUrl();
    });
    
    socket.on('room_data', () => {
      checkRoomUrl();
    });
    
    // Clean up
    return () => {
      clearInterval(intervalId);
      socket.off('challenge_started');
      socket.off('challenge_room_created');
      socket.off('room_data');
    };
  }, []);

  // Add event listener for page unload
  useEffect(() => {
    if (!userId || !isInRoom || !roomId) return;

    // This function will be called when the user closes the tab/browser
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Notify server that user is leaving
      sendLeaveRoomEvent();
      
      // Standard practice to show a confirmation dialog
      e.preventDefault();
      e.returnValue = '';
      return '';
    };

    // Add event listener for when user closes window/tab
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
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
      router.push(roomUrl);
      toast.success('Entering challenge room...');
    } catch (error) {
      console.error('Error entering room:', error);
      toast.error('Failed to enter room. Please try again.');
    }
  };

  const leaveRoom = () => {
    if (!userId || !roomId) {
      toast.error('Unable to leave room: Missing user or room information.');
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
      
      toast.success('You have left the room.');
      
      // Navigate to leaderboard page if we have the course title, otherwise dashboard
      router.push(courseTitle ? `/course/${courseTitle}/leaderboard` : '/dashboard');
    } catch (error) {
      console.error('Error leaving room:', error);
      toast.error('Failed to leave room. Please try again.');
    }
  };

  return {
    roomUrl,
    isInRoom,
    enterRoom,
    leaveRoom
  };
};

export default function RoomControls() {
  const { user } = useDashboard();
  const { roomUrl, isInRoom, enterRoom, leaveRoom } = useRoomManagement(user?._id || '');

  return (
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
  );
} 