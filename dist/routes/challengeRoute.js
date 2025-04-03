"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = __importDefault(require("../lib/authMiddleware"));
const uuid_1 = require("uuid");
const User_1 = __importDefault(require("../models/User"));
const Course_1 = __importDefault(require("../models/Course"));
const TestResult_1 = __importDefault(require("../models/TestResult"));
const router = (0, express_1.Router)();
// Get info about a challenge room
router.get('/room/:roomId', authMiddleware_1.default.authenticate('jwt', { session: false }), (req, res) => {
    try {
        const { roomId } = req.params;
        // Check if this room exists in the server's memory
        // This would need to be coordinated with the socket.io implementation
        // For now, we'll return a 404 as rooms are managed in memory
        res.status(404).json({
            success: false,
            message: 'Challenge room not found or no longer active'
        });
    }
    catch (error) {
        console.error('Error getting challenge room:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});
// Get challenge history for a user
router.get('/history', authMiddleware_1.default.authenticate('jwt', { session: false }), async (req, res) => {
    try {
        const userId = req.user?._id;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'Unauthorized'
            });
            return;
        }
        // Get all challenge results for this user
        const results = await TestResult_1.default.find({
            userId,
            isChallenge: true
        })
            .sort({ completedAt: -1 })
            .populate('opponentId', 'firstName lastName avatarUrl');
        res.status(200).json({
            success: true,
            challenges: results
        });
    }
    catch (error) {
        console.error('Error getting challenge history:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});
// Get or create challenge room by user IDs and course ID
router.post('/room', authMiddleware_1.default.authenticate('jwt', { session: false }), async (req, res) => {
    try {
        const { challengerId, challengedId, courseId } = req.body;
        const userId = req.user?._id;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'Unauthorized'
            });
            return;
        }
        // Ensure the requesting user is either the challenger or challenged
        if (userId.toString() !== challengerId && userId.toString() !== challengedId) {
            res.status(403).json({
                success: false,
                message: 'Forbidden'
            });
            return;
        }
        // Verify both users exist and get course
        const [challenger, challenged, course] = await Promise.all([
            User_1.default.findById(challengerId),
            User_1.default.findById(challengedId),
            Course_1.default.findById(courseId)
        ]);
        if (!challenger || !challenged || !course) {
            res.status(404).json({
                success: false,
                message: 'User or course not found'
            });
            return;
        }
        // Generate a unique room ID that can be used by the socket.io server
        const roomId = (0, uuid_1.v4)();
        // Return room details (would be stored in memory on the socket.io side)
        res.status(200).json({
            success: true,
            room: {
                roomId,
                challengerId: challenger._id.toString(),
                challengerName: `${challenger.firstName} ${challenger.lastName}`,
                challengedId: challenged._id.toString(),
                challengedName: `${challenged.firstName} ${challenged.lastName}`,
                courseId: String(course._id),
                courseName: course.title,
                status: 'pending'
            }
        });
    }
    catch (error) {
        console.error('Error creating challenge room:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});
exports.default = router;
