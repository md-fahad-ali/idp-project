import express, { Request, Response, NextFunction } from "express";
import User from "../models/User";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import passport from "../lib/passport";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || '';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || '';

// Route to display login page
router.get("/", (req: Request, res: Response) => {
  res.json({ msg: "Login Page" });
});

// Login route
router.post("/", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      res.status(401).json({ msg: "Invalid email or password" });
    }

    // Verify password (assuming passwords are hashed)
    // Note: In a real application, you should use bcrypt.compare() to check hashed passwords
    // For demonstration, we're doing a direct comparison
    
    if (user?.password !== password) {
      res.status(401).json({ msg: "Invalid email or password" });
    }
    
    // Generate JWT token
    const payload = { email: user?.email, jti: crypto.randomUUID() };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "10m", algorithm: "HS256" });
    const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: "7d", algorithm: "HS256" });

    // Set cookies
    res.cookie("access_token", token, { httpOnly: true, secure: true, sameSite: "strict" });
    res.cookie("refresh_token", refreshToken, { httpOnly: true, secure: true, sameSite: "strict" });

    // Return success response
    res.status(200).json({ 
      msg: "Login successful", 
      user,
      token,
      refreshToken
    });
  } catch (error) {
    res.status(500).json({ msg: "Error during login", error });
  }
});

router.post('/save-token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.body;
    
    // Save token to database
    await User.updateOne({ email: (req.user as { email: string }).email }, { $set: { token } });
    
    res.status(200).json({ msg: "Token saved successfully" });
  } catch (error) {
    res.status(500).json({ msg: "Error saving token", error });
  }
});

// Protected route example
router.get("/profile", 
  passport.authenticate('jwt', { session: false }) as express.RequestHandler, 
  (req: Request, res: Response) => {
    res.json({ 
      msg: "Protected profile route", 
      user: req.user 
    });
  }
);

// Token refresh endpoint
router.post("/refresh-token", async (req: Request, res: Response) => {
  try {
    // Get refresh token from cookies or request body
    const refreshToken = req.cookies.refresh_token || req.body.refresh_token;
    
    if (!refreshToken) {
      res.status(401).json({ msg: "Refresh token not provided" });
    }
    
    // Verify refresh token
    try {
      const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as { email: string, jti: string };
      
      // Find user by email
      const user = await User.findOne({ email: decoded.email });
      
      if (!user) {
         res.status(401).json({ msg: "User not found" });
      }
      
      // Generate new tokens
      const payload = { email: user?.email, jti: crypto.randomUUID() };
      const newAccessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: "10m", algorithm: "HS256" });
      const newRefreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: "7d", algorithm: "HS256" });
      
      // Set new cookies
      res.cookie("access_token", newAccessToken, { httpOnly: true, secure: true, sameSite: "strict" });
      res.cookie("refresh_token", newRefreshToken, { httpOnly: true, secure: true, sameSite: "strict" });
      
      //  new tokens
       res.status(200).json({
        msg: "Token refreshed successfully",
        token: newAccessToken,
        refreshToken: newRefreshToken
      });
    } catch (error) {
       res.status(401).json({ msg: "Invalid refresh token", error });
    }
  } catch (error) {
    res.status(500).json({ msg: "Error refreshing token", error });
  }
});

export default router;
