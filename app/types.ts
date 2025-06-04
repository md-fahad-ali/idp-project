export interface LeaderboardEntry {
  _id: string;
  firstName: string;
  lastName: string;
  email?: string;
  avatarUrl?: string;
  points: number;
  testsCompleted: number;
  averageScore: number;
  averageTimeSpent?: number;
  isActive?: boolean;
}

export interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role?: string;
  avatarUrl?: string;
  points?: number;
  testsCompleted?: number;
  averageScore?: number;
  averageTimeSpent?: number;
} 