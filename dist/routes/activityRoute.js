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
// Helper function to get current date in YYYY-MM-DD format
const getCurrentDateString = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};
// Get user activity for streaks
router.get('/user-activity', authMiddleware_1.authenticateJWT, async (req, res) => {
    try {
        const userId = req.user?._id;
        if (!userId) {
            res.status(401).json({ error: 'Unauthorized: User ID is missing' });
            return;
        }
        // Get activity for the last 14 days (2 weeks)
        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
        const userActivity = await UserActivity_1.default.findOne({
            userId
        })
            .lean();
        if (!userActivity) {
            res.json({
                userId,
                activities: [],
                totalDays: 0
            });
            return;
        }
        // Format the activities for the client
        const activities = userActivity.activities?.map(activity => ({
            timestamp: activity.timestamp,
            date: activity.date
        })) || [];
        const dateActivities = {};
        activities.forEach(activity => {
            if (!dateActivities[activity.date] || new Date(activity.timestamp) > new Date(dateActivities[activity.date].timestamp)) {
                dateActivities[activity.date] = activity;
            }
        });
        const uniqueActivities = Object.values(dateActivities);
        res.json({
            userId,
            activities: uniqueActivities,
            totalDays: uniqueActivities.length
        });
    }
    catch (error) {
        console.error('Error fetching user activity:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
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
        const { userId } = req.body;
        if (!userId) {
            console.log('Missing userId in request body');
            res.status(400).json({ error: 'userId is required' });
            return;
        }
        // Convert string ID to ObjectId if needed
        const userObjectId = typeof userId === 'string' ? new mongoose_1.default.Types.ObjectId(userId) : userId;
        // Get current date in YYYY-MM-DD format
        const today = getCurrentDateString();
        const now = new Date();
        // Update user activity document with today's date in the activities array
        await UserActivity_1.default.findOneAndUpdate({ userId: userObjectId }, {
            $set: {
                userId: userObjectId,
                isActive: true,
                lastActive: now,
            },
            $push: {
                activities: {
                    $each: [{
                            date: today,
                            timestamp: now,
                            action: 'login'
                        }],
                    $position: 0
                }
            }
        }, { upsert: true });
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error updating activity:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
