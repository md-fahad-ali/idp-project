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
        // console.log('JWT Payload:', jwtPayload);
        const user = await User_1.default.findById(new mongoose_1.Types.ObjectId(jwtPayload._id)).select('-password').lean();
        // console.log('Found user:', user);
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
    console.log(`[AuthMiddleware] Path: ${req.path}, Auth Header: ${req.headers.authorization ? 'Present' : 'Missing'}`);
    passport_1.default.authenticate('jwt', { session: false }, async (err, user, info) => {
        console.log('[AuthMiddleware] Passport authenticate callback triggered.');
        if (err) {
            console.error('[AuthMiddleware] Passport error:', err);
            return res.status(500).json({ message: "Authentication error", error: err.message });
        }
        if (info) {
            console.log("[AuthMiddleware] Passport info:", info.message);
        }
        if (!user) {
            console.log('[AuthMiddleware] No user from JWT. Attempting token refresh.');
            const refreshToken = req.cookies.refresh_token;
            console.log('[AuthMiddleware] Refresh token from cookie:', refreshToken ? 'Present' : 'Missing');
            if (refreshToken) {
                try {
                    const refreshSecret = process.env.JWT_REFRESH_SECRET;
                    if (!refreshSecret) {
                        console.error('[AuthMiddleware] JWT_REFRESH_SECRET is not defined');
                        return res.status(500).json({ message: "Server configuration error: Refresh secret missing" });
                    }
                    console.log('[AuthMiddleware] Verifying refresh token...');
                    const decodedRefreshToken = jsonwebtoken_1.default.verify(refreshToken, refreshSecret);
                    console.log('[AuthMiddleware] Refresh token decoded:', decodedRefreshToken);
                    if (decodedRefreshToken && decodedRefreshToken._id) {
                        const refreshedUser = await User_1.default.findById(new mongoose_1.Types.ObjectId(decodedRefreshToken._id))
                            .select('-password')
                            .lean();
                        console.log('[AuthMiddleware] User found from refresh token:', refreshedUser ? refreshedUser._id.toString() : 'None');
                        if (refreshedUser) {
                            const userWithStringId = {
                                ...refreshedUser,
                                _id: refreshedUser._id.toString()
                            };
                            const newToken = jsonwebtoken_1.default.sign({ _id: userWithStringId._id, email: userWithStringId.email }, JWT_SECRET, { expiresIn: '1h' } // Or your preferred expiration for access tokens
                            );
                            console.log('[AuthMiddleware] New access token generated.');
                            // Important: Set the new access_token cookie correctly for the client to use
                            res.cookie('access_token', newToken, {
                                httpOnly: true,
                                secure: process.env.NODE_ENV === 'production', // Use secure in production
                                sameSite: 'strict',
                                path: '/' // Make sure path is appropriate
                            });
                            req.user = userWithStringId;
                            console.log('[AuthMiddleware] Token refreshed successfully. Calling next().');
                            return next(); // Ensure next() is called here
                        }
                        else {
                            console.log('[AuthMiddleware] User not found for refresh token. Sending 401.');
                            return res.status(401).json({ message: "Unauthorized - Invalid refresh token (user not found)" });
                        }
                    }
                    else {
                        console.log('[AuthMiddleware] Decoded refresh token invalid or missing _id. Sending 401.');
                        return res.status(401).json({ message: "Unauthorized - Invalid refresh token (decode error)" });
                    }
                }
                catch (error) {
                    console.error('[AuthMiddleware] Refresh token verification error:', error);
                    // Check the type of error to provide more specific feedback if it's a JWT error
                    if (error instanceof jsonwebtoken_1.default.JsonWebTokenError || error instanceof jsonwebtoken_1.default.TokenExpiredError) {
                        return res.status(401).json({ message: `Unauthorized - Refresh token issue: ${error.message}` });
                    }
                    return res.status(500).json({ message: "Internal server error during token refresh" });
                }
            }
            else {
                console.log('[AuthMiddleware] No refresh token found. Sending 401.');
                return res.status(401).json({ message: "Unauthorized - No user and no refresh token" });
            }
        }
        else {
            // User was found by JWT strategy
            console.log('[AuthMiddleware] Authentication successful with JWT. User:', user._id);
            req.user = user;
            return next(); // Ensure next() is called here
        }
    })(req, res, next);
};
exports.authenticateJWT = authenticateJWT;
// Export passport for use in app.ts
exports.default = passport_1.default;
