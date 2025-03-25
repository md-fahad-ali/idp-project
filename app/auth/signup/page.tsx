"use client";

import Retro from "@/components/ui/Retro";
import { useRouter } from "next/navigation";
import Link from "next/link";
import React from "react";
import toast from 'react-hot-toast';


const SignUp = () => {
  
  const router = useRouter();

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
    <div className="relative overflow-hidden flex items-center justify-center h-[100dvh]">
      {/* Retro Background */}
      <div className="absolute">
        <Retro />
      </div>

      {/* Sign Up Container */}
      <div className="relative z-10 w-full max-w-sm sm:max-w-md md:max-w-lg p-6 sm:p-8 bg-[#cbb9dd] border-4 border-black rounded-lg shadow-[8px_8px_0px_0px_black]">
        {/* Title with Retro Gradient */}
        <h1 className="text-3xl sm:text-4xl font-bold text-center mb-6 sm:mb-8 tracking-wider bg-gradient-to-r from-[#0298a3] to-[#a302a3] bg-clip-text text-transparent">
          Sign Up
        </h1>

        {/* Error Message */}
        
      

        {/* Sign-up Form */}
        <form className="space-y-5 sm:space-y-6 font-mono" onSubmit={handleSubmit}>
          {/* First Name and Last Name Container */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {/* First Name Field */}
            <div>
              <label
                htmlFor="firstName"
                className="block text-lg sm:text-xl font-semibold mb-2 text-gray-800"
              >
                First Name
              </label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                placeholder="Enter your first name"
                className="w-full p-2 sm:p-3 bg-white border-2 border-black rounded-md shadow-[4px_4px_0px_0px_black] text-lg sm:text-xl focus:outline-none focus:ring-2 focus:ring-[#00DDEB]"
              />
            </div>

            {/* Last Name Field */}
            <div>
              <label
                htmlFor="lastName"
                className="block text-lg sm:text-xl font-semibold mb-2 text-gray-800"
              >
                Last Name
              </label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                placeholder="Enter your last name"
                className="w-full p-2 sm:p-3 bg-white border-2 border-black rounded-md shadow-[4px_4px_0px_0px_black] text-lg sm:text-xl focus:outline-none focus:ring-2 focus:ring-[#00DDEB]"
              />
            </div>
          </div>

          {/* Username Field */}
          <div>
            <label
              htmlFor="username"
              className="block text-lg sm:text-xl font-semibold mb-2 text-gray-800"
            >
              Username
            </label>
            <input
              type="text"
              id="username"
              name="username"
              placeholder="Enter your username"
              className="w-full p-2 sm:p-3 bg-white border-2 border-black rounded-md shadow-[4px_4px_0px_0px_black] text-lg sm:text-xl focus:outline-none focus:ring-2 focus:ring-[#00DDEB]"
            />
          </div>

          {/* Email Field */}
          <div>
            <label
              htmlFor="email"
              className="block text-lg sm:text-xl font-semibold mb-2 text-gray-800"
            >
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="Enter your email"
              className="w-full p-2 sm:p-3 bg-white border-2 border-black rounded-md shadow-[4px_4px_0px_0px_black] text-lg sm:text-xl focus:outline-none focus:ring-2 focus:ring-[#00DDEB]"
            />
          </div>

          {/* Password Field */}
          <div>
            <label
              htmlFor="password"
              className="block text-lg sm:text-xl font-semibold mb-2 text-gray-800"
            >
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              placeholder="Enter your password"
              className="w-full p-2 sm:p-3 bg-white border-2 border-black rounded-md shadow-[4px_4px_0px_0px_black] text-lg sm:text-xl focus:outline-none focus:ring-2 focus:ring-[#00DDEB]"
            />
          </div>

          {/* Role Field */}
          <div>
            <label
              htmlFor="role"
              className="block text-lg sm:text-xl font-semibold mb-2 text-gray-800"
            >
              Role
            </label>
            <select
              id="role"
              name="role"
              className="w-full p-2 sm:p-3 bg-white border-2 border-black rounded-md shadow-[4px_4px_0px_0px_black] text-lg sm:text-xl focus:outline-none focus:ring-2 focus:ring-[#00DDEB]"
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
              className="w-full p-2 sm:p-3 text-white bg-[#FF00FF] border-4 border-black rounded-md shadow-[4px_4px_0px_0px_black] hover:bg-[#D100D1] transition-all duration-200 text-lg sm:text-xl font-bold"
            >
              Sign Up
            </button>
          </div>
        </form>

        {/* Additional Links */}
        <div className="mt-6 sm:mt-8 text-center">
          <p className="text-sm sm:text-base text-gray-700">
            Already have an account?{' '}
            <Link
              href="/auth/login"
              className="text-[#0047eb] hover:underline font-medium"
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