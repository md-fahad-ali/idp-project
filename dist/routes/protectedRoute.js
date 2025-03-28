"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = require("../lib/authMiddleware");
const router = express_1.default.Router();
router.get("/", authMiddleware_1.authenticateJWT, (req, res) => {
    console.log('Protected route handler reached');
    console.log('User:', req.user);
    res.json({
        message: "This is a protected route",
        user: req.user,
        timestamp: new Date().toISOString()
    });
});
exports.default = router;
