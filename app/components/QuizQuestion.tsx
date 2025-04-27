"use client";

import { useState, useEffect } from 'react';
import { useTheme } from '../provider/theme-provider';
import { Moon, Sun } from 'lucide-react';
import { Bell } from 'lucide-react';

interface QuizQuestionProps {
  currentQuestion: number;
  totalQuestions: number;
  question: string;
  options: string[];
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  onSelectOption: (index: number) => void;
  selectedOption: number | null;
  explanation?: string;
  onNextQuestion: () => void;
}

export default function QuizQuestion({ 
  currentQuestion,
  totalQuestions,
  question,
  options,
  difficulty,
  onSelectOption,
  selectedOption,
  explanation,
  onNextQuestion
}: QuizQuestionProps) {
  const [timer, setTimer] = useState(0);
  const { theme, toggleTheme, mounted } = useTheme();
  
  // Update timer
  useEffect(() => {
    const interval = setInterval(() => {
      setTimer(prev => prev + 1);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [currentQuestion]);
  
  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };
  
  return (
    <div className="min-h-screen bg-[var(--background-color)] text-[var(--text-color)] transition-colors">
      <div className="container mx-auto px-4 py-8">
        {/* Header with theme toggle */}
        <header className="flex justify-between items-center mb-8 p-4 border border-[var(--card-border)] rounded-lg bg-[var(--card-bg)] shadow-[4px_4px_0px_0px_var(--card-shadow)]">
          <h1 className="text-2xl font-bold text-[var(--text-color)]">SkillStreet</h1>
          <div className="flex items-center space-x-4">
            <nav className="hidden md:flex space-x-6">
              <a href="#" className="text-[var(--text-color)] hover:text-[var(--purple-primary)] transition-colors">Home</a>
              <a href="#" className="text-[var(--text-color)] hover:text-[var(--purple-primary)] transition-colors">About</a>
              <a href="#" className="text-[var(--text-color)] hover:text-[var(--purple-primary)] transition-colors">Services</a>
              <a href="#" className="text-[var(--text-color)] hover:text-[var(--purple-primary)] transition-colors">Courses</a>
            </nav>
            
            {/* Theme toggle button */}
            {mounted && (
              <button
                onClick={toggleTheme}
                className="flex items-center justify-center w-10 h-10 rounded-full border-2 border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--text-color)] shadow-[2px_2px_0px_0px_var(--card-shadow)] hover:shadow-[3px_3px_0px_0px_var(--card-shadow)] transition-all"
                aria-label={theme === 'dark' ? "Switch to light mode" : "Switch to dark mode"}
              >
                {theme === 'dark' ? (
                  <Sun size={20} className="text-[var(--text-color)]" />
                ) : (
                  <Moon size={20} className="text-[var(--text-color)]" />
                )}
              </button>
            )}
            
            {/* Notification button */}
            <button
              className="flex items-center justify-center w-10 h-10 rounded-full border-2 border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--text-color)] shadow-[2px_2px_0px_0px_var(--card-shadow)] hover:shadow-[3px_3px_0px_0px_var(--card-shadow)] transition-all"
              aria-label="Notifications"
            >
              <Bell size={20} className="text-[var(--text-color)]" />
            </button>
          </div>
        </header>
        
        {/* Quiz container */}
        <div className="max-w-3xl mx-auto w-full">
          <div className="bg-[var(--quiz-container-bg)] border-2 border-[var(--card-border)] rounded-lg p-6 shadow-[6px_6px_0px_0px_var(--card-shadow)] transition-all relative">
            <div className="absolute right-6 top-6 px-3 py-1 rounded-full bg-[var(--purple-primary)] text-white text-sm font-medium">
              {difficulty}
            </div>
            
            <div className="h-2 bg-[var(--option-bg)] rounded-full mb-6 overflow-hidden">
              <div 
                className="h-full bg-[var(--purple-primary)] rounded-full transition-all duration-300"
                style={{ width: `${((currentQuestion + 1) / totalQuestions) * 100}%` }}
              ></div>
            </div>
            
            <div className="flex justify-between items-center mb-6">
              <div className="text-sm font-medium text-[var(--text-color)]">
                Question {currentQuestion + 1} of {totalQuestions}
              </div>
              <div className="text-sm font-mono text-[var(--text-color)] bg-[var(--option-bg)] px-3 py-1 rounded-full">
                {formatTime(timer)}
              </div>
            </div>
            
            <h2 className="text-xl font-bold mb-6 text-[var(--question-text)]">
              {question}
            </h2>
            
            <div className="space-y-3">
              {options.map((option, index) => (
                <div
                  key={index}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all
                    ${selectedOption === index 
                      ? 'bg-[var(--option-selected-bg)] text-white border-[var(--purple-primary)] shadow-[4px_4px_0px_0px_var(--purple-primary)]' 
                      : 'bg-[var(--option-bg)] text-[var(--question-text)] border-[var(--card-border)] hover:bg-[var(--option-hover-bg)] hover:shadow-[4px_4px_0px_0px_var(--card-shadow)] hover:-translate-y-1'}`}
                  onClick={() => onSelectOption(index)}
                >
                  {option}
                </div>
              ))}
            </div>
            
            {explanation && selectedOption !== null && (
              <div className="mt-6 p-4 bg-[var(--option-bg)] border-2 border-[var(--card-border)] rounded-lg shadow-[3px_3px_0px_0px_var(--card-shadow)]">
                <p className="text-[var(--text-color)]">{explanation}</p>
              </div>
            )}
            
            <div className="flex justify-center mt-8">
              <button
                className="px-6 py-3 bg-[var(--purple-primary)] text-white font-medium rounded-lg shadow-[4px_4px_0px_0px_var(--card-shadow)] hover:shadow-[5px_5px_0px_0px_var(--card-shadow)] hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-[4px_4px_0px_0px_var(--card-shadow)]"
                onClick={onNextQuestion}
                disabled={selectedOption === null}
              >
                Next Question
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 