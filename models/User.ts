import mongoose, { Schema, Document } from 'mongoose';

interface IUser extends Document {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  password: string;
  role: 'user' | 'admin';
}

const UserSchema: Schema = new Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], required: true },
});

const User = mongoose.model<IUser>('User', UserSchema);

export default User;
