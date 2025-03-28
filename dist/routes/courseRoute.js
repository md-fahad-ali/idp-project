"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Course_1 = __importDefault(require("../models/Course"));
const authMiddleware_1 = require("../lib/authMiddleware");
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
    if (title === undefined || category === undefined) {
        const courses = await Course_1.default.find();
        res.status(200).json({ courses: courses, user: req.user });
    }
    else {
        try {
            // Find courses by title and category, and ensure they belong to the authenticated user
            const courses = await Course_1.default.find({
                title: title,
                category,
                user: userId,
            }).populate("user", "firstName lastName email");
            res.status(200).json({ courses: courses, user: req.user });
        }
        catch (error) {
            console.error("Error fetching courses:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    }
});
exports.default = router;
