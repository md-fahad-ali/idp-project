'use client';

import { usePathname } from 'next/navigation';
import { useDashboard } from '../provider';
import ChallengeNotification from './ChallengeNotification';

export default function GlobalNotifications() {
  const pathname = usePathname();
  const { user } = useDashboard();
  
  // Check if current path is login or register page
  const isAuthPage = pathname.includes('/auth/login') || 
                    pathname.includes('/auth/register') || 
                    pathname === '/auth';
  
  // Check if user is in a challenge room
  const isInChallengeRoom = pathname.includes('/room/course');
  
  // Don't show notifications on auth pages or when user is not logged in
  if (isAuthPage || !user) {
    return null;
  }
  
  // Don't show the notification on challenge room pages (to avoid UI clutter)
  if (isInChallengeRoom) {
    return null;
  }
  
  return <ChallengeNotification />;
} 