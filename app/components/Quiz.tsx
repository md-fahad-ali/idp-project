"use client";

import { useState, useEffect } from 'react';
import { useTheme } from '../provider/theme-provider';
import { Moon, Sun } from 'lucide-react';
import '../course/code-styles.css';

interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
}

export default function Quiz() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [timer, setTimer] = useState(0);
  const { theme, toggleTheme, mounted } = useTheme();
  
  // Mock questions data
  const questions: QuizQuestion[] = [
    {
      id: 1,
      question: "What is the purpose of the <title> tag in the given HTML code?",
      options: [
        "To display a paragraph of text",
        "To define the title of the HTML page",
        "To link an external stylesheet",
        "To define the body of the HTML document"
      ],
      correctAnswer: 1,
      difficulty: 'EASY'
    },
    {
      id: 2,
      question: "Which HTML tag is used to create a hyperlink?",
      options: [
        "<link>",
        "<a>",
        "<href>",
        "<url>"
      ],
      correctAnswer: 1,
      difficulty: 'EASY'
    },
    {
      id: 3,
      question: "What does CSS stand for?",
      options: [
        "Computer Style Sheets",
        "Creative Style System",
        "Cascading Style Sheets",
        "Colorful Style Sheets"
      ],
      correctAnswer: 2,
      difficulty: 'EASY'
    },
    {
      id: 4,
      question: "Which property is used to change the background color in CSS?",
      options: [
        "color",
        "bgcolor",
        "background-color",
        "bg-color"
      ],
      correctAnswer: 2,
      difficulty: 'MEDIUM'
    }
  ];
  
  // Handle option selection
  const handleOptionSelect = (index: number) => {
    setSelectedOption(index);
  };
  
  // Handle next question
  const handleNextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedOption(null);
      setTimer(0);
    }
  };
  
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
        <header className="flex justify-between items-center mb-8 p-4 border-2 border-[var(--card-border)] rounded-lg bg-[var(--card-bg)] shadow-[4px_4px_0px_0px_var(--card-shadow)]">
          <h1 className="text-2xl font-bold text-[var(--text-color)]">SkillStreet</h1>
          <div className="flex items-center space-x-4">
            {mounted && (
              <span className="text-[var(--text-color)] bg-[var(--purple-light)] px-3 py-1 rounded-full text-sm font-medium">
                {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
              </span>
            )}
            <nav className="hidden md:flex space-x-6">
              <a href="#" className="text-[var(--text-color)] hover:text-[var(--purple-primary)]">Home</a>
              <a href="#" className="text-[var(--text-color)] hover:text-[var(--purple-primary)]">About</a>
              <a href="#" className="text-[var(--text-color)] hover:text-[var(--purple-primary)]">Services</a>
              <a href="#" className="text-[var(--text-color)] hover:text-[var(--purple-primary)]">Courses</a>
            </nav>
            
            {/* Theme toggle button - only render when mounted */}
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
          </div>
        </header>
        
        {/* Quiz container */}
        <div className="max-w-3xl mx-auto w-full">
          <div className="bg-[var(--quiz-container-bg)] border-2 border-[var(--card-border)] rounded-lg p-6 shadow-[6px_6px_0px_0px_var(--card-shadow)] relative">
            <div className="absolute right-6 top-6 px-3 py-1 rounded-full bg-[var(--purple-primary)] text-white text-sm font-medium">
              {questions[currentQuestion].difficulty}
            </div>
            
            <div className="h-2 bg-[var(--option-bg)] rounded-full mb-6 overflow-hidden">
              <div 
                className="h-full bg-[var(--purple-primary)] rounded-full transition-all duration-300" 
                style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
              ></div>
            </div>
            
            <div className="flex justify-between items-center mb-4">
              <div className="text-sm font-medium text-[var(--text-color)]">
                Question {currentQuestion + 1} of {questions.length}
              </div>
              <div className="text-sm font-mono text-[var(--text-color)] bg-[var(--option-bg)] px-3 py-1 rounded-full">
                {formatTime(timer)}
              </div>
            </div>
            
            <h2 className="text-xl font-bold mb-6 text-[var(--question-text)]">
              {questions[currentQuestion].question}
            </h2>
            
            <div className="space-y-3">
              {questions[currentQuestion].options.map((option, index) => (
                <div
                  key={index}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all
                    ${selectedOption === index 
                      ? 'bg-[var(--option-selected-bg)] text-white border-[var(--purple-primary)] shadow-[4px_4px_0px_0px_var(--purple-primary)]' 
                      : 'bg-[var(--option-bg)] text-[var(--question-text)] border-[var(--card-border)] hover:bg-[var(--option-hover-bg)] hover:shadow-[4px_4px_0px_0px_var(--card-shadow)] hover:-translate-y-1'}`}
                  onClick={() => handleOptionSelect(index)}
                >
                  {option}
                </div>
              ))}
            </div>
            
            <div className="flex justify-center mt-8">
              <button
                className="px-6 py-3 bg-[var(--purple-primary)] text-white font-medium rounded-lg shadow-[4px_4px_0px_0px_var(--card-shadow)] hover:shadow-[5px_5px_0px_0px_var(--card-shadow)] hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-[4px_4px_0px_0px_var(--card-shadow)]"
                onClick={handleNextQuestion}
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