import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IUser extends Document {
  _id: Types.ObjectId;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  password: string;
  role: 'user' | 'admin';
  points: number;
  testsCompleted?: number;
  averageScore?: number;
}

const UserSchema: Schema = new Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], required: true },
  points: { type: Number, default: 0 },
  testsCompleted: { type: Number, default: 0 },
  averageScore: { type: Number, default: 0 }
});

const User = mongoose.model<IUser>('User', UserSchema);

export default User;
