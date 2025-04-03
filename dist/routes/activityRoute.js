"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../lib/authMiddleware");
const UserActivity_1 = __importDefault(require("../models/UserActivity"));
const mongoose_1 = __importDefault(require("mongoose"));
const router = (0, express_1.Router)();
// Update user activity status (ping)
router.post('/ping', authMiddleware_1.authenticateJWT, async (req, res) => {
    try {
        const userId = req.user?._id;
        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        // Update or create activity record
        await UserActivity_1.default.findOneAndUpdate({ userId: new mongoose_1.default.Types.ObjectId(userId) }, {
            isActive: true,
            lastActive: new Date()
        }, { upsert: true, new: true });
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error updating activity status:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Get active users
router.get('/active', authMiddleware_1.authenticateJWT, async (req, res) => {
    try {
        const activeUsers = await UserActivity_1.default.find({ isActive: true }, { userId: 1, lastActive: 1 });
        res.json({
            activeUsers: activeUsers.map(user => user.userId.toString())
        });
    }
    catch (error) {
        console.error('Error fetching active users:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.default = router;
