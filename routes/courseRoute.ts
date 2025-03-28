import express from "express";
import Course from "../models/Course";
import { authenticateJWT } from "../lib/authMiddleware";

// Define a type for req.user
interface AuthenticatedUser {
  _id: string;
  // Add other properties if needed
}
// import User from "../models/User"; // Assuming you have a User model
const router = express.Router();

// Route to save course data
router.post("/add", authenticateJWT, async (req, res): Promise<void> => {
  const userId = (req.user as AuthenticatedUser)?._id;

  try {
    const { title, category, description, lessons } = req.body;
    console.log(userId);
    if (!userId) {
      res.status(401).json({ error: "Unauthorized: User ID is missing" });
      return;
    }
    // Validate required fields
    if (!title || !category || !description || !lessons) {
      res.status(400).json({ error: "All fields are required" });
      return;
    }

    // Check if the course already exists
    const existingCourse = await Course.findOne({
      title,
      category,
      user: userId,
    });
    console.log("existingCourse", existingCourse);
    if (existingCourse) {
      res.status(409).json({
        error: "Course with the same title and category already exists",
      });
      return;
    }

    // Validate lessons array
    if (!Array.isArray(lessons) || lessons.length === 0) {
      res.status(400).json({ error: "Lessons must be a non-empty array" });
      return;
    }

    // Create a new course document
    const newCourse = new Course({
      title,
      category,
      description,
      lessons,
      user: userId, // Associate the course with the authenticated user
    });

    // Save the course to the database
    const savedCourse = await newCourse.save();

    res
      .status(201)
      .json({ message: "Course saved successfully", course: savedCourse });
  } catch (error) {
    console.error("Error saving course:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

//get params title and category

router.get("/get", authenticateJWT, async (req, res): Promise<void> => {
  const { title, category } = req.query; // Extract title and category from query parameters
  const userId = (req.user as AuthenticatedUser)?._id;
  if(title === undefined || category === undefined) {
    const courses = await Course.find();
    res.status(200).json({ courses: courses, user: req.user });
    
  }else{
    try {
      // Find courses by title and category, and ensure they belong to the authenticated user
      const courses = await Course.find({
        title: title,
        category,
        user: userId,
      }).populate("user", "firstName lastName email");
  
      res.status(200).json({ courses: courses, user: req.user });
    } catch (error) {
      console.error("Error fetching courses:", error);
      res.status(500).json({ error: "Internal server error" });
    }

  }
  
});

export default router;
