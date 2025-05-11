"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
// Define the schema for challenge room
const ChallengeRoomSchema = new mongoose_1.Schema({
    roomId: { type: String, required: true, unique: true },
    challengerId: { type: String, required: true },
    challengerName: { type: String, required: true },
    challengedId: { type: String, required: true },
    challengedName: { type: String, required: true },
    courseId: { type: String, required: true },
    courseName: { type: String, required: true },
    questions: { type: Array, required: true },
    currentQuestionIndex: { type: Number, default: 0 },
    userScores: { type: mongoose_1.Schema.Types.Mixed, required: true },
    status: {
        type: String,
        enum: ['pending', 'active', 'completed'],
        default: 'pending'
    },
    createdAt: { type: Number, default: () => Date.now() }
});
// Check if model already exists to prevent overwriting
exports.default = mongoose_1.default.models.ChallengeRoom || mongoose_1.default.model('ChallengeRoom', ChallengeRoomSchema);
