"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const TestResult_1 = __importDefault(require("../models/TestResult"));
const User_1 = __importDefault(require("../models/User"));
const router = (0, express_1.Router)();
// Submit test results
router.post('/submit', async (req, res) => {
    try {
        console.log('Test submission received');
        console.log('Request body:', req.body);
        const { userId, courseId, score, totalQuestions, correctAnswers, timeSpent } = req.body;
        // Validate required fields
        if (!userId || !courseId || typeof score !== 'number' || !totalQuestions || !correctAnswers || !timeSpent) {
            console.error('Missing required fields:', {
                userId,
                courseId,
                score,
                totalQuestions,
                correctAnswers,
                timeSpent
            });
            res.status(400).json({ message: 'Missing required fields' });
            return;
        }
        // Calculate points based on score and time spent
        // Points formula: score * (1 + bonus for quick completion)
        // Bonus ranges from 0 to 0.5 based on time spent
        const maxTimeInSeconds = 300; // 5 minutes
        const timeBonus = Math.max(0, 0.5 * (1 - timeSpent / maxTimeInSeconds));
        const points = Math.round(score * (1 + timeBonus));
        console.log('Calculated points:', points);
        // Create new test result
        const testResult = new TestResult_1.default({
            userId,
            courseId,
            score,
            totalQuestions,
            correctAnswers,
            timeSpent,
            points
        });
        // Save test result
        await testResult.save();
        console.log('Test result saved:', testResult._id);
        // Update user's points and tests completed
        const updatedUser = await User_1.default.findByIdAndUpdate(userId, {
            $inc: {
                points: points,
                testsCompleted: 1
            }
        }, { new: true });
        console.log('User updated:', updatedUser?._id);
        res.status(201).json({
            message: 'Test result saved successfully',
            testResult,
            pointsEarned: points
        });
        return;
    }
    catch (error) {
        console.error('Error saving test result:', error);
        res.status(500).json({ message: 'Error saving test result', error: error.message });
        return;
    }
});
exports.default = router;
