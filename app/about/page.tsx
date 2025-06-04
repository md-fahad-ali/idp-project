"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-color)] text-[var(--text-color)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        {/* Hero Section */}
        <motion.div 
          className="text-center mb-20"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6">
            About <span className="text-[var(--purple-primary)]">SkillStreet</span>
          </h1>
          <p className="text-lg md:text-xl max-w-3xl mx-auto">
            Empowering learners through interactive education experiences and personalized skill development.
          </p>
        </motion.div>

        {/* Mission and Vision */}
        <div className="grid md:grid-cols-2 gap-12 mb-20">
          <motion.div
            className="bg-[var(--card-bg)] p-8 rounded-lg border-2 border-[var(--card-border)] shadow-[var(--card-shadow)]"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <h2 className="text-2xl font-bold mb-4 text-[var(--purple-primary)]">Our Mission</h2>
            <p className="text-lg">
              To democratize education by providing accessible, engaging, and effective learning 
              experiences for everyone. We believe in breaking down barriers to education and empowering 
              individuals to achieve their full potential through skills-based learning.
            </p>
          </motion.div>
          
          <motion.div
            className="bg-[var(--card-bg)] p-8 rounded-lg border-2 border-[var(--card-border)] shadow-[var(--card-shadow)]"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <h2 className="text-2xl font-bold mb-4 text-[var(--purple-primary)]">Our Vision</h2>
            <p className="text-lg">
              To create a world where continuous learning is accessible to all, regardless of background or 
              circumstance. We envision a future where education adapts to individual needs, empowering 
              people to thrive in an ever-changing global economy.
            </p>
          </motion.div>
        </div>

        {/* Our Values */}
        <motion.div 
          className="mb-20"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <h2 className="text-3xl font-bold mb-8 text-center">Our Values</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-[var(--card-bg)] p-6 rounded-lg border-2 border-[var(--card-border)] shadow-[var(--card-shadow)]">
              <div className="w-12 h-12 bg-[var(--purple-primary)] rounded-full flex items-center justify-center mb-4">
                <span className="text-white text-2xl">🌱</span>
              </div>
              <h3 className="text-xl font-bold mb-2">Innovation</h3>
              <p>We constantly push boundaries to create better learning experiences through technology and pedagogy.</p>
            </div>
            
            <div className="bg-[var(--card-bg)] p-6 rounded-lg border-2 border-[var(--card-border)] shadow-[var(--card-shadow)]">
              <div className="w-12 h-12 bg-[var(--purple-primary)] rounded-full flex items-center justify-center mb-4">
                <span className="text-white text-2xl">🤝</span>
              </div>
              <h3 className="text-xl font-bold mb-2">Inclusivity</h3>
              <p>We embrace diversity and create learning environments where everyone feels welcome and valued.</p>
            </div>
            
            <div className="bg-[var(--card-bg)] p-6 rounded-lg border-2 border-[var(--card-border)] shadow-[var(--card-shadow)]">
              <div className="w-12 h-12 bg-[var(--purple-primary)] rounded-full flex items-center justify-center mb-4">
                <span className="text-white text-2xl">🎯</span>
              </div>
              <h3 className="text-xl font-bold mb-2">Excellence</h3>
              <p>We are committed to delivering the highest quality educational content and experiences.</p>
            </div>
          </div>
        </motion.div>

        {/* Team Section */}
        <motion.div
          className="mb-20"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
        >
          <h2 className="text-3xl font-bold mb-8 text-center">Our Team</h2>
          <p className="text-lg text-center max-w-3xl mx-auto mb-10">
            We're a passionate group of educators, technologists, and lifelong learners dedicated to 
            transforming how people learn and develop skills.
          </p>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Placeholder team members */}
            {[
              { name: "Alex Johnson", role: "Founder & CEO", image: "/placeholder-profile.jpg" },
              { name: "Sarah Chen", role: "Chief Learning Officer", image: "/placeholder-profile.jpg" },
              { name: "Marcus Williams", role: "Head of Technology", image: "/placeholder-profile.jpg" }
            ].map((member, index) => (
              <div 
                key={index} 
                className="bg-[var(--card-bg)] p-6 rounded-lg border-2 border-[var(--card-border)] shadow-[var(--card-shadow)] text-center"
              >
                <div className="w-24 h-24 mx-auto mb-4 relative rounded-full overflow-hidden bg-gray-200">
                  {/* Placeholder image - in production, replace with actual team photos */}
                  <div className="w-full h-full bg-[var(--purple-primary)] flex items-center justify-center">
                    <span className="text-white text-3xl">{member.name[0]}</span>
                  </div>
                </div>
                <h3 className="text-xl font-bold">{member.name}</h3>
                <p className="text-[var(--purple-primary)]">{member.role}</p>
              </div>
            ))}
          </div>
        </motion.div>
        
        {/* CTA Section */}
        <motion.div 
          className="text-center py-12"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1 }}
        >
          <h2 className="text-3xl font-bold mb-6">Join Our Learning Community</h2>
          <p className="text-lg max-w-3xl mx-auto mb-8">
            Ready to start your learning journey with SkillStreet? Explore our courses and join 
            thousands of learners who are transforming their careers and lives.
          </p>
          <Link href="/courses">
            <button className="px-8 py-3 bg-[var(--purple-primary)] text-white font-bold rounded-md border-2 border-[var(--card-border)] shadow-[4px_4px_0px_0px_var(--card-border)] hover:shadow-[2px_2px_0px_0px_var(--card-border)] hover:translate-y-1 transition-all">
              Browse Courses
            </button>
          </Link>
        </motion.div>
      </div>
    </div>
  );
} 