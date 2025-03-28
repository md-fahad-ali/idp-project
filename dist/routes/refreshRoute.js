"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const dotenv_1 = require("dotenv");
(0, dotenv_1.configDotenv)();
const router = express_1.default.Router();
router.post("/", async (req, res) => {
    const refreshToken = req.cookies.refresh_token;
    if (!refreshToken) {
        res.status(401).json({ message: "Unauthorized - Invalid token" });
    }
    try {
        const decodedRefreshToken = jsonwebtoken_1.default.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        const user = await User_1.default.findById(decodedRefreshToken._id);
        if (!user) {
            res.status(404).json({ message: "User not found" });
        }
        const newToken = jsonwebtoken_1.default.sign({ _id: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: "10m" });
        res.cookie("access_token", newToken, { httpOnly: true, secure: true, sameSite: "strict" });
        res.status(200).json({ message: "Token refreshed successfully" });
    }
    catch (error) {
        console.error("Refresh token error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});
exports.default = router;
