"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateJWT = void 0;
const passport_1 = __importDefault(require("passport"));
const passport_jwt_1 = require("passport-jwt");
const User_1 = __importDefault(require("../models/User"));
const dotenv_1 = require("dotenv");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const mongoose_1 = require("mongoose");
(0, dotenv_1.configDotenv)();
if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined in environment variables');
}
const JWT_SECRET = process.env.JWT_SECRET;
// Configure JWT options
const jwtOptions = {
    jwtFromRequest: passport_jwt_1.ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: JWT_SECRET,
};
// Configure Passport JWT Strategy
const jwtStrategy = new passport_jwt_1.Strategy(jwtOptions, async (jwtPayload, done) => {
    try {
        console.log('JWT Payload:', jwtPayload);
        const user = await User_1.default.findById(new mongoose_1.Types.ObjectId(jwtPayload._id)).select('-password').lean();
        console.log('Found user:', user);
        if (user) {
            // Convert ObjectId to string
            const userWithStringId = {
                ...user,
                _id: user._id.toString()
            };
            return done(null, userWithStringId);
        }
        return done(null, false);
    }
    catch (error) {
        console.error('JWT Strategy Error:', error);
        return done(error, false);
    }
});
// Use the JWT strategy
passport_1.default.use(jwtStrategy);
// Custom authentication middleware
const authenticateJWT = (req, res, next) => {
    console.log('Auth Header:', req.headers.authorization);
    passport_1.default.authenticate('jwt', { session: false }, async (err, user) => {
        console.log('Passport authenticate callback');
        console.log('Error:', err);
        console.log('User:', user);
        if (err) {
            console.error('Authentication error:', err);
            return res.status(500).json({ message: "Internal server error", error: err.message });
        }
        if (!user) {
            const refreshToken = req.cookies.refresh_token;
            console.log('Refresh token:', refreshToken);
            if (refreshToken) {
                try {
                    const refreshSecret = process.env.JWT_REFRESH_SECRET;
                    if (!refreshSecret) {
                        console.error('JWT_REFRESH_SECRET is not defined');
                        return res.status(500).json({ message: "Server configuration error" });
                    }
                    const decodedRefreshToken = jsonwebtoken_1.default.verify(refreshToken, refreshSecret);
                    if (decodedRefreshToken) {
                        const refreshedUser = await User_1.default.findById(new mongoose_1.Types.ObjectId(decodedRefreshToken._id))
                            .select('-password')
                            .lean();
                        if (refreshedUser) {
                            // Convert ObjectId to string
                            const userWithStringId = {
                                ...refreshedUser,
                                _id: refreshedUser._id.toString()
                            };
                            const newToken = jsonwebtoken_1.default.sign({ _id: userWithStringId._id, email: userWithStringId.email }, JWT_SECRET, { expiresIn: '1h' });
                            console.log('New token:', newToken);
                            res.cookie('access_token', newToken, { httpOnly: true, secure: true, sameSite: 'strict' });
                            req.user = userWithStringId;
                            return next();
                        }
                    }
                }
                catch (error) {
                    console.error('Refresh token error:', error);
                }
            }
            console.log('No user found - Unauthorized');
            return res.status(401).json({ message: "Unauthorized - Invalid token" });
        }
        console.log('Authentication successful');
        req.user = user;
        next();
    })(req, res, next);
};
exports.authenticateJWT = authenticateJWT;
// Export passport for use in app.ts
exports.default = passport_1.default;
