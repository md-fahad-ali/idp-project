"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const testResultSchema = new mongoose_1.default.Schema({
    userId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    courseId: {
        type: String,
        required: true
    },
    score: {
        type: Number,
        required: true
    },
    totalQuestions: {
        type: Number,
        required: true
    },
    correctAnswers: {
        type: Number,
        required: true
    },
    timeSpent: {
        type: Number, // in seconds
        required: true
    },
    points: {
        type: Number,
        required: true
    },
    completedAt: {
        type: Date,
        default: Date.now
    },
    // New fields for challenges
    isChallenge: {
        type: Boolean,
        default: false
    },
    challengeId: {
        type: String,
        default: null
    },
    opponentId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    }
});
const TestResult = mongoose_1.default.model('TestResult', testResultSchema);
exports.default = TestResult;
