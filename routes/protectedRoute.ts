import express, { Request, Response } from "express";
import { authenticateJWT } from "../lib/authMiddleware";

const router = express.Router();

router.get("/", authenticateJWT, (req: Request, res: Response) => {
  console.log('Protected route handler reached');
  console.log('User:', req.user);
  res.json({ 
    message: "This is a protected route", 
    user: req.user,
    timestamp: new Date().toISOString()
  });
});

export default router;
