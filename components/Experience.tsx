'use client';

import Card from './ui/Card';
import { Gamepad2, Trophy, Bot, Users, Zap, Brain } from 'lucide-react';
import { motion, useInView, useAnimation } from 'framer-motion';
import { useEffect, useRef } from 'react';

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
    const isInView = useInView(ref, { amount: 0.1 }); // Trigger when 30% is visible
    const isOutView = !isInView; // Add this line
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
        } else if (isOutView) { // Update this line
            controls.start('hidden');
        }
    }, [isInView, isOutView, controls]); // Update this line

    return (
        <div className="mt-[100px] flex flex-col items-center justify-center" ref={ref}>
            <motion.div
                className="text-center max-w-3xl mx-auto mb-16 flex flex-col items-center"
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
            >
                <h2 className="text-3xl md:text-4xl font-bold mb-4 flex flex-col md:flex-row gap-[10px]">
                    <span className="bg-gradient-to-r from-cyan-400 to-pink-500 bg-clip-text text-transparent">
                        POWER-UP
                    </span>
                    <span className="text-white">Your Learning Experience</span>
                </h2>
                <p className="text-gray-300">
                    Our platform transforms traditional learning into an exciting,
                    game-like adventure
                </p>
            </motion.div>
            <div className="container mx-auto px-4 flex justify-center items-center">
                <motion.div
                    className="grid justify-center items-center grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full lg:w-[70%]"
                    variants={containerVariants}
                    initial="hidden"
                    animate={controls}
                    style={{justifyItems:"center"}}
                >
                    {exp.map((e, i) => (
                        <motion.div key={i} variants={cardVariants} className="flex-1">
                            <Card title={e.title} description={e.description} />
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </div>
    );
}

export default Exprience;