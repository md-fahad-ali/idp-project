import express from "express";
import Course from "../models/Course";
import { authenticateJWT } from "../lib/authMiddleware";
import UserProgress from "../models/UserProgress";
import User from "../models/User";
import mongoose from "mongoose";

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

router.put("/update/:id", authenticateJWT, async (req, res): Promise<void> => {
  const courseId = req.params.id;
  const userId = (req.user as AuthenticatedUser)?._id;
  const { title, category, description, lessons } = req.body;

  try {
    // Validate user authentication
    if (!userId) {
      res.status(401).json({ error: "Unauthorized: User ID is missing" });
      return;
    }

    // Validate required fields
    if (!title || !category || !description || !lessons) {
      res.status(400).json({ error: "All fields are required" });
      return;
    }

    // Validate lessons array
    if (!Array.isArray(lessons) || lessons.length === 0) {
      res.status(400).json({ error: "Lessons must be a non-empty array" });
      return;
    }

    // Check if course exists and belongs to user
    const existingCourse = await Course.findOne({
      _id: courseId,
      user: userId,
    });

    if (!existingCourse) {
      res.status(404).json({ error: "Course not found or you don't have permission to update it" });
      return;
    }

    // Update the course
    const updatedCourse = await Course.findByIdAndUpdate(
      courseId,
      { 
        title, 
        category, 
        description, 
        lessons: lessons.map(lesson => ({
          title: lesson.title,
          content: lesson.content,
          points: lesson.points || 10
        }))
      },
      { new: true } // Return the updated document
    );

    res.status(200).json({
      message: "Course updated successfully",
      course: updatedCourse
    });
  } catch (error) {
    console.error("Error updating course:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/delete/:id", authenticateJWT, async (req, res): Promise<void> => {
  const courseId = req.params.id;
  const userId = (req.user as AuthenticatedUser)?._id;

  try {
    // Validate user authentication
    if (!userId) {
      res.status(401).json({ error: "Unauthorized: User ID is missing" });
      return;
    }

    // Check if course exists and belongs to user
    const existingCourse = await Course.findOne({
      _id: courseId,
      user: userId,
    });

    if (!existingCourse) {
      res.status(404).json({ error: "Course not found or you don't have permission to delete it" });
      return;
    }

    // Delete the course
    await Course.findByIdAndDelete(courseId);

    res.status(200).json({
      message: "Course deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting course:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Add a new route to complete a course
router.post("/complete/:id", authenticateJWT, async (req, res): Promise<void> => {
  const courseId = req.params.id;
  const userId = (req.user as AuthenticatedUser)?._id;

  try {
    // Validate user authentication
    if (!userId) {
      res.status(401).json({ error: "Unauthorized: User ID is missing" });
      return;
    }

    // Find the course to get the total points
    const course = await Course.findById(courseId);
    if (!course) {
      res.status(404).json({ error: "Course not found" });
      return;
    }

    // Calculate total points from all lessons
    const totalPoints = course.lessons.reduce((sum, lesson) => sum + lesson.points, 0);

    // Check if the user has already completed this course
    let userProgress = await UserProgress.findOne({ user: userId });
    
    // If user progress doesn't exist, create it
    if (!userProgress) {
      userProgress = new UserProgress({
        user: userId,
        completedCourses: [],
        totalPoints: 0
      });
    }

    // Check if the course is already completed
    const isAlreadyCompleted = userProgress.completedCourses.some(
      completedCourse => completedCourse.course.toString() === courseId
    );

    if (isAlreadyCompleted) {
      res.status(400).json({ error: "Course already completed" });
      return;
    }

    // Add the completed course to user progress
    userProgress.completedCourses.push({
      course: courseId as unknown as mongoose.Schema.Types.ObjectId,
      completedAt: new Date(),
      pointsEarned: totalPoints
    });

    // Update total points
    userProgress.totalPoints += totalPoints;
    await userProgress.save();

    // Update user's points
    await User.findByIdAndUpdate(
      userId,
      { $inc: { points: totalPoints } },
      { new: true }
    );

    res.status(200).json({
      message: "Course completed successfully",
      pointsEarned: totalPoints,
      totalPoints: userProgress.totalPoints
    });
  } catch (error) {
    console.error("Error completing course:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Add a new route to get user progress
router.get("/get-progress", authenticateJWT, async (req, res): Promise<void> => {
  const userId = (req.user as AuthenticatedUser)?._id;

  try {
    // Validate user authentication
    if (!userId) {
      res.status(401).json({ error: "Unauthorized: User ID is missing" });
      return;
    }

    // Find user progress
    const userProgress = await UserProgress.findOne({ user: userId }).populate('completedCourses.course');
    
    // Get user data with points
    const userData = await User.findById(userId, 'points');

    res.status(200).json({
      progress: userProgress || { completedCourses: [], totalPoints: 0 },
      userPoints: userData?.points || 0
    });
  } catch (error) {
    console.error("Error fetching user progress:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
