export interface ILesson {
  title: string;
  content: string;
  points: number;
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

export interface Question {
  timeLimit: number;
  difficulty: string;
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface TestData {
  questions: Question[];
} 