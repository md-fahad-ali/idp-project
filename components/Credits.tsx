// components/AiQuizSection.tsx
'use client';

import React, { useEffect, useRef } from 'react';
import { motion, useInView, useAnimation } from 'framer-motion';
import { Zap, ChevronRight } from 'lucide-react';

// Animation variants
const containerVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.8,
            ease: 'easeOut',
        },
    },
};

const imageVariants = {
    hidden: { scale: 0.8, opacity: 0 },
    visible: {
        scale: 1,
        opacity: 1,
        transition: {
            duration: 0.8,
            ease: 'easeOut',
        },
    },
};

const buttonVariants = {
    hidden: { scale: 0.9, opacity: 0 },
    visible: {
        scale: 1,
        opacity: 1,
        transition: {
            duration: 0.6,
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

const Credits = () => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: false, amount: 0.3 });
    const controls = useAnimation();

    useEffect(() => {
        if (isInView) {
            controls.start('visible');
        } else {
            controls.start('hidden');
        }
    }, [isInView, controls]);

    return (
        <section
            className="py-20 mt-[100px] relative overflow-hidden text-white"
            ref={ref}
        >
            {/* CRT Scanline Effect */}
            <div className="absolute inset-0 opacity-50 pointer-events-none" />

            <div className="absolute top-0 left-0 right-0 h-40" />
            <div className="container mx-auto px-4 relative z-10">
                <div className="max-w-6xl mx-auto">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        {/* Image Section */}
                        <motion.div
                            className="relative order-2 lg:order-1"
                            variants={imageVariants}
                            initial="hidden"
                            animate={controls}
                        >
                            <div className="relative aspect-square max-w-md mx-auto transform transition-all duration-500">
                                <div className="relative z-10 transition-all duration-500 scale-100">
                                    <div className="absolute inset-0 rounded-full bg-gradient-to-b blur-xl opacity-50" />

                                </div>
                                <div className="absolute inset-0 transition-all duration-700 rotate-0">
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-12 rounded-lg bg-pink-500 shadow-lg shadow-pink-500/30 flex items-center justify-center text-white font-bold">
                                        <Zap className="w-6 h-6" />
                                    </div>
                                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-12 rounded-lg bg-cyan-500 shadow-lg shadow-cyan-500/30 flex items-center justify-center text-white font-bold">
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
                                        >
                                            <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
                                            <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
                                            <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4" />
                                        </svg>
                                    </div>
                                    <div className="absolute top-1/2 -translate-y-1/2 left-0 w-12 h-12 rounded-lg bg-purple-500 shadow-lg shadow-purple-500/30 flex items-center justify-center text-white font-bold">
                                        ?
                                    </div>
                                    <div className="absolute top-1/2 -translate-y-1/2 right-0 w-12 h-12 rounded-lg bg-amber-500 shadow-lg shadow-amber-500/30 flex items-center justify-center text-white font-bold">
                                        !
                                    </div>
                                </div>
                                <div className="absolute inset-0 -z-10">
                                    <motion.img src="/pc.png" alt="Image inside the circle" width={300} height={300} className="absolute inset-0 rounded-full mx-auto my-auto w-[50%] sm:w-[80%] z-[999]" animate={{ translateY: [0, -10, 0] }} transition={{ duration: 2, ease: "linear", repeat: Infinity }} />
                                    <div className="absolute inset-8 border-4 border-dashed border-blue-500/30 rounded-full transition-all duration-700 rotate-0" />
                                    <div className="absolute inset-16 border-4 border-dashed border-pink-500/20 rounded-full transition-all duration-700 rotate-0" />
                                </div>
                            </div>
                        </motion.div>

                        {/* Text Section */}
                        <motion.div className="lg:order-2" variants={containerVariants} initial="hidden" animate={controls}>
                            <div className="inline-block px-4 py-1 mb-4 border border-pink-500 rounded-full bg-blue-900/30 text-pink-400 text-sm font-bold">
                                AI-POWERED LEARNING
                            </div>
                            <h2 className="text-3xl md:text-4xl font-bold mb-6">
                                <span className="bg-gradient-to-r from-cyan-400 to-pink-500 bg-clip-text text-transparent">
                                    CHALLENGE YOUR KNOWLEDGE
                                </span>
                            </h2>
                            <p className="text-gray-300 mb-8 font-bold">
                                Our AI generates personalized quizzes and challenges based on your learning progress. The more you
                                play, the smarter it gets - adapting difficulty and focusing on areas where you need improvement.
                            </p>
                            <div className="space-y-6 mb-8">
                                <div className="flex gap-4 items-start">
                                    <div className="w-8 h-8 rounded bg-[#d1a6f4] flex items-center justify-center flex-shrink-0 mt-1" style={{
                                        border: "3px solid black",
                                        boxShadow: "3px 2px #d1a6f4"
                                    }}>
                                        <ChevronRight className="w-5 h-5 text-black font-bold" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-white mb-1">Adaptive Questions</h3>
                                        <p className="text-gray-400">
                                            Questions that adjust in real-time based on your answers
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-4 items-start">
                                    <div className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0 mt-1" style={{
                                        background: "#d1a6f4",
                                        border: "3px solid black",
                                        boxShadow: "3px 2px #d1a6f4"
                                    }}>
                                        <ChevronRight className="w-5 h-5 text-black font-bold" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-white mb-1">Challenge Friends</h3>
                                        <p className="text-gray-400">
                                            Create custom AI quizzes and challenge your classmates to beat your score
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-4 items-start">
                                    <div className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0 mt-1" style={{
                                        background: "#d1a6f4",
                                        border: "3px solid black",
                                        boxShadow: "3px 2px #d1a6f4"
                                    }}>
                                        <ChevronRight className="w-5 h-5 text-black font-bold" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-white mb-1">Instant Feedback</h3>
                                        <p className="text-gray-400">
                                            Get explanations and learning resources based on your answers
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <motion.button
                                className="px-6 py-3 rounded-md text-wheat font-bold flex items-center justify-center gap-2 shadow-lg transition-all"
                                variants={buttonVariants}
                                initial="hidden"
                                animate={controls}
                                whileHover="hover"
                                style={{
                                    opacity: 1,
                                    transform: "scale(0.9)",
                                    background: "#4d0884",
                                    boxShadow: "8px 10px black",
                                    color: "wheat",
                                }}
                            >
                                Try an AI Quiz Now
                                <Zap className="w-5 h-5" />
                            </motion.button>
                        </motion.div>
                    </div>
                </div>
            </div>

            {/* Custom CSS for Retro Effect */}
            <style jsx>{`
        .retro-screen {
          filter: contrast(1.2) brightness(0.9);
          background: linear-gradient(to bottom, #1a0d2b, #2a1c3d);
        }
        @media (min-width: 1024px) {
          .retro-screen {
            animation: scanlines 0.1s infinite;
          }
          @keyframes scanlines {
            0% {
              background-position: 0 0;
            }
            100% {
              background-position: 0 -10px;
            }
          }
        }
      `}</style>
        </section >
    );
};

export default Credits;