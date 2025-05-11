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
// Simple memory cache implementation
const courseCache = new Map();
const progressCache = new Map();
const CACHE_TTL = 60 * 1000; // 1 minute cache lifetime
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
        // Clear course cache when adding new course
        courseCache.clear();
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
        // Create cache key based on userId, role, and query params
        const cacheKey = `${userId}_${userRole}_${title || 'all'}_${category || 'all'}`;
        // Check cache first
        const cachedData = courseCache.get(cacheKey);
        if (cachedData && Date.now() - cachedData.timestamp < CACHE_TTL) {
            console.log("Serving course data from cache for:", cacheKey);
            // Set cache headers
            res.set('Cache-Control', 'private, max-age=60');
            res.status(200).json(cachedData.data);
            return;
        }
        // For safety, get the user from the database to ensure we have fresh role information
        const user = await User_1.default.findById(userId);
        const freshUserRole = user?.role;
        console.log("Fresh user role from DB:", freshUserRole);
        let courses;
        let responseData;
        if (title === undefined || category === undefined) {
            // For regular users (role === 'user'), return only their own courses
            // For admins, return all courses
            const query = freshUserRole === 'user' ? { user: userId } : {};
            console.log("Query for all courses:", query);
            courses = await Course_1.default.find(query).populate("user", "firstName lastName email");
            responseData = {
                courses: courses,
                user: req.user,
                refreshedRole: freshUserRole
            };
        }
        else {
            // Find courses by title and category
            // For regular users (role === 'user'), return only their own matching courses
            // For admins, return any matching course
            const query = {
                title: title,
                category: category,
                ...(freshUserRole === 'user' ? { user: userId } : {})
            };
            console.log("Query for filtered courses:", query);
            courses = await Course_1.default.find(query).populate("user", "firstName lastName email");
            responseData = {
                courses: courses,
                user: req.user,
                refreshedRole: freshUserRole
            };
        }
        // Save in cache
        courseCache.set(cacheKey, {
            data: responseData,
            timestamp: Date.now()
        });
        // Set cache headers
        res.set('Cache-Control', 'private, max-age=60');
        res.status(200).json(responseData);
    }
    catch (error) {
        console.error("Error fetching courses:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});
router.put("/update/:id", authMiddleware_1.authenticateJWT, async (req, res) => {
    const courseId = req.params.id;
    const userId = req.user?._id;
    const userRole = req.user?.role;
    const { title, category, description, lessons } = req.body;
    try {
        console.log("Update course request for course ID:", courseId);
        console.log("User ID:", userId, "User Role:", userRole);
        // Validate user authentication
        if (!userId) {
            console.log("Unauthorized: User ID is missing");
            res.status(401).json({ error: "Unauthorized: User ID is missing" });
            return;
        }
        // Validate required fields
        if (!title || !category || !description || !lessons) {
            console.log("Missing required fields");
            res.status(400).json({ error: "All fields are required" });
            return;
        }
        // Validate lessons array
        if (!Array.isArray(lessons) || lessons.length === 0) {
            console.log("Invalid lessons array");
            res.status(400).json({ error: "Lessons must be a non-empty array" });
            return;
        }
        // For safety, get the user from the database to ensure we have fresh role information
        const user = await User_1.default.findById(userId);
        const freshUserRole = user?.role;
        console.log("Fresh user role from DB:", freshUserRole);
        // Check if course exists and belongs to user (for both admin and regular users)
        let query = { _id: courseId };
        // Only restrict by user ID if not an admin
        if (freshUserRole !== 'admin') {
            query.user = userId;
        }
        console.log("Course query:", JSON.stringify(query));
        const existingCourse = await Course_1.default.findOne(query);
        console.log("Existing course found:", existingCourse ? "Yes" : "No");
        if (!existingCourse) {
            console.log("Course not found or user doesn't have permission");
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
        console.log("Course updated successfully");
        // Clear course cache after update
        courseCache.clear();
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
    console.log(`[CourseDeleteRoute] Attempting to delete course ID: ${courseId}`);
    console.log(`[CourseDeleteRoute] Authenticated User ID: ${userId}`);
    console.log(`[CourseDeleteRoute] Authenticated User (from token):`, JSON.stringify(req.user));
    try {
        if (!userId) {
            console.error("[CourseDeleteRoute] Unauthorized: User ID is missing in req.user after authenticateJWT.");
            res.status(401).json({ error: "Unauthorized: User ID is missing" });
            return;
        }
        const user = await User_1.default.findById(userId);
        if (!user) {
            console.error(`[CourseDeleteRoute] Critical: User with ID ${userId} not found in database, but was authenticated.`);
            res.status(401).json({ error: "Unauthorized: Authenticated user not found." });
            return;
        }
        const freshUserRole = user.role;
        console.log(`[CourseDeleteRoute] Fresh user role from DB: ${freshUserRole} for user ID: ${userId}`);
        let query = { _id: courseId };
        if (freshUserRole !== 'admin') {
            console.log(`[CourseDeleteRoute] User is not admin. Adding user: ${userId} to query.`);
            query.user = userId;
        }
        else {
            console.log(`[CourseDeleteRoute] User is admin. No user restriction on query.`);
        }
        console.log("[CourseDeleteRoute] Course find query:", JSON.stringify(query));
        const existingCourse = await Course_1.default.findOne(query);
        if (!existingCourse) {
            console.log("[CourseDeleteRoute] Course not found or user does not have permission. Query was:", JSON.stringify(query));
            res.status(404).json({ error: "Course not found or you don't have permission to delete it" });
            return;
        }
        console.log(`[CourseDeleteRoute] Course found: ${existingCourse._id}. Attempting deletion.`);
        const deleteResult = await Course_1.default.findByIdAndDelete(courseId);
        if (!deleteResult) {
            console.error(`[CourseDeleteRoute] findByIdAndDelete failed for courseId: ${courseId} even after finding it. This is unexpected.`);
            res.status(500).json({ error: "Failed to delete course, course might have been deleted by another process." });
            return;
        }
        console.log(`[CourseDeleteRoute] Course ${courseId} deleted successfully from DB.`);
        courseCache.clear(); // Clear cache
        console.log("[CourseDeleteRoute] Course cache cleared.");
        res.status(200).json({ message: "Course deleted successfully" });
    }
    catch (error) {
        console.error("[CourseDeleteRoute] Error during course deletion:", error);
        res.status(500).json({ error: "Internal server error during course deletion." });
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
        // Check if this course is already in the completed courses array
        const alreadyCompleted = userProgress.completedCourses.some(completedCourse => String(completedCourse.course) === String(courseId));
        if (alreadyCompleted) {
            res.status(200).json({
                message: "Course was already completed",
                pointsEarned: 0,
                totalPoints: userProgress.totalPoints
            });
            return;
        }
        // Add the course to the completed courses array
        userProgress.completedCourses.push({
            course: courseId,
            completedAt: new Date(),
            pointsEarned: totalPoints
        });
        // Update total points for the progress
        userProgress.totalPoints += totalPoints;
        // Save the updated progress
        await userProgress.save();
        // Update the user's points
        await User_1.default.findByIdAndUpdate(userId, { $inc: { points: totalPoints } });
        // Clear related caches
        progressCache.clear();
        const userCacheKeys = Array.from(courseCache.keys()).filter(key => key.startsWith(userId));
        userCacheKeys.forEach(key => courseCache.delete(key));
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
router.get("/get-progress", authMiddleware_1.authenticateJWT, async (req, res) => {
    const userId = req.user?._id;
    try {
        // Validate user authentication
        if (!userId) {
            res.status(401).json({ error: "Unauthorized: User ID is missing" });
            return;
        }
        // Check cache first
        const cacheKey = `progress_${userId}`;
        const cachedData = progressCache.get(cacheKey);
        if (cachedData && Date.now() - cachedData.timestamp < CACHE_TTL) {
            console.log("Serving progress data from cache for:", cacheKey);
            // Set cache headers
            res.set('Cache-Control', 'private, max-age=60');
            res.status(200).json(cachedData.data);
            return;
        }
        // Find user progress
        const userProgress = await UserProgress_1.default.findOne({ user: userId }).populate('completedCourses.course');
        // Get user data with points
        const userData = await User_1.default.findById(userId, 'points');
        const responseData = {
            progress: userProgress || { completedCourses: [], totalPoints: 0 },
            userPoints: userData?.points || 0
        };
        // Save to cache
        progressCache.set(cacheKey, {
            data: responseData,
            timestamp: Date.now()
        });
        // Set cache headers
        res.set('Cache-Control', 'private, max-age=60');
        res.status(200).json(responseData);
    }
    catch (error) {
        console.error("Error fetching user progress:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});
exports.default = router;
