import express, { Request, Response } from "express";
import { configDotenv } from "dotenv";
import User, { IUser } from "../models/User";
import UserActivity from "../models/UserActivity";
import { generateToken } from "../lib/generateToken";


configDotenv();

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined in environment variables');
}

const router = express.Router();

interface LoginRequest extends Request {
  body: {
    email: string;
    password: string;
  };
}

router.post("/", async (req: LoginRequest, res: Response): Promise<void> => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      res.status(401).json({ message: "Invalid email or password" });
      return;
    }

    // Simple password comparison without hashing
    if (user.password !== password) {
      res.status(401).json({ message: "Invalid email or password" });
      return;
    }

    // Generate tokens using ObjectId directly
    const token = generateToken(user._id, user.email);
    const refreshToken = generateToken(user._id, user.email, true);

    // Set tokens in cookie
    res.cookie("access_token", token, { httpOnly: true, secure: true, sameSite: "strict" });
    res.cookie("refresh_token", refreshToken, { httpOnly: true, secure: true, sameSite: "strict" });

    // Record user activity for streak tracking
    await UserActivity.findOneAndUpdate(
      { userId: user._id },
      {
        userId: user._id,
        isActive: true,
        lastActive: new Date()
      },
      { upsert: true }
    );

    // Convert user document to a plain object and handle ObjectId
    const userResponse = {
      id: user._id.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      points: user.points || 0,
      testsCompleted: user.testsCompleted || 0,
      averageScore: user.averageScore || 0
    };

    res.status(200).json({ 
      token, 
      message: "Login successful",
      user: userResponse
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
