import express, { Request, Response } from "express";
import { createServer } from "http";
import next from "next";
import LoginRoute from "./routes/LoginRoute";
import signupRoute from "./routes/signupRoute";
import protectedRoute from "./routes/protectedRoute";
import bodyParser from "body-parser";
import connectDB from "./routes/db"; // Import the db module
import cookieParser from "cookie-parser";
import cors from "cors";
import passport from "./lib/authMiddleware"; // Import the configured passport instance

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(async () => {
    const server = express();

    // Debug middleware to log all requests (moved to top)
    // server.use((req, res, next) => {
    //   console.log('\n=== New Request ===');
    //   console.log(`${req.method} ${req.url}`);
    //   console.log('Headers:', JSON.stringify(req.headers, null, 2));
    //   console.log('Body:', JSON.stringify(req.body, null, 2));
    //   console.log('==================\n');
    //   next();
    // });

    // Middleware
    server.use(bodyParser.json());
    server.use(express.json());
    server.use(cookieParser());

    // CORS configuration
    server.use(
      cors({
        origin: ['http://localhost:3000'],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        exposedHeaders: ['Authorization'],
      })
    );

    // Initialize Passport
    server.use(passport.initialize());

    // Check database connection
    try {
      await connectDB();
      console.log("✅ Database connected successfully");
    } catch (error) {
      console.error("❌ Database connection failed:", error);
    }

    // API Routes with error handling
    server.use("/api/auth/signup", signupRoute);
    server.use("/api/auth/login", LoginRoute);
    server.use("/api/protected", protectedRoute);

    // Handle all other routes with Next.js
    server.all("*", (req: Request, res: Response) => {
      // console.log('Fallback route hit:', req.url);
      return handle(req, res);
    });

    const httpServer = createServer(server);
    httpServer.listen(3000, () => {
      console.log("🚀 Custom server listening on http://localhost:3000");
    });
  })
  .catch((err) => {
    console.error("Error during app preparation:", err);
  });
