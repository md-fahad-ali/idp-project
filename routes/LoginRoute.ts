import express, { Request, Response } from "express";
import { configDotenv } from "dotenv";
import User from "../models/User";
import { generateToken } from "../lib/generateToken";

configDotenv();

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined in environment variables');
}

const JWT_SECRET = process.env.JWT_SECRET;

const router = express.Router();

interface LoginRequest extends Request {
  body: {
    email: string;
    password: string;
  };
}

router.post("/", async (req: LoginRequest, res: Response) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      res.status(401).json({ message: "Invalid email or password" });
    }

    // Simple password comparison without hashing
    if (user.password !== password) {
      res.status(401).json({ message: "Invalid email or password" });
    }

    // Generate token using the generateToken function
    const token = generateToken(user._id.toString(), user.email);

    // Generate refresh token
    const refreshToken = generateToken(user._id.toString(), user.email, true);

    // Set tokens in cookie
    res.cookie("access_token", token, { httpOnly: true, secure: true, sameSite: "strict" });
    res.cookie("refresh_token", refreshToken, { httpOnly: true, secure: true, sameSite: "strict" });

    res.status(200).json({ 
      token, 
      message: "Login successful",
      user: {
        id: user._id.toString() ,
        email: user.email
      }
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});



export default router;
