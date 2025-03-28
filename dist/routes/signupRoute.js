"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const User_1 = __importDefault(require("../models/User"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const passport_1 = __importDefault(require("passport"));
const passport_jwt_1 = require("passport-jwt");
const dotenv_1 = require("dotenv");
(0, dotenv_1.configDotenv)();
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
    throw new Error("JWT secrets must be defined in the environment variables.");
}
const jwtOptions = {
    jwtFromRequest: passport_jwt_1.ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: JWT_SECRET,
};
passport_1.default.use(new passport_jwt_1.Strategy(jwtOptions, (payload, done) => {
    if (payload._id) {
        return done(null, { _id: payload._id, email: payload.email });
    }
    return done(null, false);
}));
const router = express_1.default.Router();
router.get("/", (req, res) => {
    res.json({ msg: "Signup Pages" });
});
router.post("/", async (req, res) => {
    try {
        const { firstName, lastName, username, email, password, role } = req.body;
        console.log("Received data:", req.body);
        // Check for duplicate username
        const existingUserByUsername = await User_1.default.findOne({ username });
        if (existingUserByUsername) {
            console.log("Username already exists");
            res.status(400).json({ msg: "Username already exists" });
            return;
        }
        // Check for duplicate email
        const existingUserByEmail = await User_1.default.findOne({ email });
        if (existingUserByEmail) {
            console.log("Email already exists");
            res.status(400).json({ msg: "Email already exists" });
            return;
        }
        const newUser = new User_1.default({
            firstName,
            lastName,
            username,
            email,
            password,
            role,
        });
        await newUser.save();
        const payload = { _id: newUser._id, email: newUser.email };
        const token = jsonwebtoken_1.default.sign(payload, JWT_SECRET, {
            expiresIn: "10m",
            algorithm: "HS256",
        });
        const refreshToken = jsonwebtoken_1.default.sign(payload, JWT_REFRESH_SECRET, {
            expiresIn: "7d",
            algorithm: "HS256",
        });
        res.cookie("access_token", token, {
            httpOnly: true,
            secure: true,
            sameSite: "strict",
        });
        res.cookie("refresh_token", refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: "strict",
        });
        res.status(201).json({
            msg: "User created successfully and data has been saved",
            user: newUser,
            token,
            refreshToken,
        });
    }
    catch (error) {
        console.error("Error creating user:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        res.status(500).json({ msg: "Error creating user", error: errorMessage });
    }
});
exports.default = router;
