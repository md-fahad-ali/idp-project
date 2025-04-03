import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import passport from "passport";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined in environment variables");
}

const opts = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: JWT_SECRET,
};

passport.use(
  new JwtStrategy(opts, async (jwt_payload, done) => {
    try {
      // Mock user verification (Replace with database logic)
      const user = { id: jwt_payload.id, username: jwt_payload.username };
      // console.log('JWT Payload:', jwt_payload);
      if (user) return done(null, user);
      return done(null, false);
    } catch (error) {
      return done(error, false);
    }
  })
);

export default passport;
