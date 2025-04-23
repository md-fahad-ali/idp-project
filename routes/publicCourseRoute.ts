import express from "express";
import Course from "../models/Course";

const router = express.Router();

// Public route to get all courses without authentication
router.get("/", async (req, res): Promise<void> => {
  try {
    const { title, category } = req.query;
    
    // Build query based on parameters
    let query: any = {};
    if (title) query.title = String(title);
    if (category) query.category = String(category);
    
    // Find courses with the query and populate user information
    const courses = await Course.find(query)
      .populate('user', 'firstName lastName email')
      .sort({ createdAt: -1 }); // Sort by newest first
    
    res.status(200).json({ 
      courses,
      success: true
    });
  } catch (error) {
    console.error('Error fetching public courses:', error);
    res.status(500).json({
      error: 'Internal server error',
      success: false
    });
  }
});

export default router; 