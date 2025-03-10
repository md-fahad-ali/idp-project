'use client'; // Add this if not already using it in a client component

import Retro from '@/components/ui/Retro';
import React from 'react';
import { Orbitron } from 'next/font/google';
import localFont from 'next/font/local';
import Link from 'next/link';
import { motion } from 'framer-motion';

const myFont = localFont({ src: './cyber.ttf' });

const orbitron = Orbitron({
  subsets: ['latin'],
});

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
    },
  },
};

const textVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      ease: 'easeOut',
    },
  },
};

const buttonVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: 'easeOut',
    },
  },
  hover: {
    scale: 1.05,
    transition: {
      duration: 0.3,
    },
  },
};

function Hero() {
  return (
    <div className="flex">
      <div className="flex">
        <div>
          <Retro />
        </div>
        <div
          className="absolute"
          style={{
            width: '100%',
            height: '100%',
            background: 'linear-gradient(360deg, rgb(22 0 37) 0%, transparent 15%)',
          }}
        ></div>
      </div>
      <motion.div
        className="absolute w-full h-full flex flex-col justify-center items-center"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.h1
          className={`${myFont.className} flex flex-col items-center leading-[0.7] text-4xl md:text-5xl lg:text-6xl font-bold mb-6`}
          variants={textVariants}
        >
          <motion.span
            className="bg-gradient-to-r text-[1.8rem] sm:text-[2rem] md:text-[3rem] lg:text-[4.5rem] from-cyan-400 to-pink-500 bg-clip-text text-transparent"
            style={{
              color: '#7f33c6',
              textShadow: '-1px 5px 0px black',
            }}
            variants={textVariants}
          >
            GAME-POWERED
          </motion.span>
          <br />
          <motion.span
            className={`text-white text-[1.5rem] sm:text-[2.5rem] ${orbitron.className}`}
            style={{ textShadow: '2px 4px black' }}
            variants={textVariants}
          >
            Educational Platform
          </motion.span>
        </motion.h1>

        <motion.p
          className="text-xl text-gray-300 mb-8 p-1 max-w-lg text-center"
          variants={textVariants}
        >
          Transform learning into an exciting arcade adventure. Compete,
          challenge friends, and master new skills with our AI-powered platform.
        </motion.p>

        <motion.div
          className="flex flex-row gap-4 items-center"
          variants={containerVariants}
        >
          <motion.div variants={buttonVariants} whileHover="hover">
            <Link
              href="/signup"
              style={{ boxShadow: '4px 5px #00000099' }}
              className="text-center px-6 sm:px-8 py-2 sm:py-3 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 rounded-md text-white font-bold flex items-center justify-center gap-2 transform transition shadow-lg shadow-pink-600/30 group"
            >
              Start Learning
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="lucide lucide-arrow-right w-4 h-4 group-hover:translate-x-1 transition-transform"
              >
                <path d="M5 12h14"></path>
                <path d="m12 5 7 7-7 7"></path>
              </svg>
            </Link>
          </motion.div>

          <motion.div variants={buttonVariants} whileHover="hover">
            <Link
              href="/demo"
              style={{ boxShadow: '4px 6px #00000099' }}
              className="text-center px-6 sm:px-8 py-2 sm:py-3 border border-cyan-500 hover:border-cyan-400 bg-blue-900/30 hover:bg-blue-900/50 rounded-md text-cyan-400 font-bold transition-colors"
            >
              Try Demo
            </Link>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default Hero;