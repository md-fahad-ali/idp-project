"use client";

import Retro from "@/components/ui/Retro";
import { useRouter } from "next/navigation";
import Link from "next/link";
import React, { useState, useEffect } from "react";
import toast from 'react-hot-toast';


const SignUp = () => {
  const router = useRouter();
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // Detect dark mode
  useEffect(() => {
    // Check if we're on dark mode
    if (typeof window !== 'undefined') {
      const isDark = document.documentElement.classList.contains('dark-theme');
      setIsDarkMode(isDark);
      
      // Listen for theme changes
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.attributeName === 'class') {
            const isDark = document.documentElement.classList.contains('dark-theme');
            setIsDarkMode(isDark);
          }
        });
      });
      
      observer.observe(document.documentElement, { attributes: true });
      return () => observer.disconnect();
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        credentials: 'include', // Add this line to handle cookies
        body: JSON.stringify({
          firstName: (e.currentTarget.elements.namedItem('firstName') as HTMLInputElement).value,
          lastName: (e.currentTarget.elements.namedItem('lastName') as HTMLInputElement).value,
          username: (e.currentTarget.elements.namedItem('username') as HTMLInputElement).value,
          email: (e.currentTarget.elements.namedItem('email') as HTMLInputElement).value,
          password: (e.currentTarget.elements.namedItem('password') as HTMLInputElement).value,
          role: (e.currentTarget.elements.namedItem('role') as HTMLSelectElement).value,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        
        toast.error(errorData.msg || 'Something went wrong');
      } else {
        console.log(await response.json());
        toast.success('Account created successfully');
        router.push('/auth/login');
      }
    } catch (err) {
      console.error(err);
      
      toast.error('Network error');
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center">
      {/* Retro Background */}
      <div className="absolute inset-0">
        <Retro />
      </div>

      {/* Sign Up Container */}
      <div className={`relative z-10 w-full max-w-sm sm:max-w-md md:max-w-lg p-6 sm:p-8 ${isDarkMode ? 'bg-[#1e293b] border-[#3a3b47]' : 'bg-[#cbb9dd] border-black'} border-4 rounded-lg shadow-[8px_8px_0px_0px_${isDarkMode ? '#364155' : 'black'}] max-h-[90vh] overflow-y-auto`}
           style={{boxShadow: isDarkMode ? '8px 8px 0px 0px #364155' : '8px 8px 0px 0px black'}}>
        {/* Title with Retro Gradient */}
        <h1 className="text-3xl sm:text-4xl font-bold text-center mb-6 sm:mb-8 tracking-wider bg-gradient-to-r from-[#0298a3] to-[#a302a3] bg-clip-text text-transparent">
          Sign Up
        </h1>

        {/* Error Message */}
        
      

        {/* Sign-up Form */}
        <form className="space-y-4 sm:space-y-5 font-mono" onSubmit={handleSubmit}>
          {/* First Name and Last Name Container */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* First Name Field */}
            <div>
              <label
                htmlFor="firstName"
                className={`block text-lg font-semibold mb-1 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}
              >
                First Name
              </label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                placeholder="Enter your first name"
                className={`w-full p-2 ${isDarkMode ? 'bg-[#0f172a] text-white border-[#3a3b47] placeholder-gray-400' : 'bg-white text-black border-black placeholder-gray-500'} border-2 rounded-md shadow-[4px_4px_0px_0px_${isDarkMode ? '#364155' : 'black'}] text-lg focus:outline-none focus:ring-2 focus:ring-[#00DDEB]`}
                style={{boxShadow: isDarkMode ? '4px 4px 0px 0px #364155' : '4px 4px 0px 0px black'}}
              />
            </div>

            {/* Last Name Field */}
            <div>
              <label
                htmlFor="lastName"
                className={`block text-lg font-semibold mb-1 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}
              >
                Last Name
              </label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                placeholder="Enter your last name"
                className={`w-full p-2 ${isDarkMode ? 'bg-[#0f172a] text-white border-[#3a3b47] placeholder-gray-400' : 'bg-white text-black border-black placeholder-gray-500'} border-2 rounded-md shadow-[4px_4px_0px_0px_${isDarkMode ? '#364155' : 'black'}] text-lg focus:outline-none focus:ring-2 focus:ring-[#00DDEB]`}
                style={{boxShadow: isDarkMode ? '4px 4px 0px 0px #364155' : '4px 4px 0px 0px black'}}
              />
            </div>
          </div>

          {/* Username Field */}
          <div>
            <label
              htmlFor="username"
              className={`block text-lg font-semibold mb-1 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}
            >
              Username
            </label>
            <input
              type="text"
              id="username"
              name="username"
              placeholder="Enter your username"
              className={`w-full p-2 ${isDarkMode ? 'bg-[#0f172a] text-white border-[#3a3b47] placeholder-gray-400' : 'bg-white text-black border-black placeholder-gray-500'} border-2 rounded-md shadow-[4px_4px_0px_0px_${isDarkMode ? '#364155' : 'black'}] text-lg focus:outline-none focus:ring-2 focus:ring-[#00DDEB]`}
              style={{boxShadow: isDarkMode ? '4px 4px 0px 0px #364155' : '4px 4px 0px 0px black'}}
            />
          </div>

          {/* Email Field */}
          <div>
            <label
              htmlFor="email"
              className={`block text-lg font-semibold mb-1 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}
            >
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="Enter your email"
              className={`w-full p-2 ${isDarkMode ? 'bg-[#0f172a] text-white border-[#3a3b47] placeholder-gray-400' : 'bg-white text-black border-black placeholder-gray-500'} border-2 rounded-md shadow-[4px_4px_0px_0px_${isDarkMode ? '#364155' : 'black'}] text-lg focus:outline-none focus:ring-2 focus:ring-[#00DDEB]`}
              style={{boxShadow: isDarkMode ? '4px 4px 0px 0px #364155' : '4px 4px 0px 0px black'}}
            />
          </div>

          {/* Password Field */}
          <div>
            <label
              htmlFor="password"
              className={`block text-lg font-semibold mb-1 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}
            >
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              placeholder="Enter your password"
              className={`w-full p-2 ${isDarkMode ? 'bg-[#0f172a] text-white border-[#3a3b47] placeholder-gray-400' : 'bg-white text-black border-black placeholder-gray-500'} border-2 rounded-md shadow-[4px_4px_0px_0px_${isDarkMode ? '#364155' : 'black'}] text-lg focus:outline-none focus:ring-2 focus:ring-[#00DDEB]`}
              style={{boxShadow: isDarkMode ? '4px 4px 0px 0px #364155' : '4px 4px 0px 0px black'}}
            />
          </div>

          {/* Role Field */}
          <div>
            <label
              htmlFor="role"
              className={`block text-lg font-semibold mb-1 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}
            >
              Role
            </label>
            <select
              id="role"
              name="role"
              className={`w-full p-2 ${isDarkMode ? 'bg-[#0f172a] text-white border-[#3a3b47]' : 'bg-white text-black border-black'} border-2 rounded-md shadow-[4px_4px_0px_0px_${isDarkMode ? '#364155' : 'black'}] text-lg focus:outline-none focus:ring-2 focus:ring-[#00DDEB]`}
              style={{boxShadow: isDarkMode ? '4px 4px 0px 0px #364155' : '4px 4px 0px 0px black'}}
            >
              <option value="">Select your role</option>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {/* Sign-Up Button */}
          <div>
            <button
              type="submit"
              className={`w-full p-2 text-white ${isDarkMode ? 'bg-[#a302a3] border-[#3a3b47]' : 'bg-[#FF00FF] border-black'} border-4 rounded-md shadow-[4px_4px_0px_0px_${isDarkMode ? '#364155' : 'black'}] hover:bg-[#D100D1] transition-all duration-200 text-lg font-bold`}
              style={{boxShadow: isDarkMode ? '6px 6px 0px 0px #364155' : '6px 6px 0px 0px black'}}
            >
              Sign Up
            </button>
          </div>
        </form>

        {/* Additional Links */}
        <div className="mt-5 text-center">
          <p className={`text-sm sm:text-base ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Already have an account?{' '}
            <Link
              href="/auth/login"
              className={`${isDarkMode ? 'text-[#a78bfa]' : 'text-[#0047eb]'} hover:underline font-medium`}
            >
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignUp;