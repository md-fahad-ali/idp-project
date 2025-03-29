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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express = __importStar(require("express"));
const http_1 = require("http");
const next = __importStar(require("next"));
const LoginRoute_1 = __importDefault(require("./routes/LoginRoute"));
const signupRoute_1 = __importDefault(require("./routes/signupRoute"));
const protectedRoute_1 = __importDefault(require("./routes/protectedRoute"));
const refreshRoute_1 = __importDefault(require("./routes/refreshRoute"));
const meRoute_1 = __importDefault(require("./routes/meRoute"));
const courseRoute_1 = __importDefault(require("./routes/courseRoute"));
const leaderboardRoute_1 = __importDefault(require("./routes/leaderboardRoute"));
const testRoute_1 = __importDefault(require("./routes/testRoute"));
const userRoute_1 = __importDefault(require("./routes/userRoute"));
const bodyParser = __importStar(require("body-parser"));
const db_1 = __importDefault(require("./routes/db")); // Import the db module
const cookieParser = __importStar(require("cookie-parser"));
const cors = __importStar(require("cors"));
const authMiddleware_1 = __importDefault(require("./lib/authMiddleware")); // Import the configured passport instance
const dev = process.env.NODE_ENV !== 'production';
const nextApp = next.default({ dev });
const handle = nextApp.getRequestHandler();
nextApp
    .prepare()
    .then(async () => {
    const server = express.default();
    // Debug middleware to log all requests (moved to top)
    server.use((req, res, next) => {
        console.log('\n=== New Request ===');
        console.log(`${req.method} ${req.url}`);
        console.log('Headers:', JSON.stringify(req.headers, null, 2));
        console.log('Body:', JSON.stringify(req.body, null, 2));
        console.log('==================\n');
        next();
    });
    // Middleware
    server.use(bodyParser.json());
    server.use(express.json());
    server.use(cookieParser.default());
    // CORS configuration
    server.use(cors.default({
        origin: ['http://localhost:3000'],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        exposedHeaders: ['Authorization'],
    }));
    // Initialize Passport
    server.use(authMiddleware_1.default.initialize());
    // Check database connection
    try {
        await (0, db_1.default)();
        console.log("✅ Database connected successfully");
    }
    catch (error) {
        console.error("❌ Database connection failed:", error);
    }
    // API Routes with error handling
    server.use("/api/auth/signup", signupRoute_1.default);
    server.use("/api/auth/login", LoginRoute_1.default);
    server.use("/api/auth/refresh", refreshRoute_1.default);
    server.use("/api/protected", protectedRoute_1.default);
    server.use("/api/auth/me", meRoute_1.default);
    server.use("/api/course", courseRoute_1.default);
    server.use("/api/leaderboard", leaderboardRoute_1.default);
    server.use("/api/test", testRoute_1.default);
    server.use("/api/user", userRoute_1.default);
    // Handle all other routes with Next.js
    server.all("*", (req, res) => {
        // console.log('Fallback route hit:', req.url);
        return handle(req, res);
    });
    const httpServer = (0, http_1.createServer)(server);
    httpServer.listen(3000, () => {
        console.log("🚀 Custom server listening on http://localhost:3000");
    });
})
    .catch((err) => {
    console.error("Error during app preparation:", err);
});
