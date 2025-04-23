// components/Navbar.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import Avatar from "boring-avatars";

const Navbar = ({
  access_token,
}: Readonly<{
  access_token: string | undefined;
}>) => {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [user, setUser] = useState({
    fullName: "",
    email: "",
  });
  
  const isDashboard = pathname?.includes('/dashboard');
  
  // Store last auth timestamp to detect changes
  const [lastAuthTimestamp, setLastAuthTimestamp] = useState<string | null>(null);

  const navItems = [
    { name: "Home", href: "/" },
    { name: "About", href: "/about" },
    { name: "Services", href: "/services" },
    { name: "Courses", href: "/courses" },
  ];

  const dashboardItems = [
    { name: "Dashboard", href: "/dashboard", icon: "🏠" },
    { name: "Courses", href: "/courses", icon: "📚" },
    { name: "Settings", href: "/settings", icon: "⚙️" },
  ];

  const fetchUserData = useCallback(async () => {
    if (!access_token) {
      setIsUserLoggedIn(false);
      return;
    }
    
    try {
      const timestamp = Date.now(); // Add a timestamp to prevent caching
      const response = await fetch(`/api/auth/me?_t=${timestamp}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
          Authorization: `Bearer ${access_token}`,
        },
      });
      if (!response.ok) {
        console.log(`HTTP error! status: ${response.status}`);
        setIsUserLoggedIn(false);
        return;
      }
      const data = await response.json();
      if (data?.user) {
        console.log("User data refreshed in navbar:", data.user);
        setIsUserLoggedIn(true);
        setUser({
          fullName: `${data.user.firstName} ${data.user.lastName}`,
          email: data.user.email,
        });
      }
      console.log("Profile data from navbar:", data);
    } catch (error) {
      console.error("Error fetching profile data:", error);
    }
  }, [access_token]);

  const handleLogout = async () => {
    try {
      // Call the logout API endpoint
      const timestamp = Date.now();
      await fetch(`/api/auth/logout?_t=${timestamp}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
        },
      });
      
      // Clear local state
      setIsUserLoggedIn(false);
      setUser({ fullName: "", email: "" });
      setIsDropdownOpen(false);
      setIsOpen(false);
      
      // Clear localStorage
      localStorage.removeItem('auth_timestamp');
      
      // Force clear cookies in the browser
      const clearCookie = (name: string) => {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      };
      clearCookie('access_token');
      clearCookie('refresh_token');
      
      // Redirect to the login page with replace to prevent back navigation
      router.replace("/auth/login");
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  const toggleTheme = () => {
    // Don't allow toggling if on the homepage
    if (pathname === '/') return;
    
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    
    // Save theme preference to localStorage
    localStorage.setItem('darkMode', newTheme ? 'true' : 'false');
    
    // Apply theme to body
    if (newTheme) {
      document.documentElement.classList.add('dark-theme');
    } else {
      document.documentElement.classList.remove('dark-theme');
    }
  };

  useEffect(() => {
    // Check for auth timestamp changes to detect session updates
    const currentAuthTimestamp = typeof window !== 'undefined' ? localStorage.getItem('auth_timestamp') : null;
    
    if (currentAuthTimestamp !== lastAuthTimestamp) {
      setLastAuthTimestamp(currentAuthTimestamp);
      fetchUserData();
    } else if (access_token) {
      fetchUserData();
    }

    // Theme management
    if (typeof window !== 'undefined') {
      // Force dark theme on homepage
      if (pathname === '/') {
        setIsDarkMode(true);
        document.documentElement.classList.add('dark-theme');
      } else {
        // For other pages, use saved preference
        const savedTheme = localStorage.getItem('darkMode') === 'true';
        setIsDarkMode(savedTheme);
        
        if (savedTheme) {
          document.documentElement.classList.add('dark-theme');
        } else {
          document.documentElement.classList.remove('dark-theme');
        }
      }
    }
  }, [access_token, fetchUserData, lastAuthTimestamp, pathname]);

  return (
    <nav className="fixed w-full z-50 bg-[var(--navbar-bg)] text-[var(--navbar-text)] transition-colors duration-300">
      {/* Desktop Menu */}
      <div className="hidden md:flex justify-between items-center max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center">
          <Link href="/" className="text-2xl font-bold text-[var(--navbar-text)] font-mono mr-8">
            SkillStreet
          </Link>
          <div className="flex space-x-6">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`${isActive ? 'text-[#8b5cf6] font-bold' : 'text-[var(--navbar-text)]'} hover:text-[#8b5cf6] transition-colors duration-200 font-medium text-lg`}
                >
                  {item.name}
                </Link>
              );
            })}
          </div>
        </div>
        <div className="flex space-x-4 items-center">
          {/* Theme Toggle Button - Hide on homepage */}
          {pathname !== '/' && (
            <button 
              onClick={toggleTheme}
              className="p-2 rounded-full border-2 border-[var(--card-border)] bg-[var(--card-bg)] shadow-[2px_2px_0px_0px_var(--card-border)] hover:shadow-[1px_1px_0px_0px_var(--card-border)] hover:translate-y-0.5 transition-all"
              aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDarkMode ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[var(--navbar-text)]" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>
          )}

          {!isUserLoggedIn ? (
            <Link href="/auth/login" className="relative">
              <button className="px-5 py-2 bg-[var(--purple-primary)] text-white text-sm font-bold rounded-md border-2 border-[var(--card-border)] shadow-[2px_2px_0px_0px_var(--card-border)] hover:translate-y-0.5 hover:shadow-[1px_1px_0px_0px_var(--card-border)] transition-all duration-200">
                Login
              </button>
            </Link>
          ) : (
            <div className="flex relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="text-[var(--navbar-text)] focus:outline-none border-2 border-[var(--card-border)] rounded-full shadow-[2px_2px_0px_0px_var(--card-border)] p-1"
                aria-label="Toggle user menu"
              >
                <Avatar name={user?.fullName} variant="beam" size={36} />
              </button>
              {isDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-[var(--navbar-bg)] border-4 border-[var(--card-border)] rounded-md shadow-[var(--card-shadow)]">
                  <div className="p-4">
                    <h3 className="text-xl font-bold text-[var(--navbar-text)]">
                      {user.fullName}
                    </h3>
                    <p className="text-[var(--navbar-text)]">{user.email}</p>
                    <button 
                      onClick={handleLogout}
                      className="mt-4 px-4 py-2 bg-[var(--purple-primary)] text-white border-2 border-[var(--card-border)] font-bold shadow-[4px_4px_0px_0px_var(--card-border)] hover:shadow-[2px_2px_0px_0px_var(--card-border)] hover:translate-y-1 transition-all">
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Menu Button */}
      <div className="md:hidden flex justify-between items-center px-4 py-3">
        <div className="flex items-center overflow-x-auto scrollbar-hide w-3/4">
          <Link href="/" className="text-xl font-bold text-[var(--navbar-text)] font-mono whitespace-nowrap mr-4">
            SkillStreet
          </Link>
          {/* Hide navigation links in mobile view */}
          <div className="hidden">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`${isActive ? 'text-[#8b5cf6] font-bold' : 'text-[var(--navbar-text)]'} hover:text-[#8b5cf6] whitespace-nowrap text-base font-medium px-1`}
                >
                  {item.name}
                </Link>
              );
            })}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {/* Theme Toggle Button (Mobile) */}
          {pathname !== '/' && (
            <button 
              onClick={toggleTheme}
              className="p-2 rounded-full border-2 border-[var(--card-border)] bg-[var(--card-bg)] shadow-[2px_2px_0px_0px_var(--card-border)] hover:shadow-[1px_1px_0px_0px_var(--card-border)] hover:translate-y-0.5 transition-all"
              aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDarkMode ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[var(--navbar-text)]" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>
          )}
          
        <button
          onClick={() => setIsOpen(!isOpen)}
            className="text-[var(--navbar-text)] p-2 border-2 border-[var(--card-border)] rounded-md shadow-[2px_2px_0px_0px_var(--card-border)] focus:outline-none"
          aria-label="Toggle menu"
        >
          <svg
              className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            {isOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                  strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                  strokeWidth="2"
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
        </div>
      </div>

      {/* Mobile Menu Slide-in */}
      <div
        className={`fixed inset-y-0 right-0 w-[280px] bg-[var(--sidebar-bg)] shadow-lg transform ${
          isOpen ? "translate-x-0" : "translate-x-full"
        } transition-transform duration-300 ease-in-out md:hidden z-50`}
      >
        <div className="flex flex-col h-full bg-[var(--navbar-bg)] text-[var(--navbar-text)] border-l-4 border-[var(--card-border)] p-6 transition-colors duration-300">
          <div className="flex justify-between items-center mb-8">
            <span className="text-xl font-bold text-[var(--navbar-text)] font-mono">Menu</span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-[var(--navbar-text)] p-2 border-2 border-[var(--card-border)] rounded-md shadow-[2px_2px_0px_0px_var(--card-border)] focus:outline-none"
              aria-label="Close menu"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="flex flex-col space-y-4 mb-8">
            {isDashboard ? (
              // Dashboard navigation items
              dashboardItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="flex items-center py-3 px-4 rounded-md hover:bg-[var(--card-bg)] transition text-[var(--navbar-text)]"
                  onClick={() => setIsOpen(false)}
                >
                  <span className="mr-3 text-xl">{item.icon}</span>
                  <span className="font-medium">{item.name}</span>
                </Link>
              ))
            ) : (
              // Regular navigation items - only showing Services and Courses in mobile menu
              navItems.filter(item => item.name === "Services" || item.name === "Courses").map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="text-[var(--navbar-text)] py-2 text-lg font-medium border-b border-[var(--card-border)]"
                  onClick={() => setIsOpen(false)}
                >
                  {item.name}
                </Link>
              ))
            )}
          </div>

          <div className="flex flex-col space-y-1">
              {!isUserLoggedIn ? (
              <Link 
                href="/auth/login" 
                className="block w-full py-3 px-4 mt-8 bg-[var(--purple-primary)] text-white text-center font-bold border-2 border-[var(--card-border)] shadow-[4px_4px_0px_0px_var(--card-border)] hover:shadow-[2px_2px_0px_0px_var(--card-border)] hover:translate-y-1 transition-all"
                onClick={() => setIsOpen(false)}
              >
                    Login
                </Link>
              ) : (
              <div className="mt-8">
                <div className="flex items-center space-x-3 mb-4">
                  <Avatar name={user?.fullName} variant="beam" size={40} />
                  <div>
                    <h3 className="text-lg font-bold text-[var(--navbar-text)]">{user.fullName}</h3>
                    <p className="text-sm text-[var(--navbar-text)]">{user.email}</p>
                  </div>
                </div>
                        <button 
                          onClick={handleLogout}
                  className="block w-full py-3 px-4 bg-[var(--purple-primary)] text-white text-center font-bold border-2 border-[var(--card-border)] shadow-[4px_4px_0px_0px_var(--card-border)] hover:shadow-[2px_2px_0px_0px_var(--card-border)] hover:translate-y-1 transition-all"
                >
                          Logout
                        </button>
                </div>
              )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
