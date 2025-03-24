import express, { Request, Response } from "express";
import User from "../models/User";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import passport from "passport";
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";


const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString("hex");
const JWT_REFRESH_SECRET = crypto.randomBytes(32).toString("hex");

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

router.post("/", async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, username, email, password, role } = req.body;
    const newUser = new User({ firstName, lastName, username, email, password, role });
    await newUser.save();

    const payload = { _id: newUser._id, email: newUser.email };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "10m", algorithm: "HS256" });
    const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: "7d", algorithm: "HS256" });

    res.cookie("access_token", token, { httpOnly: true, secure: true, sameSite: "strict" });
    res.cookie("refresh_token", refreshToken, { httpOnly: true, secure: true, sameSite: "strict" });

    res.status(201).json({ msg: "User created successfully and data has been saved", user: newUser, token, refreshToken });
  } catch (error) {
    res.status(500).json({ msg: "Error creating user", error });
  }
});

export default router;
