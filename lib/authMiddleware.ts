import passport from "passport";
import { ExtractJwt, Strategy as JwtStrategy } from "passport-jwt";
import User, { IUser } from "../models/User";
import { configDotenv } from "dotenv";
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { Document, Types } from 'mongoose';

// Define the JWT payload interface
interface JwtPayload {
  _id: string;
  email: string;
  iat?: number;
  exp?: number;
}

// Extend Express Request type
declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface User extends Omit<IUser, '_id'> {
      _id: string;
    }
  }
}

configDotenv();

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined in environment variables');
}

const JWT_SECRET = process.env.JWT_SECRET;

// Configure JWT options
const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: JWT_SECRET,
};

// Configure Passport JWT Strategy
const jwtStrategy = new JwtStrategy(jwtOptions, async (jwtPayload: JwtPayload, done) => {
  try {
    // console.log('JWT Payload:', jwtPayload);
    const user = await User.findById(new Types.ObjectId(jwtPayload._id)).select('-password').lean();
    // console.log('Found user:', user);
    
    if (user) {
      // Convert ObjectId to string
      const userWithStringId = {
        ...user,
        _id: user._id.toString()
      };
      return done(null, userWithStringId as Express.User);
    }
    
    return done(null, false);
  } catch (error) {
    console.error('JWT Strategy Error:', error);
    return done(error, false);
  }
});

// Use the JWT strategy
passport.use(jwtStrategy);

// Custom authentication middleware
export const authenticateJWT = (req: Request, res: Response, next: NextFunction) => {
  console.log(`[AuthMiddleware] Path: ${req.path}, Auth Header: ${req.headers.authorization ? 'Present' : 'Missing'}`);
  
  passport.authenticate('jwt', { session: false }, async (err: unknown, user: Express.User | false | null, info: any) => {
    console.log('[AuthMiddleware] Passport authenticate callback triggered.');
    if (err) {
      console.error('[AuthMiddleware] Passport error:', err);
      return res.status(500).json({ message: "Authentication error", error: (err as Error).message });
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
          const decodedRefreshToken = jwt.verify(refreshToken, refreshSecret) as JwtPayload;
          console.log('[AuthMiddleware] Refresh token decoded:', decodedRefreshToken);

          if (decodedRefreshToken && decodedRefreshToken._id) {
            const refreshedUser = await User.findById(new Types.ObjectId(decodedRefreshToken._id))
              .select('-password')
              .lean();
            
            console.log('[AuthMiddleware] User found from refresh token:', refreshedUser ? refreshedUser._id.toString() : 'None');

            if (refreshedUser) {
              const userWithStringId = {
                ...refreshedUser,
                _id: refreshedUser._id.toString()
              };
              
              const newToken = jwt.sign(
                { _id: userWithStringId._id, email: userWithStringId.email },
                JWT_SECRET,
                { expiresIn: '1h' } // Or your preferred expiration for access tokens
              );
              console.log('[AuthMiddleware] New access token generated.');

              // Important: Set the new access_token cookie correctly for the client to use
              res.cookie('access_token', newToken, { 
                httpOnly: true, 
                secure: process.env.NODE_ENV === 'production', // Use secure in production
                sameSite: 'strict', 
                path: '/' // Make sure path is appropriate
              });
              
              req.user = userWithStringId as Express.User;
              console.log('[AuthMiddleware] Token refreshed successfully. Calling next().');
              return next(); // Ensure next() is called here
            } else {
              console.log('[AuthMiddleware] User not found for refresh token. Sending 401.');
              return res.status(401).json({ message: "Unauthorized - Invalid refresh token (user not found)" });
            }
          } else {
            console.log('[AuthMiddleware] Decoded refresh token invalid or missing _id. Sending 401.');
            return res.status(401).json({ message: "Unauthorized - Invalid refresh token (decode error)" });
          }
        } catch (error) {
          console.error('[AuthMiddleware] Refresh token verification error:', error);
          // Check the type of error to provide more specific feedback if it's a JWT error
          if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
            return res.status(401).json({ message: `Unauthorized - Refresh token issue: ${(error as Error).message}` });
          }
          return res.status(500).json({ message: "Internal server error during token refresh" });
        }
      } else {
        console.log('[AuthMiddleware] No refresh token found. Sending 401.');
        return res.status(401).json({ message: "Unauthorized - No user and no refresh token" });
      }
    } else {
      // User was found by JWT strategy
      console.log('[AuthMiddleware] Authentication successful with JWT. User:', user._id);
      req.user = user;
      return next(); // Ensure next() is called here
    }
  })(req, res, next);
};

// Export passport for use in app.ts
export default passport;
