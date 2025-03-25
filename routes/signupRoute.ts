import express, { Request, Response } from "express";
import User from "../models/User";
import jwt from "jsonwebtoken";
import passport from "passport";
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import { configDotenv } from "dotenv";
configDotenv();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  throw new Error("JWT secrets must be defined in the environment variables.");
}

const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: JWT_SECRET,
};

interface JwtPayload {
  _id: string;
  email: string;
  iat: number;
  exp: number;
}

passport.use(
  new JwtStrategy(jwtOptions, (payload: JwtPayload, done) => {
    if (payload._id) {
      return done(null, { _id: payload._id, email: payload.email });
    }
    return done(null, false);
  })
);

const router = express.Router();

router.get("/", (req: Request, res: Response) => {
  res.json({ msg: "Signup Pages" });
});

router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const { firstName, lastName, username, email, password, role } = req.body;

    console.log("Received data:", req.body);

    // Check for duplicate username
    const existingUserByUsername = await User.findOne({ username });
    if (existingUserByUsername) {
      console.log("Username already exists");
      res.status(400).json({ msg: "Username already exists" });
      return;
    }

    // Check for duplicate email
    const existingUserByEmail = await User.findOne({ email });
    if (existingUserByEmail) {
      console.log("Email already exists");
      res.status(400).json({ msg: "Email already exists" });
      return;
    }

    const newUser = new User({
      firstName,
      lastName,
      username,
      email,
      password,
      role,
    });
    await newUser.save();

    const payload = { _id: newUser._id, email: newUser.email };
    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: "10m",
      algorithm: "HS256",
    });
    const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, {
      expiresIn: "7d",
      algorithm: "HS256",
    });

    res.cookie("access_token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
    });
    res.cookie("refresh_token", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
    });

    res.status(201).json({
      msg: "User created successfully and data has been saved",
      user: newUser,
      token,
      refreshToken,
    });
  } catch (error) {
    console.error("Error creating user:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ msg: "Error creating user", error: errorMessage });
  }
});

export default router;