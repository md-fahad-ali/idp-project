import express, { Request, Response } from "express";
import { configDotenv } from "dotenv";

configDotenv();

const router = express.Router();

router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    // Clear the auth cookies
    res.clearCookie("access_token");
    res.clearCookie("refresh_token");

    res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    console.error("Logout Error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred during logout",
    });
  }
});

export default router; 