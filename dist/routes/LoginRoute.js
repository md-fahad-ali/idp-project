"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = require("dotenv");
const User_1 = __importDefault(require("../models/User"));
const generateToken_1 = require("../lib/generateToken");
(0, dotenv_1.configDotenv)();
if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined in environment variables');
}
const router = express_1.default.Router();
router.post("/", async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User_1.default.findOne({ email });
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
        const token = (0, generateToken_1.generateToken)(user._id, user.email);
        const refreshToken = (0, generateToken_1.generateToken)(user._id, user.email, true);
        // Set tokens in cookie
        res.cookie("access_token", token, { httpOnly: true, secure: true, sameSite: "strict" });
        res.cookie("refresh_token", refreshToken, { httpOnly: true, secure: true, sameSite: "strict" });
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
    }
    catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});
exports.default = router;
