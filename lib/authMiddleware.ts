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
    console.log('JWT Payload:', jwtPayload);
    const user = await User.findById(new Types.ObjectId(jwtPayload._id)).select('-password').lean();
    console.log('Found user:', user);
    
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
  // console.log('Auth Header:', req.headers.authorization);
  
  passport.authenticate('jwt', { session: false }, async (err: unknown, user: Express.User | false | null) => {
    // console.log('Passport authenticate callback');
    // console.log('Error:', err);
    // console.log('User:', user);

    if (err) {
      console.error('Authentication error:', err);
      return res.status(500).json({ message: "Internal server error", error: (err as Error).message });
    }
    
    if (!user) {
      const refreshToken = req.cookies.refresh_token;
      // console.log('Refresh token:', refreshToken);
      if (refreshToken) {
        try {
          const refreshSecret = process.env.JWT_REFRESH_SECRET;
          if (!refreshSecret) {
            // console.error('JWT_REFRESH_SECRET is not defined');
            return res.status(500).json({ message: "Server configuration error" });
          }
          
          const decodedRefreshToken = jwt.verify(refreshToken, refreshSecret) as JwtPayload;
          if (decodedRefreshToken) {
            const refreshedUser = await User.findById(new Types.ObjectId(decodedRefreshToken._id))
              .select('-password')
              .lean();
            
            if (refreshedUser) {
              // Convert ObjectId to string
              const userWithStringId = {
                ...refreshedUser,
                _id: refreshedUser._id.toString()
              };
              
              const newToken = jwt.sign(
                { _id: userWithStringId._id, email: userWithStringId.email },
                JWT_SECRET,
                { expiresIn: '1h' }
              );
              // console.log('New token:', newToken);
              res.cookie('access_token', newToken, { httpOnly: true, secure: true, sameSite: 'strict' });
              req.user = userWithStringId as Express.User;
              return next();
            }
          }
        } catch (error) {
          console.error('Refresh token error:', error);
        }
      }
      
      // console.log('No user found - Unauthorized');
      return res.status(401).json({ message: "Unauthorized - Invalid token" });
    }

    // console.log('Authentication successful');
    req.user = user;
    next();
  })(req, res, next);
};

// Export passport for use in app.ts
export default passport;
