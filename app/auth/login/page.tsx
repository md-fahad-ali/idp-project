"use client";
import Retro from "@/components/ui/Retro";
import Link from "next/link";
import React from "react";
import { useEffect } from "react";
import toast from 'react-hot-toast';
import { useRouter } from "next/navigation";

const Login = () => {
  const router = useRouter();

  useEffect(()=>{

  },[])

  async function getLogin(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    console.log(e);
    const form = e.target as HTMLFormElement;
    const email = form.elements.namedItem("email") as HTMLInputElement;
    const password = form.elements.namedItem("password") as HTMLInputElement;
    console.log(email.value, password.value);
    try {
      const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: email.value, password: password.value }),
      });
      const data = await response.json();
      console.log(data);
      // Show success toast
      if (response.ok) {
        toast.success("Login successful");
        router.push("/dashboard");
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      const errorMessage = (error instanceof Error) ? error.message : "Unknown error"; 
      console.error("Error during login:", errorMessage);
      // Show error toast
      toast.error("Login failed. Please try again.");
    }
    
  }

  return (
    <div className="relative overflow-hidden flex items-center justify-center h-[100dvh]">
      {/* Retro Background */}
      

      {/* Login Container */}
      <div className="relative z-10 w-full max-w-xs sm:max-w-sm md:max-w-md p-6 sm:p-8 bg-[#cbb9dd] border-4 border-black rounded-lg shadow-[8px_8px_0px_0px_black]">
        {/* Title with Retro Gradient */}
        <h1 className="text-3xl sm:text-4xl font-bold text-center mb-6 sm:mb-8 tracking-wider bg-gradient-to-r from-[#0298a3] to-[#a302a3] bg-clip-text text-transparent">
          Sign In
        </h1>

        {/* Sign-in Form */}
        <form className="space-y-5 sm:space-y-6 font-mono" onSubmit={(e)=>{
          getLogin(e)
        }}>
          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-lg sm:text-xl font-semibold mb-2 text-gray-800">
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
            <div className="flex justify-between items-center">
              <label htmlFor="password" className="block text-lg sm:text-xl font-semibold mb-2 text-gray-800">
                Password
              </label>
              <a href="#" className="text-[#0047eb] hover:underline text-sm sm:text-base">
                Forgot Password?
              </a>
            </div>
            <input
              type="password"
              id="password"
              name="password"
              placeholder="Enter your password"
              className="w-full p-2 sm:p-3 bg-white border-2 border-black rounded-md shadow-[4px_4px_0px_0px_black] text-lg sm:text-xl focus:outline-none focus:ring-2 focus:ring-[#00DDEB]"
            />
          </div>

          {/* Sign-In Button */}
          <div>
            <button
              type="submit"
              className="w-full p-2 sm:p-3 text-white bg-[#FF00FF] border-4 border-black rounded-md shadow-[4px_4px_0px_0px_black] hover:bg-[#D100D1] transition-all duration-200 text-lg sm:text-xl font-bold"
            >
              Sign In
            </button>
          </div>
        </form>
        {/* Additional Links (Moved Inside Form for Better Spacing) */}
        <div className="mt-6 sm:mt-8 text-center">
          <p className="text-sm sm:text-base text-gray-700">
          {`  Don't have an account?  `}
            <Link href="/auth/signup" className="text-[#0047eb] hover:underline font-medium">
              Sign Up
            </Link>
          </p>
        </div>
      </div>

    <div className="absolute">

      <Retro/>
    </div>
    </div>
  );
};

export default Login;