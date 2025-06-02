import express from "express";
import Course from "../models/Course";

const router = express.Router();

// Public route to get all courses with pagination
router.get("/", async (req, res): Promise<void> => {
  try {
    const { title, category, page = 1, limit = 9 } = req.query;
    
    // Convert pagination parameters to numbers
    const pageNum = parseInt(String(page), 10);
    const limitNum = parseInt(String(limit), 10);
    
    // Validate pagination parameters
    if (isNaN(pageNum) || pageNum < 1) {
      res.status(400).json({ 
        error: 'Invalid page number',
        success: false
      });
      return;
    }
    
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 50) {
      res.status(400).json({ 
        error: 'Invalid limit (must be between 1 and 50)',
        success: false
      });
      return;
    }
    
    // Build query based on parameters
    let query: any = {};
    if (title) query.title = { $regex: String(title), $options: 'i' }; // Case-insensitive search
    if (category) query.category = String(category);
    
    // Calculate skip value for pagination
    const skip = (pageNum - 1) * limitNum;
    
    // Get total count for pagination info
    const totalCourses = await Course.countDocuments(query);
    
    // Find courses with pagination
    const courses = await Course.find(query)
      .populate('user', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCourses / limitNum);
    
    res.status(200).json({ 
      courses,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalItems: totalCourses,
        itemsPerPage: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1
      },
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