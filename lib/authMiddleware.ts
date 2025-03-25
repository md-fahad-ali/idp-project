import passport from "passport";
import { ExtractJwt, Strategy as JwtStrategy } from "passport-jwt";
import User from "../models/User"; // Import your User model
import { configDotenv } from "dotenv";
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// Define the JWT payload interface
interface JwtPayload {
  _id: string;
  email: string;
  iat?: number;
  exp?: number;
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
    const user = await User.findById(jwtPayload._id);
    console.log('Found user:', user);
    
    if (user) {
      return done(null, user);
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
  console.log('Auth Header:', req.headers.authorization);
  
  passport.authenticate('jwt', { session: false }, async (err: unknown, user: unknown) => {
    console.log('Passport authenticate callback');
    console.log('Error:', err);
    console.log('User:', user);

    if (err) {
      console.error('Authentication error:', err);
      return res.status(500).json({ message: "Internal server error", error: (err as Error).message });
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
          
          const decodedRefreshToken = jwt.verify(refreshToken, refreshSecret) as JwtPayload;
          if (decodedRefreshToken) {
            const user = await User.findById(decodedRefreshToken._id);
            if (user) {
              const newToken = jwt.sign({ _id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '10s' });
              console.log('New token:', newToken);
              res.cookie('access_token', newToken, { httpOnly: true, secure: true, sameSite: 'strict' });
              req.user = user;
              return next();
            }
          }
        } catch (error) {
          console.error('Refresh token error:', error);
        }
      }
      
      console.log('No user found - Unauthorized');
      return res.status(401).json({ message: "Unauthorized - Invalid token" });
    }

    // if (!user) {
    //   return res.status(401).json({ message: "Unauthorized - Invalid token" });
    // }

    console.log('Authentication successful');
    req.user = user;
    next();
  })(req, res, next);
};

// Export passport for use in app.ts
export default passport;
