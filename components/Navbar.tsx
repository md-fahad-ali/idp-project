// components/Navbar.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Avatar from "boring-avatars";

const Navbar = ({
  access_token,
}: Readonly<{
  access_token: string | undefined;
}>) => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [user, setUser] = useState({
    fullName: "",
    email: "",
  });
  // Store last auth timestamp to detect changes
  const [lastAuthTimestamp, setLastAuthTimestamp] = useState<string | null>(null);

  const navItems = [
    { name: "Home", href: "/" },
    { name: "About", href: "/about" },
    { name: "Services", href: "/services" },
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

  useEffect(() => {
    // Check for auth timestamp changes to detect session updates
    const currentAuthTimestamp = typeof window !== 'undefined' ? localStorage.getItem('auth_timestamp') : null;
    
    if (currentAuthTimestamp !== lastAuthTimestamp) {
      setLastAuthTimestamp(currentAuthTimestamp);
      fetchUserData();
    } else if (access_token) {
      fetchUserData();
    }
  }, [access_token, fetchUserData, lastAuthTimestamp]);

  return (
    <nav className="fixed w-full z-50 bg-transparent bg-blur-lg backdrop-blur-lg">
      {/* Desktop Menu */}
      <div className="hidden md:flex justify-between items-center max-w-7xl mx-auto px-4 py-4">
        <Link href="/" className="text-2xl font-bold text-white">
          Logo
        </Link>
        <div className="flex space-x-8 items-center">
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="text-white hover:text-gray-300 transition-colors duration-200"
            >
              {item.name}
            </Link>
          ))}

          {!isUserLoggedIn ? (
            <Link href="/auth/login" className="relative">
              <button className="px-6 py-2 bg-transparent text-white text-sm font-bold rounded-full border-2 border-[#1a004f] hover:bg-[#1a004f] hover:text-white transition-all duration-200 shadow-[0_1px_4px_rgba(0,221,235,0.3)] hover:shadow-[0_6px_8px_rgba(0,221,235,0.5)]">
                Login
              </button>
            </Link>
          ) : (
            <div className="flex relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="text-white focus:outline-none"
                aria-label="Toggle user menu"
              >
                <Avatar name={user?.fullName} variant="beam" size={30} />
              </button>
              {isDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-[#8f36d6] border-4 border-black rounded-md shadow-[8px_8px_0px_0px_black]">
                  <div className="p-4">
                    <h3 className="text-xl font-bold text-black">
                      {user.fullName}
                    </h3>
                    <p className="text-black">{user.email}</p>
                    <button 
                      onClick={handleLogout}
                      className="mt-4 px-4 py-2 bg-black text-yellow-200 border-2 border-black font-bold shadow-[4px_4px_0px_0px_black] hover:shadow-[8px_8px_0px_0px_black] transform hover:-translate-y-1 transition-all">
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
      <div className="md:hidden flex justify-between items-center px-4 py-4">
        <Link href="/" className="text-2xl font-bold text-white">
          Logo
        </Link>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-white focus:outline-none"
          aria-label="Toggle menu"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            {isOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Menu with Circular Animation and Close Button */}
      <div
        className={`md:hidden h-[100dvh] fixed inset-0 ${
          isOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
      >
        <div
          className={`absolute inset-0 bg-gray-900 bg-blur-lg backdrop-blur-lg transition-all duration-500 ease-in-out ${
            isOpen ? "clip-circle-full" : "clip-circle-small"
          }`}
        >
          <div className="relative h-full">
            {/* Close Button */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-white focus:outline-none"
              aria-label="Close menu"
            >
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            {/* Menu Items */}
            <div className="flex flex-col items-center justify-center h-full">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="text-white py-4 text-2xl font-medium hover:text-gray-300 transition-colors duration-200"
                  onClick={() => setIsOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
              {!isUserLoggedIn ? (
                <Link href="/auth/login" onClick={() => setIsOpen(false)}>
                  <button className="px-6 py-2 mt-4 bg-gray-800 text-white text-lg font-bold rounded-full border-2 border-[#00DDEB] hover:bg-[#00DDEB] hover:text-gray-900 transition-all duration-200 shadow-[0_4px_6px_rgba(0,221,235,0.3)] hover:shadow-[0_6px_8px_rgba(0,221,235,0.5)]">
                    Login
                  </button>
                </Link>
              ) : (
                <div className="relative mt-4">
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="text-white focus:outline-none"
                    aria-label="Toggle user menu"
                  ></button>
                  {isDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-[#8f36d6] border-4 border-black rounded-md shadow-[8px_8px_0px_0px_black]">
                      <div className="p-4">
                        <h3 className="text-xl font-bold text-black">
                          {user.fullName}
                        </h3>
                        <p className="text-black">{user.email}</p>
                        <button 
                          onClick={handleLogout}
                          className="mt-4 px-4 py-2 bg-black text-yellow-200 border-2 border-black font-bold shadow-[4px_4px_0px_0px_black] hover:shadow-[8px_8px_0px_0px_black] transform hover:-translate-y-1 transition-all">
                          Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
