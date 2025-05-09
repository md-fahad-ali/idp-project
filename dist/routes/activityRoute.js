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
// Get active users
router.get('/active', authMiddleware_1.authenticateJWT, async (req, res) => {
    try {
        // Find users active in the last 30 seconds
        const thirtySecondsAgo = new Date(Date.now() - 30000);
        const activeUsers = await UserActivity_1.default.find({
            lastActive: { $gte: thirtySecondsAgo },
            isActive: true
        })
            .select('userId -_id') // Only select userId field
            .lean(); // Use lean for better performance
        res.json({
            activeUsers: activeUsers.map(user => user.userId)
        });
    }
    catch (error) {
        console.error('Error fetching active users:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Update user activity
router.post('/update', authMiddleware_1.authenticateJWT, async (req, res) => {
    try {
        // console.log('Received activity update request:', {
        //   body: req.body,
        //   headers: req.headers['content-type']
        // });
        const { userId } = req.body;
        if (!userId) {
            console.log('Missing userId in request body');
            res.status(400).json({ error: 'userId is required' });
            return;
        }
        // Convert string ID to ObjectId if needed
        const userObjectId = typeof userId === 'string' ? new mongoose_1.default.Types.ObjectId(userId) : userId;
        // console.log('Updating activity for user:', userObjectId);
        await UserActivity_1.default.findOneAndUpdate({ userId: userObjectId }, {
            userId: userObjectId,
            isActive: true,
            lastActive: new Date()
        }, { upsert: true });
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error updating activity:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
