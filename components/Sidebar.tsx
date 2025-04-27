'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { X, Menu } from 'lucide-react';
import Link from 'next/link';
import { useDashboard } from '@/app/provider';

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

export default function Sidebar({ token }: { token: string | undefined }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useDashboard();
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  useEffect(() => {
    // Check if dark mode is enabled
    const checkTheme = () => {
      const isDark = document.documentElement.classList.contains('dark-theme');
      setIsDarkMode(isDark);
    };
    
    // Initial check
    checkTheme();
    
    // Set up observer to detect theme changes
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { 
      attributes: true, 
      attributeFilter: ['class'] 
    });
    
    return () => observer.disconnect();
  }, []);
  
  // Check if current path is an admin path
  const isAdminPath = pathname?.includes('/admin');
  
  // Check if current path is a route where sidebar should be hidden
  const hiddenRoutes = ['/', '/auth/login', '/auth/signup'];
  const shouldHideSidebar = hiddenRoutes.includes(pathname || '') || isAdminPath;
  
  // If sidebar should be hidden, return null to not render anything
  if (shouldHideSidebar) {
    return null;
  }
  
  // Include courses page along with dashboard pages
  const allowedPaths = ['/dashboard', '/courses'];
  const shouldShowSidebar = allowedPaths.some(path => pathname?.includes(path));
  if (!shouldShowSidebar) {
    return null;
  }

  const dashboardItems = [
    { name: "Dashboard", href: "/dashboard", icon: "🏠" },
    { name: "Courses", href: "/courses", icon: "📚" },
    { name: "Settings", href: "/settings", icon: "⚙️" },
  ];
  
  // Handle logout
  const handleLogout = async () => {
    if (logout) {
      logout();
    } else {
      try {
        const response = await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          // Clear local storage
          localStorage.removeItem('auth_timestamp');
          router.push('/auth/login');
        }
      } catch (error) {
        console.error('Error logging out:', error);
      }
    }
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button 
        onClick={() => setMobileMenuOpen(true)}
        className="fixed top-20 left-6 z-20 lg:hidden bg-[var(--card-bg)] p-2 rounded-md border-2 border-[var(--card-border)] shadow-[2px_2px_0px_0px_var(--card-border)] hidden"
      >
        <Menu className="h-6 w-6 text-[var(--text-color)]" />
      </button>

      {/* Mobile Menu Overlay */}
      <div 
        className={`fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden transition-opacity duration-300 ${mobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} 
        onClick={() => setMobileMenuOpen(false)}
      ></div>
      
      {/* Mobile Sidebar */}
      <div className={`fixed top-0 left-0 h-full w-[280px] ${!isDarkMode ? 'bg-white text-[#333] border-r-2 border-[#ddd]' : 'bg-[var(--sidebar-bg)]'} z-40 lg:hidden transform transition-transform duration-300 ease-in-out sidebar overflow-y-auto ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 pt-4 flex flex-col h-full">
          <div className="flex items-center justify-between mb-8">
            <h2 className={`text-xl font-bold ${!isDarkMode ? 'text-[#333]' : 'text-[var(--navbar-text)]'} font-mono`}>My Profile</h2>
            <button onClick={() => setMobileMenuOpen(false)} className="p-2 rounded-md bg-[var(--card-bg)] border-2 border-[var(--card-border)]">
              <X className="h-5 w-5 text-[var(--text-color)]" />
            </button>
          </div>
          
          <nav className="flex flex-col space-y-4 mb-8 flex-1">
            {dashboardItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center py-4 px-5 rounded-md ${isActive ? 'bg-[var(--card-bg)] border-2 border-[var(--card-border)] shadow-[2px_2px_0px_0px_var(--card-border)]' : `hover:bg-[${isDarkMode ? 'var(--card-bg)' : 'var(--card-bg)'}] transition`} ${!isDarkMode ? 'text-[#333]' : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="mr-3 text-2xl">{item.icon}</span>
                  <span className="font-medium text-lg">{item.name}</span>
                </Link>
              );
            })}
          </nav>
          
          {/* User Info fixed at Bottom in Mobile Menu */}
          {user && (
            <div className="mt-auto border-t border-[var(--card-border)] pt-6">
              <div className={`${!isDarkMode ? 'bg-white shadow-[2px_2px_0px_0px_#ddd]' : 'bg-[var(--card-bg)]'} p-4 rounded-md border-2 ${!isDarkMode ? 'border-[#ddd]' : 'border-[var(--card-border)]'} mb-4 ${isDarkMode ? 'shadow-[2px_2px_0px_0px_var(--card-border)]' : ''}`}>
                <div className="flex flex-col items-center mb-3">
                  <div className="w-14 h-14 bg-[var(--purple-primary)] rounded-full flex items-center justify-center text-white font-bold text-lg mb-3">
                    {user.firstName?.charAt(0) || 'U'}
                  </div>
                  <div className="text-center">
                    <h3 className="font-bold text-[var(--text-color)]">{user.firstName} {user.lastName}</h3>
                    <p className="text-sm text-[var(--text-color)]">{user.email}</p>
                    <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full ${user.role === 'admin' ? 'bg-[#8b5cf6] text-white' : 'bg-[var(--yellow-light)] text-black'}`}>
                      {user.role === 'admin' ? 'Admin' : 'User'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full py-2 mt-2 bg-[var(--purple-primary)] text-white font-medium rounded-md border-2 border-[var(--card-border)] shadow-[2px_2px_0px_0px_var(--card-border)]"
                >
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Desktop Sidebar - hidden on mobile */}
      <div className={`w-64 h-screen ${!isDarkMode ? 'bg-white text-[#333] border-r-2 border-[#ddd]' : 'bg-[var(--sidebar-bg)] border-r-4 border-[var(--card-border)]'} pt-[100px] fixed left-0 top-0 z-10 sidebar hidden md:block`}>
        <div className="p-6 flex flex-col h-[calc(100vh-100px)]">
          <h2 className={`text-2xl font-bold ${!isDarkMode ? 'text-[#333]' : 'text-[var(--navbar-text)]'} mb-8 font-mono`}>My Profile</h2>
          
          <nav className="flex flex-col space-y-4 flex-1">
            {dashboardItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center py-4 px-5 rounded-md ${isActive ? 'bg-[var(--card-bg)] border-2 border-[var(--card-border)] shadow-[2px_2px_0px_0px_var(--card-border)]' : `hover:bg-[${isDarkMode ? 'var(--card-bg)' : 'var(--card-bg)'}] transition`} ${!isDarkMode ? 'text-[#333]' : ''}`}
                >
                  <span className="mr-3 text-2xl">{item.icon}</span>
                  <span className="font-medium text-lg">{item.name}</span>
                </Link>
              );
            })}
          </nav>
          
          {/* User Info fixed at Bottom in Desktop Sidebar */}
          {user && (
            <div className="mt-auto pt-6 border-t border-[var(--card-border)]">
              <div className={`${!isDarkMode ? 'bg-white shadow-[2px_2px_0px_0px_#ddd]' : 'bg-[var(--card-bg)]'} p-4 rounded-md border-2 ${!isDarkMode ? 'border-[#ddd]' : 'border-[var(--card-border)]'} ${isDarkMode ? 'shadow-[2px_2px_0px_0px_var(--card-border)]' : ''}`}>
                <div className="flex flex-col items-center mb-3">
                  <div className="w-16 h-16 bg-[var(--purple-primary)] rounded-full flex items-center justify-center text-white font-bold text-xl mb-3">
                    {user.firstName?.charAt(0) || 'U'}
                  </div>
                  <div className="text-center">
                    <h3 className="font-bold text-[var(--text-color)]">{user.firstName} {user.lastName}</h3>
                    <p className="text-sm text-[var(--text-color)] mb-1">{user.email}</p>
                    <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full ${user.role === 'admin' ? 'bg-[#8b5cf6] text-white' : 'bg-[var(--yellow-light)] text-black'}`}>
                      {user.role === 'admin' ? 'Admin' : 'User'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full py-2 mt-2 bg-[var(--purple-primary)] text-white font-medium rounded-md border-2 border-[var(--card-border)] shadow-[2px_2px_0px_0px_var(--card-border)] hover:shadow-[1px_1px_0px_0px_var(--card-border)] hover:translate-y-0.5 transition-all"
                >
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
} 