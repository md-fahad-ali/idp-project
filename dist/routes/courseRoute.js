"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Course_1 = __importDefault(require("../models/Course"));
const authMiddleware_1 = require("../lib/authMiddleware");
const UserProgress_1 = __importDefault(require("../models/UserProgress"));
const User_1 = __importDefault(require("../models/User"));
// import User from "../models/User"; // Assuming you have a User model
const router = express_1.default.Router();
// Route to save course data
router.post("/add", authMiddleware_1.authenticateJWT, async (req, res) => {
    const userId = req.user?._id;
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
        const existingCourse = await Course_1.default.findOne({
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
        const newCourse = new Course_1.default({
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
    }
    catch (error) {
        console.error("Error saving course:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});
//get params title and category
router.get("/get", authMiddleware_1.authenticateJWT, async (req, res) => {
    const { title, category } = req.query; // Extract title and category from query parameters
    const userId = req.user?._id;
    const userRole = req.user?.role;
    console.log("User data:", JSON.stringify(req.user));
    console.log("User role:", userRole, "User ID:", userId);
    try {
        // Make sure we have a valid user before proceeding
        if (!userId) {
            res.status(401).json({ error: "Unauthorized: User ID is missing" });
            return;
        }
        // For safety, get the user from the database to ensure we have fresh role information
        const user = await User_1.default.findById(userId);
        const freshUserRole = user?.role;
        console.log("Fresh user role from DB:", freshUserRole);
        if (title === undefined || category === undefined) {
            // For regular users (role === 'user'), return all courses
            // For admins, only return their own courses
            const query = freshUserRole === 'user' ? {} : { user: userId };
            console.log("Query for all courses:", query);
            const courses = await Course_1.default.find(query).populate("user", "firstName lastName email");
            res.status(200).json({
                courses: courses,
                user: req.user,
                refreshedRole: freshUserRole
            });
        }
        else {
            // Find courses by title and category
            // For regular users (role === 'user'), return all matching courses
            // For admins, only return their own courses
            const query = {
                title: title,
                category: category,
                ...(freshUserRole === 'user' ? {} : { user: userId })
            };
            console.log("Query for filtered courses:", query);
            const courses = await Course_1.default.find(query).populate("user", "firstName lastName email");
            res.status(200).json({
                courses: courses,
                user: req.user,
                refreshedRole: freshUserRole
            });
        }
    }
    catch (error) {
        console.error("Error fetching courses:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});
router.put("/update/:id", authMiddleware_1.authenticateJWT, async (req, res) => {
    const courseId = req.params.id;
    const userId = req.user?._id;
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
        // Check if course exists and belongs to user (for both admin and regular users)
        const query = { _id: courseId, user: userId };
        const existingCourse = await Course_1.default.findOne(query);
        if (!existingCourse) {
            res.status(404).json({ error: "Course not found or you don't have permission to update it" });
            return;
        }
        // Update the course
        const updatedCourse = await Course_1.default.findByIdAndUpdate(courseId, {
            title,
            category,
            description,
            lessons: lessons.map(lesson => ({
                title: lesson.title,
                content: lesson.content,
                points: lesson.points || 10
            }))
        }, { new: true } // Return the updated document
        );
        res.status(200).json({
            message: "Course updated successfully",
            course: updatedCourse
        });
    }
    catch (error) {
        console.error("Error updating course:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});
router.delete("/delete/:id", authMiddleware_1.authenticateJWT, async (req, res) => {
    const courseId = req.params.id;
    const userId = req.user?._id;
    try {
        // Validate user authentication
        if (!userId) {
            res.status(401).json({ error: "Unauthorized: User ID is missing" });
            return;
        }
        // Check if course exists and belongs to user (for both admin and regular users)
        const query = { _id: courseId, user: userId };
        const existingCourse = await Course_1.default.findOne(query);
        if (!existingCourse) {
            res.status(404).json({ error: "Course not found or you don't have permission to delete it" });
            return;
        }
        // Delete the course
        await Course_1.default.findByIdAndDelete(courseId);
        res.status(200).json({
            message: "Course deleted successfully"
        });
    }
    catch (error) {
        console.error("Error deleting course:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});
// Add a new route to complete a course
router.post("/complete/:id", authMiddleware_1.authenticateJWT, async (req, res) => {
    const courseId = req.params.id;
    const userId = req.user?._id;
    try {
        // Validate user authentication
        if (!userId) {
            res.status(401).json({ error: "Unauthorized: User ID is missing" });
            return;
        }
        // Find the course to get the total points
        const course = await Course_1.default.findById(courseId);
        if (!course) {
            res.status(404).json({ error: "Course not found" });
            return;
        }
        // Calculate total points from all lessons
        const totalPoints = course.lessons.reduce((sum, lesson) => sum + lesson.points, 0);
        // Check if the user has already completed this course
        let userProgress = await UserProgress_1.default.findOne({ user: userId });
        // If user progress doesn't exist, create it
        if (!userProgress) {
            userProgress = new UserProgress_1.default({
                user: userId,
                completedCourses: [],
                totalPoints: 0
            });
        }
        // Check if the course is already completed
        const isAlreadyCompleted = userProgress.completedCourses.some(completedCourse => completedCourse.course.toString() === courseId);
        if (isAlreadyCompleted) {
            res.status(400).json({ error: "Course already completed" });
            return;
        }
        // Add the completed course to user progress
        userProgress.completedCourses.push({
            course: courseId,
            completedAt: new Date(),
            pointsEarned: totalPoints
        });
        // Update total points
        userProgress.totalPoints += totalPoints;
        await userProgress.save();
        // Update user's points
        await User_1.default.findByIdAndUpdate(userId, { $inc: { points: totalPoints } }, { new: true });
        res.status(200).json({
            message: "Course completed successfully",
            pointsEarned: totalPoints,
            totalPoints: userProgress.totalPoints
        });
    }
    catch (error) {
        console.error("Error completing course:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});
// Add a new route to get user progress
router.get("/get-progress", authMiddleware_1.authenticateJWT, async (req, res) => {
    const userId = req.user?._id;
    try {
        // Validate user authentication
        if (!userId) {
            res.status(401).json({ error: "Unauthorized: User ID is missing" });
            return;
        }
        // Find user progress
        const userProgress = await UserProgress_1.default.findOne({ user: userId }).populate('completedCourses.course');
        // Get user data with points
        const userData = await User_1.default.findById(userId, 'points');
        res.status(200).json({
            progress: userProgress || { completedCourses: [], totalPoints: 0 },
            userPoints: userData?.points || 0
        });
    }
    catch (error) {
        console.error("Error fetching user progress:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});
exports.default = router;
