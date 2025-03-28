"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://education:Ee4a2yjrotlpqalG@cluster0.ugi7clf.mongodb.net/education';
const connectDB = async () => {
    try {
        await mongoose_1.default.connect(MONGO_URI, {
            dbName: 'education' // Optional but recommended for clarity
        });
        console.log('Database connected successfully');
        return mongoose_1.default.connection;
    }
    catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1); // Exit process with failure
    }
};
const db = mongoose_1.default.connection;
db.on('error', (err) => {
    console.error('MongoDB Error:', err);
});
exports.default = connectDB;
