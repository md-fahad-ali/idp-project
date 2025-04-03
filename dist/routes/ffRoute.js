"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../lib/authMiddleware");
const User_1 = __importDefault(require("../models/User"));
const mongoose_1 = __importDefault(require("mongoose"));
const router = (0, express_1.Router)();
// Get all users except admins and current user
router.get('/', authMiddleware_1.authenticateJWT, async (req, res) => {
    const currentUserId = req.user?._id;
    if (!currentUserId) {
        res.status(401).json({ message: 'Unauthorized' });
    }
    try {
        const users = await User_1.default.aggregate([
            {
                $match: {
                    $and: [
                        { _id: { $ne: new mongoose_1.default.Types.ObjectId(currentUserId) } },
                        { role: { $ne: 'admin' } },
                        { email: { $not: /admin/i } } // Exclude emails containing 'admin'
                    ]
                }
            },
            {
                $lookup: {
                    from: 'testresults',
                    localField: '_id',
                    foreignField: 'userId',
                    as: 'testResults'
                }
            },
            {
                $addFields: {
                    testsCompleted: { $size: '$testResults' },
                    points: { $sum: '$testResults.points' },
                    averageScore: {
                        $cond: [
                            { $gt: [{ $size: '$testResults' }, 0] },
                            { $avg: '$testResults.score' },
                            0
                        ]
                    }
                }
            },
            {
                $project: {
                    _id: 1,
                    firstName: 1,
                    lastName: 1,
                    email: 1,
                    avatarUrl: 1,
                    points: 1,
                    testsCompleted: 1,
                    averageScore: 1
                }
            },
            {
                $sort: {
                    points: -1,
                    testsCompleted: -1
                }
            }
        ]);
        res.json({ friends: users });
    }
    catch (error) {
        console.error('Error fetching friends:', error);
        res.status(500).json({ message: 'Error fetching friends' });
    }
});
exports.default = router;
