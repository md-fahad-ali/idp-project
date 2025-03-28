import mongoose, { Schema, Document } from "mongoose";

interface ILesson {
  title: string;
  content: string;
  points: number;
}

interface ICourse extends Document {
  title: string;
  category: string;
  description: string;
  lessons: ILesson[];
  user: mongoose.Schema.Types.ObjectId;
  createdAt?: Date; // Automatically added by timestamps
  updatedAt?: Date; // Automatically added by timestamps
}

const LessonSchema = new Schema<ILesson>({
  title: { type: String, required: true },
  content: { type: String, required: true },
  points: { type: Number, required: true },
});

const CourseSchema = new Schema<ICourse>(
  {
    title: { type: String, required: true },
    category: { type: String, required: true },
    description: { type: String, required: true },
    lessons: { type: [LessonSchema], required: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true } // Enable timestamps
);

export default mongoose.model<ICourse>("Course", CourseSchema);
