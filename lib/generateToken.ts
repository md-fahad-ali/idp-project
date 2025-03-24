import { configDotenv } from "dotenv";
import jwt from "jsonwebtoken";
configDotenv();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined in environment variables");
}

if (!JWT_REFRESH_SECRET) {
  throw new Error("JWT_REFRESH_SECRET is not defined in environment variables");
}

export const generateToken = (_id: string, email: string, isRefreshToken = false) => {
  const expiresIn = isRefreshToken ? "30d" : "10s";
  return jwt.sign({ _id, email }, isRefreshToken ? JWT_REFRESH_SECRET : JWT_SECRET, { expiresIn });
};
