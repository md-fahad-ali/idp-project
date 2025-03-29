import { Router, Request, Response } from 'express';
import { authenticateJWT } from '../lib/authMiddleware';
import User from '../models/User';
import TestResult from '../models/TestResult';
import mongoose from 'mongoose';

// Define the User type from the request
declare global {
  namespace Express {
    interface User {
      _id: string;
      email: string;
    }
  }
}

const router = Router();

// Get current user data with points and test results
router.get('/me', authenticateJWT, (req: Request, res: Response) => {
  const userId = req.user?._id;
  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  User.aggregate([
    {
      $match: { _id: new mongoose.Types.ObjectId(userId) }
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

export default router; 