"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const passport_jwt_1 = require("passport-jwt");
const passport_1 = __importDefault(require("passport"));
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined in environment variables");
}
const opts = {
    jwtFromRequest: passport_jwt_1.ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: JWT_SECRET,
};
passport_1.default.use(new passport_jwt_1.Strategy(opts, async (jwt_payload, done) => {
    try {
        // Mock user verification (Replace with database logic)
        const user = { id: jwt_payload.id, username: jwt_payload.username };
        // console.log('JWT Payload:', jwt_payload);
        if (user)
            return done(null, user);
        return done(null, false);
    }
    catch (error) {
        return done(error, false);
    }
}));
exports.default = passport_1.default;
