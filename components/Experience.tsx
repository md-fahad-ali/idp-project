'use client';

import React from 'react';
import Link from 'next/link';
import { motion, useInView, useAnimation } from 'framer-motion';
import { useEffect, useRef } from 'react';
import Card from './ui/Card';
import { Gamepad2, Trophy, Bot, Users, Zap, Brain } from 'lucide-react';

export function Exprience() {
    const exp = [
        {
            title: 'Gamified Learning',
            description:
                'Earn points, unlock achievements, and level up as you master new concepts and skills',
            icon: Gamepad2,
        },
        {
            title: 'Compete & Win',
            description:
                'Challenge yourself on the leaderboard and compete with peers for the top spot',
            icon: Trophy,
        },
        {
            title: 'AI-Powered Quizzes',
            description:
                'Dynamically generated questions that adapt to your learning style and progress',
            icon: Bot,
        },
        {
            title: 'Peer Challenges',
            description:
                'Create custom challenges and send them to friends to test their knowledge',
            icon: Users,
        },
        {
            title: 'Admin Dashboard',
            description:
                'For educators to launch courses, track progress, and analyze student performance',
            icon: Zap,
        },
        {
            title: 'Adaptive Learning',
            description:
                'Personalized learning paths that adjust based on your strengths and weaknesses',
            icon: Brain,
        },
    ];

    // Ref and animation controls
    const ref = useRef(null);
    const isInView = useInView(ref, { amount: 0.1 }); // Trigger when 10% is visible
    const controls = useAnimation();

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

    const cardVariants = {
        hidden: { opacity: 0, y: 50, transition: { duration: 0.1 } },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.6,
                ease: 'easeOut',
            },
        },
    };

    // Control animation based on view state
    useEffect(() => {
        if (isInView) {
            controls.start('visible');
        } else {
            controls.start('hidden');
        }
    }, [isInView, controls]);

    return (
        <div className="w-full" ref={ref}>
            <motion.div
                className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-4 md:px-8"
                variants={containerVariants}
                initial="hidden"
                animate={controls}
            >
                {exp.map((e, i) => (
                    <motion.div
                        key={i}
                        variants={cardVariants}
                        className="bg-purple-600 border-4 border-purple-700 rounded-lg p-6 shadow-lg relative overflow-hidden"
                    >
                        {/* Background design elements */}
                        <div className="absolute -bottom-6 -right-6 w-20 h-20 rounded-full bg-purple-500 opacity-30"></div>
                        
                        <div className="relative z-10">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-bold text-white font-mono">{e.title}</h3>
                            </div>
                            <p className="text-gray-200 mb-5">{e.description}</p>
                            <Link 
                                href="/features"
                                className="inline-block bg-black text-white py-2 px-4 rounded-md font-medium hover:bg-gray-900 transition-colors"
                            >
                                Learn More
                            </Link>
                        </div>
                    </motion.div>
                ))}
            </motion.div>
        </div>
    );
}

export default Exprience;