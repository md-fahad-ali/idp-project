export interface ILesson {
  _id: string;
  title: string;
  content: string;
  courseId: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface ICourse {
  _id: string;
  title: string;
  category: string;
  description: string;
  lessons: ILesson[];
  createdAt: string;
  user?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    _id: string;
  };
}

export type QuestionDifficulty = 'easy' | 'medium' | 'hard';

export interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  difficulty: QuestionDifficulty;
  timeLimit: number; // Time limit in seconds
}

export interface TestData {
  questions: Question[];
}

export interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl?: string;
  totalScore: number;
  points: number;
  testsCompleted: number;
  averageScore: number;
  averageTimeSpent?: number;
  rank?: number;
  achievements?: Achievement[];
}

export interface Achievement {
  emoji: string;
  title: string;
  description: string;
}

export interface LeaderboardEntry {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl?: string;
  totalScore: number;
  points: number;
  testsCompleted: number;
  averageScore: number;
  averageTimeSpent?: number;
  rank?: number;
  activityDates?: string[];
  badges?: {
    brained?: number;    // For challenge winners
    warrior?: number;    // For tiebreaker winners who completed faster
    unbeatable?: number; // For users with best score in a course
  };
} 