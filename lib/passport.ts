//create passport config here also export the passport so i can access it from other files
import passport from "passport";
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import dotenv from 'dotenv';
dotenv.config();

// Define the JWT secret and refresh secret from environment variables
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

// Define interfaces first
interface JwtPayload {
  username: string;
  jti: string;
}

interface Done {
  (error: Error | null, user?: any, info?: any): void;
}

// Make sure secretOrKey is required and not undefined
const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: JWT_SECRET || '', // Provide a default empty string if JWT_SECRET is undefined
};

// Use the JwtStrategy with the jwtOptions
passport.use(
  new JwtStrategy(jwtOptions, (payload: JwtPayload, done: Done) => {
    if (payload.username) {
      return done(null, { username: payload.username, jti: payload.jti });
    }
    return done(null, false);
  })
);

// Serialize the user
passport.serializeUser((user: any, done) => {
  done(null, user);
});

// Deserialize the user
passport.deserializeUser((user: any, done) => {
  done(null, user);
});

// Export the passport instance
export default passport;
