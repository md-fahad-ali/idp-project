import express, { Request, Response } from "express";
import jwt from "jsonwebtoken";
import User from "../models/User";
import { configDotenv } from "dotenv";

configDotenv();

const router = express.Router();

router.post("/", async (req: Request, res: Response) => {
  const refreshToken = req.cookies.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized - Invalid token" });
  }

  try {
    const decodedRefreshToken = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as jwt.JwtPayload;
    const user = await User.findById(decodedRefreshToken._id);
    if (!user) {
    res.status(404).json({ message: "User not found" });
    }

    const newToken = jwt.sign({ _id: (user as { _id: string })._id, email: (user as { email: string }).email }, process.env.JWT_SECRET!, { expiresIn: "10m" });
    res.cookie("access_token", newToken, { httpOnly: true, secure: true, sameSite: "strict" });
    res.status(200).json({ message: "Token refreshed successfully" });
  } catch (error) {
    console.error("Refresh token error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
