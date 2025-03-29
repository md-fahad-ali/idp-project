import { configDotenv } from "dotenv";
import jwt from "jsonwebtoken";
import { Types } from 'mongoose';

configDotenv();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined in environment variables");
}

if (!JWT_REFRESH_SECRET) {
  throw new Error("JWT_REFRESH_SECRET is not defined in environment variables");
}

export const generateToken = (_id: string | Types.ObjectId, email: string, isRefreshToken = false) => {
  const userId = typeof _id === 'string' ? _id : _id.toString();
  const expiresIn = isRefreshToken ? "30d" : "10s";
  return jwt.sign({ _id: userId, email }, isRefreshToken ? JWT_REFRESH_SECRET : JWT_SECRET, { expiresIn });
};
