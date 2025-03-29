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
// Get current user data with points and test results
router.get('/me', authMiddleware_1.authenticateJWT, (req, res) => {
    const userId = req.user?._id;
    if (!userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
    }
    User_1.default.aggregate([
        {
            $match: { _id: new mongoose_1.default.Types.ObjectId(userId) }
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
                averageScore: 1,
                role: 1
            }
        }
    ])
        .then(users => {
        if (!users || users.length === 0) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        res.json(users[0]);
    })
        .catch(error => {
        console.error('Error fetching user data:', error);
        res.status(500).json({ message: 'Error fetching user data' });
    });
});
exports.default = router;
