"use client";

import { useState } from 'react';
import QuizQuestion from './QuizQuestion';

interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
}

export default function ThemeQuiz() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  
  // Sample questions data
  const questions: QuizQuestion[] = [
    {
      id: 1,
      question: "What is the basic structure of an HTML document?",
      options: [
        "HTML, head, body",
        "HTML, body, head",
        "Head, HTML, body",
        "HTML, head, body, script"
      ],
      correctAnswer: 0,
      explanation: "The basic structure of an HTML document consists of the HTML tag, which contains the head and body tags. The head tag contains metadata, while the body tag contains the content of the HTML document.",
      difficulty: 'MEDIUM'
    },
    {
      id: 2,
      question: "Which CSS property is used to change text color?",
      options: [
        "text-color",
        "font-color",
        "color",
        "text-style"
      ],
      correctAnswer: 2,
      explanation: "The 'color' property in CSS is used to change the text color of elements.",
      difficulty: 'EASY'
    },
    {
      id: 3,
      question: "What does the 'margin: 0 auto' CSS rule do?",
      options: [
        "Centers an element horizontally",
        "Removes all margins",
        "Creates equal margins on all sides",
        "Automatically adjusts margins"
      ],
      correctAnswer: 0,
      explanation: "Setting 'margin: 0 auto' centers an element horizontally by setting the top and bottom margins to 0 and the left and right margins to auto.",
      difficulty: 'MEDIUM'
    },
    {
      id: 4,
      question: "Which JavaScript method adds an element to the end of an array?",
      options: [
        "append()",
        "push()",
        "add()",
        "insert()"
      ],
      correctAnswer: 1,
      explanation: "The push() method adds one or more elements to the end of an array and returns the new length of the array.",
      difficulty: 'EASY'
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
    }
  };
  
  return (
    <QuizQuestion
      currentQuestion={currentQuestion}
      totalQuestions={questions.length}
      question={questions[currentQuestion].question}
      options={questions[currentQuestion].options}
      difficulty={questions[currentQuestion].difficulty}
      onSelectOption={handleOptionSelect}
      selectedOption={selectedOption}
      explanation={selectedOption !== null ? questions[currentQuestion].explanation : undefined}
      onNextQuestion={handleNextQuestion}
    />
  );
} 