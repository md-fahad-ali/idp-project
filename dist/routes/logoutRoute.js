"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = require("dotenv");
(0, dotenv_1.configDotenv)();
const router = express_1.default.Router();
router.post("/", async (req, res) => {
    try {
        // Clear the auth cookies
        res.clearCookie("access_token");
        res.clearCookie("refresh_token");
        res.status(200).json({
            success: true,
            message: "Logout successful",
        });
    }
    catch (error) {
        console.error("Logout Error:", error);
        res.status(500).json({
            success: false,
            message: "An error occurred during logout",
        });
    }
});
exports.default = router;
