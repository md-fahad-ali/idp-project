import { Router, Request, Response } from 'express';
import { authenticateJWT } from '../lib/authMiddleware';
import UserActivity from '../models/UserActivity';
import mongoose from 'mongoose';

const router = Router();

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
    console.log('Received activity update request:', {
      body: req.body,
      headers: req.headers['content-type']
    });

    const { userId } = req.body;
    
    if (!userId) {
      console.log('Missing userId in request body');
      res.status(400).json({ error: 'userId is required' });
      return;
    }

    // Convert string ID to ObjectId if needed
    const userObjectId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;

    console.log('Updating activity for user:', userObjectId);

    await UserActivity.findOneAndUpdate(
      { userId: userObjectId },
      {
        userId: userObjectId,
        isActive: true,
        lastActive: new Date()
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