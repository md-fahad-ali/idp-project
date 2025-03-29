"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateToken = void 0;
const dotenv_1 = require("dotenv");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
(0, dotenv_1.configDotenv)();
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined in environment variables");
}
if (!JWT_REFRESH_SECRET) {
    throw new Error("JWT_REFRESH_SECRET is not defined in environment variables");
}
const generateToken = (_id, email, isRefreshToken = false) => {
    const userId = typeof _id === 'string' ? _id : _id.toString();
    const expiresIn = isRefreshToken ? "30d" : "10s";
    return jsonwebtoken_1.default.sign({ _id: userId, email }, isRefreshToken ? JWT_REFRESH_SECRET : JWT_SECRET, { expiresIn });
};
exports.generateToken = generateToken;
