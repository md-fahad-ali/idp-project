"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Course_1 = __importDefault(require("../models/Course"));
const router = express_1.default.Router();
// Public route to get all courses without authentication
router.get("/", async (req, res) => {
    try {
        const { title, category } = req.query;
        // Build query based on parameters
        let query = {};
        if (title)
            query.title = String(title);
        if (category)
            query.category = String(category);
        // Find courses with the query and populate user information
        const courses = await Course_1.default.find(query)
            .populate('user', 'firstName lastName email')
            .sort({ createdAt: -1 }); // Sort by newest first
        res.status(200).json({
            courses,
            success: true
        });
    }
    catch (error) {
        console.error('Error fetching public courses:', error);
        res.status(500).json({
            error: 'Internal server error',
            success: false
        });
    }
});
exports.default = router;
