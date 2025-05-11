"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearLeaderboardCache = void 0;
const express_1 = require("express");
const authMiddleware_1 = require("../lib/authMiddleware");
const User_1 = __importDefault(require("../models/User"));
const UserActivity_1 = __importDefault(require("../models/UserActivity"));
const router = (0, express_1.Router)();
const leaderboardCache = new Map();
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes cache lifetime
// Helper function to get the last 7 days of dates
const getLast7Days = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        days.push(formattedDate);
    }
    return days;
};
// Get global leaderboard
router.get('/', authMiddleware_1.authenticateJWT, async (req, res) => {
    try {
        // Check cache first
        const cacheKey = 'global_leaderboard';
        const cachedData = leaderboardCache.get(cacheKey);
        if (cachedData && (Date.now() - cachedData.timestamp < CACHE_TTL)) {
            console.log('Serving global leaderboard from cache');
            res.set('Cache-Control', 'private, max-age=120');
            res.json(cachedData.data);
            return;
        }
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
        // Get active users
        const activeUsers = await UserActivity_1.default.find({ isActive: true }, { userId: 1 });
        const activeUserIds = activeUsers.map(user => user.userId.toString());
        // Get user activity for the last 7 days
        const last7Days = getLast7Days();
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        // Get all user activities in the last 7 days
        const userActivities = await UserActivity_1.default.find({ lastActive: { $gte: sevenDaysAgo } }, { userId: 1, 'activities.date': 1 });
        // Create a map of user IDs to activity dates
        const userActivityDates = {};
        userActivities.forEach(activity => {
            const userId = activity.userId.toString();
            userActivityDates[userId] = activity.activities?.map(act => act.date) || [];
        });
        // Add activity status and dates to users
        const usersWithActivity = usersWithPoints.map(user => ({
            ...user,
            isActive: activeUserIds.includes(user._id.toString()),
            activityDates: userActivityDates[user._id.toString()] || []
        }));
        const responseData = {
            users: usersWithActivity,
            hasPassedUsers: usersWithActivity.length > 0,
            hasMultipleUsers: usersWithActivity.length > 1,
        };
        // Store in cache
        leaderboardCache.set(cacheKey, {
            data: responseData,
            timestamp: Date.now()
        });
        // Set cache header
        res.set('Cache-Control', 'private, max-age=120');
        res.json(responseData);
    }
    catch (error) {
        console.error('Error fetching leaderboard:', error);
        res.status(500).json({ message: 'Error fetching leaderboard' });
    }
});
// Get course-specific leaderboard
router.get('/course/:courseId', authMiddleware_1.authenticateJWT, async (req, res) => {
    try {
        const { courseId } = req.params;
        // Check cache first
        const cacheKey = `course_leaderboard_${courseId}`;
        const cachedData = leaderboardCache.get(cacheKey);
        if (cachedData && (Date.now() - cachedData.timestamp < CACHE_TTL)) {
            console.log(`Serving course leaderboard from cache for course ${courseId}`);
            res.set('Cache-Control', 'private, max-age=120');
            res.json(cachedData.data);
            return;
        }
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
        // Get active users
        const activeUsers = await UserActivity_1.default.find({ isActive: true }, { userId: 1 });
        const activeUserIds = activeUsers.map(user => user.userId.toString());
        // Get user activity for the last 7 days
        const last7Days = getLast7Days();
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        // Get all user activities in the last 7 days
        const userActivities = await UserActivity_1.default.find({ lastActive: { $gte: sevenDaysAgo } }, { userId: 1, 'activities.date': 1 });
        // Create a map of user IDs to activity dates
        const userActivityDates = {};
        userActivities.forEach(activity => {
            const userId = activity.userId.toString();
            userActivityDates[userId] = activity.activities?.map(act => act.date) || [];
        });
        // Add activity status and dates to users
        const usersWithActivity = usersWithPoints.map(user => ({
            ...user,
            isActive: activeUserIds.includes(user._id.toString()),
            activityDates: userActivityDates[user._id.toString()] || []
        }));
        const responseData = {
            users: usersWithActivity,
            hasPassedUsers: usersWithActivity.length > 0,
            hasMultipleUsers: usersWithActivity.length > 1,
        };
        // Store in cache
        leaderboardCache.set(cacheKey, {
            data: responseData,
            timestamp: Date.now()
        });
        // Set cache header
        res.set('Cache-Control', 'private, max-age=120');
        res.json(responseData);
    }
    catch (error) {
        console.error('Error fetching course leaderboard:', error);
        res.status(500).json({ message: 'Error fetching course leaderboard' });
    }
});
// Helper function to clear leaderboard cache - to be used when test results are added
const clearLeaderboardCache = () => {
    leaderboardCache.clear();
    console.log('Leaderboard cache cleared');
};
exports.clearLeaderboardCache = clearLeaderboardCache;
exports.default = router;
