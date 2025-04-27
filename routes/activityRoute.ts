import { Router, Request, Response } from 'express';
import { authenticateJWT } from '../lib/authMiddleware';
import UserActivity from '../models/UserActivity';
import mongoose from 'mongoose';

const router = Router();

// Helper function to get current date in YYYY-MM-DD format
const getCurrentDateString = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

// Get user activity for streaks
router.get('/user-activity', authenticateJWT, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized: User ID is missing' });
      return;
    }

    // Get activity for the last 14 days (2 weeks)
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const userActivity = await UserActivity.findOne({
      userId
    })
    .lean();

    if (!userActivity) {
      res.json({ 
        userId, 
        activities: [],
        totalDays: 0
      });
      return;
    }

    // Format the activities for the client
    const activities = userActivity.activities?.map(activity => ({
      timestamp: activity.timestamp,
      date: activity.date
    })) || [];

    // Deduplicate activities by date (taking the latest timestamp for each date)
    interface ActivityEntry {
      date: string;
      timestamp: Date;
    }

    const dateActivities: Record<string, ActivityEntry> = {};
    activities.forEach(activity => {
      if (!dateActivities[activity.date] || new Date(activity.timestamp) > new Date(dateActivities[activity.date].timestamp)) {
        dateActivities[activity.date] = activity;
      }
    });

    const uniqueActivities = Object.values(dateActivities);

    res.json({ 
      userId, 
      activities: uniqueActivities,
      totalDays: uniqueActivities.length
    });
  } catch (error) {
    console.error('Error fetching user activity:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get active users
router.get('/active', authenticateJWT, async (req: Request, res: Response): Promise<void> => {
  try {
    // Find users active in the last 30 seconds
    const thirtySecondsAgo = new Date(Date.now() - 30000);
    
    const activeUsers = await UserActivity.find({
      lastActive: { $gte: thirtySecondsAgo },
      isActive: true
    })
    .select('userId -_id') // Only select userId field
    .lean(); // Use lean for better performance
    
    res.json({
      activeUsers: activeUsers.map(user => user.userId)
    });
  } catch (error) {
    console.error('Error fetching active users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user activity
router.post('/update', authenticateJWT, async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      console.log('Missing userId in request body');
      res.status(400).json({ error: 'userId is required' });
      return;
    }

    // Convert string ID to ObjectId if needed
    const userObjectId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;
    
    // Get current date in YYYY-MM-DD format
    const today = getCurrentDateString();
    const now = new Date();

    // Update user activity document with today's date in the activities array
    await UserActivity.findOneAndUpdate(
      { userId: userObjectId },
      {
        $set: {
          userId: userObjectId,
          isActive: true,
          lastActive: now,
        },
        $push: {
          activities: {
            $each: [{
              date: today,
              timestamp: now,
              action: 'login'
            }],
            $position: 0
          }
        }
      },
      { upsert: true }
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating activity:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router; 