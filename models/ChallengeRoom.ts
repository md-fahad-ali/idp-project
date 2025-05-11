import mongoose, { Schema, Document } from 'mongoose';

// Define the schema for challenge room
const ChallengeRoomSchema = new Schema({
  roomId: { type: String, required: true, unique: true },
  challengerId: { type: String, required: true },
  challengerName: { type: String, required: true },
  challengedId: { type: String, required: true },
  challengedName: { type: String, required: true },
  courseId: { type: String, required: true },
  courseName: { type: String, required: true },
  questions: { type: Array, required: true },
  currentQuestionIndex: { type: Number, default: 0 },
  userScores: { type: Schema.Types.Mixed, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'active', 'completed'], 
    default: 'pending' 
  },
  createdAt: { type: Number, default: () => Date.now() }
});

// Define the interface
export interface IChallengeRoom extends Document {
  roomId: string;
  challengerId: string;
  challengerName: string;
  challengedId: string;
  challengedName: string;
  courseId: string;
  courseName: string;
  questions: any[];
  currentQuestionIndex: number;
  userScores: {
    [userId: string]: {
      score: number;
      timeSpent: number;
      answers: any[];
    };
  };
  status: 'pending' | 'active' | 'completed';
  createdAt: number;
}

// Check if model already exists to prevent overwriting
export default mongoose.models.ChallengeRoom || mongoose.model<IChallengeRoom>('ChallengeRoom', ChallengeRoomSchema); 