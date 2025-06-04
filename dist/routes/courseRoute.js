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
const mongoose_1 = __importDefault(require("mongoose"));
// import User from "../models/User"; // Assuming you have a User model
const router = express_1.default.Router();
// Simple memory cache implementation
const courseCache = new Map();
const progressCache = new Map();
const statsCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache lifetime (increased from 1 minute)
// Course statistics endpoint for admin dashboard
router.get("/stats", authMiddleware_1.authenticateJWT, async (req, res) => {
    const userId = req.user?._id;
    const userRole = req.user?.role;
    // Extract pagination parameters
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '3', 10);
    // Validate pagination parameters
    if (isNaN(page) || page < 1) {
        res.status(400).json({
            error: 'Invalid page number',
            success: false
        });
        return;
    }
    if (isNaN(limit) || limit < 1 || limit > 50) {
        res.status(400).json({
            error: 'Invalid limit (must be between 1 and 50)',
            success: false
        });
        return;
    }
    try {
        // Make sure we have a valid user before proceeding
        if (!userId) {
            res.status(401).json({ error: "Unauthorized: User ID is missing" });
            return;
        }
        // Verify user is an admin
        const user = await User_1.default.findById(userId);
        if (!user || user.role !== 'admin') {
            res.status(403).json({ error: "Forbidden: Admin access required" });
            return;
        }
        // Calculate skip value for pagination
        const skip = (page - 1) * limit;
        // Check cache first with pagination info included in the key
        const cacheKey = `stats_${userId}_p${page}_l${limit}`;
        const cachedData = statsCache.get(cacheKey);
        if (cachedData && Date.now() - cachedData.timestamp < CACHE_TTL) {
            console.log("Serving course stats from cache for:", cacheKey);
            res.status(200).json(cachedData.data);
            return;
        }
        // Get total users count
        const totalUsers = await User_1.default.countDocuments({ role: 'user' });
        // Get total courses
        const totalCourses = await Course_1.default.countDocuments();
        // Get admin's courses with pagination
        const totalAdminCourses = await Course_1.default.countDocuments({ user: userId });
        const adminCourses = await Course_1.default.find({ user: userId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
        // Calculate total pages
        const totalPages = Math.ceil(totalAdminCourses / limit);
        // Get enrollment data - counting from UserProgress model
        const userProgressData = await UserProgress_1.default.find().populate('user').populate({
            path: 'completedCourses.course',
            model: 'Course'
        });
        // Calculate total enrollments across all courses
        const totalEnrollments = userProgressData.reduce((total, userProgress) => {
            return total + userProgress.completedCourses.length;
        }, 0);
        // Count active users in the last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const activeUsers = await User_1.default.countDocuments({
            lastActive: { $gte: sevenDaysAgo }
        });
        // Calculate enrollment and completion statistics for admin's courses
        const courseStats = [];
        for (const course of adminCourses) {
            // Count enrollments (users who have this course in their completedCourses array)
            let enrollmentCount = 0;
            let completionCount = 0;
            userProgressData.forEach(progress => {
                progress.completedCourses.forEach(completedCourse => {
                    // Ensure completedCourse.course is populated and has an _id property
                    const courseObj = completedCourse.course;
                    if (courseObj && typeof courseObj === 'object' && '_id' in courseObj &&
                        courseObj._id && course._id &&
                        courseObj._id.toString() === course._id.toString()) {
                        enrollmentCount++;
                        completionCount++;
                    }
                });
            });
            courseStats.push({
                _id: course._id,
                title: course.title,
                category: course.category,
                enrollmentCount,
                completionCount
            });
        }
        // Sort courses by enrollment count (highest first)
        courseStats.sort((a, b) => b.enrollmentCount - a.enrollmentCount);
        const statsData = {
            totalUsers,
            totalCourses,
            totalEnrollments,
            activeUsersThisWeek: activeUsers,
            courseStats,
            currentPage: page,
            totalPages,
            totalItems: totalAdminCourses,
            itemsPerPage: limit,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1
        };
        // Save in cache
        statsCache.set(cacheKey, {
            data: statsData,
            timestamp: Date.now()
        });
        res.status(200).json(statsData);
    }
    catch (error) {
        console.error("Error fetching course statistics:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});
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
    const { title, category, page = 1, limit = 9 } = req.query; // Extract pagination parameters
    const userId = req.user?._id;
    const userRole = req.user?.role;
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
    console.log("User data:", JSON.stringify(req.user));
    console.log("User role:", userRole, "User ID:", userId);
    try {
        // Make sure we have a valid user before proceeding
        if (!userId) {
            res.status(401).json({ error: "Unauthorized: User ID is missing" });
            return;
        }
        // Create cache key based on userId, role, query params, and pagination
        const cacheKey = `${userId}_${userRole}_${title || 'all'}_${category || 'all'}_p${pageNum}_l${limitNum}`;
        // Check cache first
        const cachedData = courseCache.get(cacheKey);
        if (cachedData && Date.now() - cachedData.timestamp < CACHE_TTL) {
            console.log("Serving course data from cache for:", cacheKey);
            // Set cache headers for client-side caching
            res.set('Cache-Control', 'private, max-age=300');
            res.status(200).json(cachedData.data);
            return;
        }
        // For safety, get the user from the database to ensure we have fresh role information
        const user = await User_1.default.findById(userId);
        const freshUserRole = user?.role;
        console.log("Fresh user role from DB:", freshUserRole);
        // Calculate skip value for pagination
        const skip = (pageNum - 1) * limitNum;
        let query = {};
        if (title === undefined || category === undefined) {
            // Show all courses for both regular users and admins
            query = {}; // Remove the user restriction
            console.log("Query for all courses:", query);
        }
        else {
            // For filtered searches, keep the role-specific behavior
            query = {
                title: title,
                category: category,
                ...(freshUserRole === 'user' ? { user: userId } : {})
            };
            console.log("Query for filtered courses:", query);
        }
        // Get total count for pagination info
        const totalCourses = await Course_1.default.countDocuments(query);
        // Find courses with pagination
        if (userRole == 'admin') {
            //show all courses that admin created
            // If the user is an admin, show only courses created by the admin (i.e., where user field matches admin's userId)
            const adminQuery = {
                user: userId
            };
            const adminCourses = await Course_1.default.find(adminQuery, {
                'lessons.content': 0 // Exclude lesson content to reduce response size
            })
                .populate("user", "firstName lastName email")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum);
            // Get total count for pagination info for admin's courses
            const adminTotalCourses = await Course_1.default.countDocuments(adminQuery);
            const adminTotalPages = Math.ceil(adminTotalCourses / limitNum);
            const adminResponseData = {
                courses: adminCourses,
                user: req.user,
                refreshedRole: freshUserRole,
                pagination: {
                    currentPage: pageNum,
                    totalPages: adminTotalPages,
                    totalItems: adminTotalCourses,
                    itemsPerPage: limitNum,
                    hasNextPage: pageNum < adminTotalPages,
                    hasPrevPage: pageNum > 1
                }
            };
            // Save in cache
            courseCache.set(cacheKey, {
                data: adminResponseData,
                timestamp: Date.now()
            });
            // Set cache headers for client-side caching
            res.set('Cache-Control', 'private, max-age=300');
            res.status(200).json(adminResponseData);
            return;
        }
        else {
            const courses = await Course_1.default.find(query, {
                'lessons.content': 0 // Exclude lesson content to reduce response size
            })
                .populate("user", "firstName lastName email")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum);
            console.log('Courses:', courses);
            // Calculate pagination metadata
            const totalPages = Math.ceil(totalCourses / limitNum);
            const responseData = {
                courses: courses,
                user: req.user,
                refreshedRole: freshUserRole,
                pagination: {
                    currentPage: pageNum,
                    totalPages,
                    totalItems: totalCourses,
                    itemsPerPage: limitNum,
                    hasNextPage: pageNum < totalPages,
                    hasPrevPage: pageNum > 1
                }
            };
            // // Save in cache
            // courseCache.set(cacheKey, {
            //   data: responseData,
            //   timestamp: Date.now()
            // });
            // // Set cache headers for client-side caching
            // res.set('Cache-Control', 'private, max-age=300');
            res.status(200).json(responseData);
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
// New route to get a single course by ID with full content
router.get("/get/:id", authMiddleware_1.authenticateJWT, async (req, res) => {
    const courseId = req.params.id;
    const userId = req.user?._id;
    const lite = req.query.lite === 'true'; // Lightweight version without lesson content
    try {
        // Make sure we have a valid user before proceeding
        if (!userId) {
            res.status(401).json({ error: "Unauthorized: User ID is missing" });
            return;
        }
        // Create cache key for this specific course
        const cacheKey = `course_${courseId}_${userId}_${lite ? 'lite' : 'full'}`;
        // Check cache first
        const cachedData = courseCache.get(cacheKey);
        if (cachedData && Date.now() - cachedData.timestamp < CACHE_TTL) {
            console.log("Serving single course data from cache for:", cacheKey);
            // Set cache headers for client-side caching
            res.set('Cache-Control', 'private, max-age=300');
            res.status(200).json(cachedData.data);
            return;
        }
        // Find the course either by MongoDB ObjectID or by title
        let course;
        console.log(`Attempting to find course with ID/title: ${courseId}, lite mode: ${lite}`);
        // Configure projection to include or exclude lesson content based on lite mode
        const projection = lite ? { 'lessons.content': 0 } : {};
        try {
            // Try to find by MongoDB ObjectID if it's a valid ObjectID
            if (mongoose_1.default.Types.ObjectId.isValid(courseId)) {
                console.log(`${courseId} is a valid MongoDB ObjectID, searching by _id`);
                course = await Course_1.default.findById(courseId, projection)
                    .populate("user", "firstName lastName email");
            }
        }
        catch (err) {
            console.error("Error when finding by ObjectID:", err);
        }
        // If not found or not a valid ObjectID, try to find by exact title match first
        if (!course) {
            try {
                console.log(`Searching for course with exact title: ${courseId}`);
                course = await Course_1.default.findOne({ title: courseId }, projection)
                    .populate("user", "firstName lastName email");
            }
            catch (err) {
                console.error("Error when finding by exact title:", err);
            }
        }
        // If still not found, try case-insensitive search
        if (!course) {
            try {
                console.log(`Course not found with exact title. Trying case-insensitive search for: ${courseId}`);
                // Use a simple case-insensitive search without regex
                course = await Course_1.default.findOne({ title: { $regex: new RegExp('^' + courseId.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i') } }, projection).populate("user", "firstName lastName email");
            }
            catch (err) {
                console.error("Error when finding by case-insensitive title:", err);
            }
        }
        if (!course) {
            res.status(404).json({ error: "Course not found" });
            return;
        }
        // For lessons content loading optimization
        if (!lite && course.lessons && course.lessons.length > 0) {
            // Pre-process content for the first lesson only to reduce initial load time
            const firstLessonIndex = 0;
            // For other lessons in full mode, keep only a content preview or stub
            if (course.lessons.length > 1) {
                course.lessons = course.lessons.map((lesson, index) => {
                    if (index === firstLessonIndex) {
                        // Keep full content for the first lesson
                        return lesson;
                    }
                    // For other lessons, create a content preview
                    const fullContent = lesson.content;
                    const previewLength = 150; // Characters to keep
                    const preview = fullContent.length > previewLength ?
                        fullContent.substring(0, previewLength) + '...' :
                        fullContent;
                    return {
                        title: lesson.title,
                        content: preview,
                        points: lesson.points,
                        _hasFullContent: false // Flag to indicate this is not the full content
                    };
                });
            }
        }
        const responseData = { course };
        // Save in cache
        courseCache.set(cacheKey, {
            data: responseData,
            timestamp: Date.now()
        });
        // Set cache headers for client-side caching
        res.set('Cache-Control', 'private, max-age=300');
        res.status(200).json(responseData);
    }
    catch (error) {
        console.error("Error fetching single course:", error);
        res.status(500).json({ error: "Internal server error", details: error instanceof Error ? error.message : String(error) });
    }
});
// New endpoint to get a specific lesson content by course ID and lesson index
router.get("/lesson/:courseId/:lessonIndex", authMiddleware_1.authenticateJWT, async (req, res) => {
    const { courseId, lessonIndex } = req.params;
    const userId = req.user?._id;
    const index = parseInt(lessonIndex, 10);
    try {
        // Make sure we have a valid user and index
        if (!userId) {
            res.status(401).json({ error: "Unauthorized: User ID is missing" });
            return;
        }
        if (isNaN(index) || index < 0) {
            res.status(400).json({ error: "Invalid lesson index" });
            return;
        }
        // Create cache key for this specific lesson
        const cacheKey = `lesson_${courseId}_${index}_${userId}`;
        // Check cache first
        const cachedData = courseCache.get(cacheKey);
        if (cachedData && Date.now() - cachedData.timestamp < CACHE_TTL) {
            console.log("Serving lesson data from cache for:", cacheKey);
            res.set('Cache-Control', 'private, max-age=300');
            res.status(200).json(cachedData.data);
            return;
        }
        // Find the course
        let course;
        if (mongoose_1.default.Types.ObjectId.isValid(courseId)) {
            course = await Course_1.default.findById(courseId);
        }
        else {
            course = await Course_1.default.findOne({
                title: { $regex: new RegExp('^' + courseId.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i') }
            });
        }
        if (!course) {
            res.status(404).json({ error: "Course not found" });
            return;
        }
        // Check if lesson index is valid
        if (!course.lessons || index >= course.lessons.length) {
            res.status(404).json({ error: "Lesson not found" });
            return;
        }
        // Get the specific lesson
        const lesson = course.lessons[index];
        const responseData = { lesson };
        // Save in cache
        courseCache.set(cacheKey, {
            data: responseData,
            timestamp: Date.now()
        });
        // Set cache headers
        res.set('Cache-Control', 'private, max-age=300');
        res.status(200).json(responseData);
    }
    catch (error) {
        console.error("Error fetching lesson content:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});
// New endpoint to get a course directly by slug - simplified approach
router.get("/get-by-slug/:slug", authMiddleware_1.authenticateJWT, async (req, res) => {
    const { slug } = req.params;
    const userId = req.user?._id;
    try {
        // Make sure we have a valid user
        if (!userId) {
            res.status(401).json({ error: "Unauthorized: User ID is missing" });
            return;
        }
        // Create cache key for this specific course by slug
        const cacheKey = `course_slug_${slug}_${userId}`;
        // Check cache first
        const cachedData = courseCache.get(cacheKey);
        if (cachedData && Date.now() - cachedData.timestamp < CACHE_TTL) {
            console.log("Serving course data from cache for slug:", slug);
            // Set cache headers for client-side caching
            res.set('Cache-Control', 'private, max-age=300');
            res.status(200).json(cachedData.data);
            return;
        }
        // Convert slug format (e.g. "mongodb-basics") to title format (e.g. "Mongodb Basics")
        // This helps with case-insensitive matching
        const titleFromSlug = slug
            .split("-")
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
        console.log(`Looking for course with title like: ${titleFromSlug}`);
        // Find the course directly by title - using case insensitive search
        const course = await Course_1.default.findOne({
            title: { $regex: new RegExp('^' + titleFromSlug.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i') }
        }).populate("user", "firstName lastName email");
        if (!course) {
            res.status(404).json({ error: "Course not found" });
            return;
        }
        // Ensure all lessons have full content by adding a flag indicating they have full content
        if (course.lessons && course.lessons.length > 0) {
            course.lessons = course.lessons.map((lesson) => {
                if (lesson.content) {
                    return {
                        ...lesson,
                        _hasFullContent: true
                    };
                }
                return lesson;
            });
        }
        const responseData = { course };
        // Save in cache
        courseCache.set(cacheKey, {
            data: responseData,
            timestamp: Date.now()
        });
        // Set cache headers
        res.set('Cache-Control', 'private, max-age=300');
        res.status(200).json(responseData);
    }
    catch (error) {
        console.error("Error fetching course by slug:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});
exports.default = router;
