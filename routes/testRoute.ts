import { Router, Request, Response } from 'express';
import { authenticateJWT } from '../lib/authMiddleware';
import TestResult from '../models/TestResult';
import User from '../models/User';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';

// Define the JWT payload interface
interface JwtPayload {
  _id: string;
  email: string;
}

const router = Router();

// Submit test results
router.post('/submit', async (req: Request, res: Response): Promise<void> => {
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
    const testResult = new TestResult({
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
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $inc: {
          points: points,
          testsCompleted: 1
        }
      },
      { new: true }
    );
    
    console.log('User updated:', updatedUser?._id);

    res.status(201).json({
      message: 'Test result saved successfully',
      testResult,
      pointsEarned: points
    });
    return;
  } catch (error) {
    console.error('Error saving test result:', error);
    res.status(500).json({ message: 'Error saving test result', error: (error as Error).message });
    return;
  }
});

export default router; 