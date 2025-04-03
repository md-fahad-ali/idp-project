import { Router, Request, Response } from 'express';
import { authenticateJWT } from '../lib/authMiddleware';
import User from '../models/User';
import mongoose from 'mongoose';

const router = Router();

// Get all users except admins and current user
router.get('/', authenticateJWT, async (req: Request, res: Response):Promise<void> => {
  const currentUserId = req.user?._id;
  
  if (!currentUserId) {
    res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const users = await User.aggregate([
      {
        $match: {
          $and: [
            { _id: { $ne: new mongoose.Types.ObjectId(currentUserId) } },
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
  } catch (error) {
    console.error('Error fetching friends:', error);
    res.status(500).json({ message: 'Error fetching friends' });
  }
});

export default router; 