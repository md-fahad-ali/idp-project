import { Router } from 'express';
import { authenticateJWT } from '../lib/authMiddleware';
import User from '../models/User';
import UserActivity from '../models/UserActivity';

const router = Router();

// Get global leaderboard
router.get('/', authenticateJWT, async (req, res) => {
  try {
    const users = await User.aggregate([
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
    const activeUsers = await UserActivity.find(
      { isActive: true },
      { userId: 1 }
    );
    
    const activeUserIds = activeUsers.map(user => user.userId.toString());
    
    // Add activity status to users
    const usersWithActivity = usersWithPoints.map(user => ({
      ...user,
      isActive: activeUserIds.includes(user._id.toString())
    }));

    res.json({
      users: usersWithActivity,
      hasPassedUsers: usersWithActivity.length > 0,
      hasMultipleUsers: usersWithActivity.length > 1,
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ message: 'Error fetching leaderboard' });
  }
});

// Get course-specific leaderboard
router.get('/course/:courseId', authenticateJWT, async (req, res) => {
  try {
    const { courseId } = req.params;

    const users = await User.aggregate([
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
    const activeUsers = await UserActivity.find(
      { isActive: true },
      { userId: 1 }
    );
    
    const activeUserIds = activeUsers.map(user => user.userId.toString());
    
    // Add activity status to users
    const usersWithActivity = usersWithPoints.map(user => ({
      ...user,
      isActive: activeUserIds.includes(user._id.toString())
    }));

    res.json({
      users: usersWithActivity,
      hasPassedUsers: usersWithActivity.length > 0,
      hasMultipleUsers: usersWithActivity.length > 1,
    });
  } catch (error) {
    console.error('Error fetching course leaderboard:', error);
    res.status(500).json({ message: 'Error fetching course leaderboard' });
  }
});

export default router; 