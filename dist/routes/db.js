"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const connectDB = async () => {
    try {
        // Check if we're in development mode and if a MONGO_URI is provided
        if (process.env.NODE_ENV === 'development' && !process.env.MONGO_URI) {
            console.warn('No MONGO_URI provided in development mode. Using in-memory database mockup.');
            return mongoose_1.default.connection;
        }
        // Timeouts for faster error reporting in case of connection issues
        const connectionOptions = {
            serverSelectionTimeoutMS: 5000, // 5 seconds
            connectTimeoutMS: 10000, // 10 seconds
            socketTimeoutMS: 45000, // 45 seconds
        };
        // Connect to the MongoDB database
        await mongoose_1.default.connect(process.env.MONGO_URI, connectionOptions);
        console.log('MongoDB Connected...');
        return mongoose_1.default.connection;
    }
    catch (err) {
        console.error('MongoDB connection error:', err);
        // In development mode, we can continue without a database connection
        if (process.env.NODE_ENV !== 'development') {
            throw err;
        }
        else {
            console.warn('Continuing without MongoDB connection in development mode');
        }
        return mongoose_1.default.connection;
    }
};
const db = mongoose_1.default.connection;
db.on('error', (err) => {
    console.error('MongoDB Error:', err);
});
exports.default = connectDB;
