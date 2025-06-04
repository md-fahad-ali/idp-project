'use client';

import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

interface ContentWrapperProps {
  children: ReactNode;
}

export default function ContentWrapper({ children }: ContentWrapperProps) {
  const pathname = usePathname();
  
  // Special handling for front page - full freedom with no constraints
  if (pathname === '/') {
    return <>{children}</>;
  }
  
  // Define routes where sidebar should be hidden
  const hiddenSidebarRoutes = ['/auth/login', '/auth/signup'];
  const shouldHideSidebar = hiddenSidebarRoutes.includes(pathname || '') || pathname?.includes('/admin');
  
  // Allow sidebar on both dashboard and courses pages
  const allowedPaths = ['/dashboard', '/courses'];
  const shouldShowSidebar = allowedPaths.some(path => pathname?.includes(path));
  
  // Set content class based on sidebar visibility and responsiveness
  const contentClass = shouldShowSidebar && !shouldHideSidebar 
    ? "min-h-screen pt-16 pb-16 md:pl-64 flex justify-center" // Added pb-16 for bottom padding
    : "min-h-screen pt-16 pb-16 flex justify-center";          // Added pb-16 for bottom padding
  
  return (
    <div className={contentClass}>
      <div className="w-full">
        {children}
      </div>
    </div>
  );
} 