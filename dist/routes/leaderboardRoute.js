"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../lib/authMiddleware");
const User_1 = __importDefault(require("../models/User"));
const router = (0, express_1.Router)();
// Get global leaderboard
router.get('/', authMiddleware_1.authenticateJWT, async (req, res) => {
    try {
        const users = await User_1.default.aggregate([
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
                    totalScore: { $sum: '$testResults.score' },
                    points: { $sum: '$testResults.points' },
                    averageScore: {
                        $cond: [
                            { $gt: [{ $size: '$testResults' }, 0] },
                            { $avg: '$testResults.score' },
                            0
                        ]
                    },
                    // Calculate average time spent on tests (in seconds)
                    averageTimeSpent: {
                        $cond: [
                            { $gt: [{ $size: '$testResults' }, 0] },
                            { $avg: '$testResults.timeSpent' },
                            Number.MAX_SAFE_INTEGER // Default high value for users with no tests
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
                    averageTimeSpent: 1
                }
            },
            {
                // Sort by points (descending) first, then by average time spent (ascending)
                $sort: {
                    points: -1,
                    averageTimeSpent: 1
                }
            }
        ]);
        // Filter users who have points > 0
        const usersWithPoints = users.filter(user => user.points > 0);
        const hasPassedUsers = usersWithPoints.length > 0;
        // If only one user has passed, return only that user
        const response = {
            users: hasPassedUsers ? usersWithPoints : [],
            hasPassedUsers,
            hasMultipleUsers: usersWithPoints.length > 1
        };
        res.json(response);
    }
    catch (error) {
        console.error('Error fetching leaderboard:', error);
        res.status(500).json({ message: 'Error fetching leaderboard data' });
    }
});
// Get course-specific leaderboard
router.get('/course/:courseId', authMiddleware_1.authenticateJWT, async (req, res) => {
    try {
        const { courseId } = req.params;
        const users = await User_1.default.aggregate([
            {
                $lookup: {
                    from: 'testresults',
                    let: { userId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$userId', '$$userId'] },
                                        { $eq: ['$courseId', courseId] }
                                    ]
                                }
                            }
                        }
                    ],
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
                    },
                    // Calculate average time spent on tests (in seconds)
                    averageTimeSpent: {
                        $cond: [
                            { $gt: [{ $size: '$testResults' }, 0] },
                            { $avg: '$testResults.timeSpent' },
                            Number.MAX_SAFE_INTEGER // Default high value for users with no tests
                        ]
                    }
                }
            },
            {
                $match: {
                    testsCompleted: { $gt: 0 } // Only include users who have taken tests in this course
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
                    averageTimeSpent: 1
                }
            },
            {
                // Sort by points (descending) first, then by average time spent (ascending)
                $sort: {
                    points: -1,
                    averageTimeSpent: 1
                }
            }
        ]);
        // Filter users who have points > 0
        const usersWithPoints = users.filter(user => user.points > 0);
        const hasPassedUsers = usersWithPoints.length > 0;
        // If only one user has passed, return only that user
        const response = {
            users: hasPassedUsers ? usersWithPoints : [],
            hasPassedUsers,
            hasMultipleUsers: usersWithPoints.length > 1
        };
        res.json(response);
    }
    catch (error) {
        console.error('Error fetching course leaderboard:', error);
        res.status(500).json({ message: 'Error fetching course leaderboard data' });
    }
});
exports.default = router;
