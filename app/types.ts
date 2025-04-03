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