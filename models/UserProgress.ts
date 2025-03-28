import mongoose, { Schema, Document } from "mongoose";

interface IUserProgress extends Document {
  user: Schema.Types.ObjectId;
  completedCourses: {
    course: Schema.Types.ObjectId;
    completedAt: Date;
    pointsEarned: number;
  }[];
  totalPoints: number;
}

const UserProgressSchema = new Schema<IUserProgress>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    completedCourses: [
      {
        course: { type: Schema.Types.ObjectId, ref: "Course", required: true },
        completedAt: { type: Date, default: Date.now },
        pointsEarned: { type: Number, required: true },
      },
    ],
    totalPoints: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model<IUserProgress>("UserProgress", UserProgressSchema); 