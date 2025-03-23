import express, { Request, Response } from "express";
import { createServer } from "http";
import next from "next";
import LoginRoute from "./routes/LoginRoute";
import signupRoute from "./routes/signupRoute";
import bodyParser from "body-parser";
import connectDB from "./routes/db"; // Import the db module
import cookieParser from "cookie-parser";
import cors from "cors";
import passport from "passport";


const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(async () => {
    const server = express();

    server.use(bodyParser.json());
    server.use(express.json());
    server.use(
      cors({
        origin: "http://localhost:3000",
        credentials: true,
      })
    );
    server.use(cookieParser());
    server.use(passport.initialize());

    // Check database connection
    try {
      await connectDB();
      console.log("✅ Database connected successfully");
    } catch (error) {
      console.error("❌ Database connection failed:", error);
    }

    server.get("/api/hello", (req: Request, res: Response) => {
      res.json({ message: "hello world!" });
    });

    server.use("/api/auth/signup", signupRoute);
    server.use("/api/auth/login", LoginRoute);

    server.all("*", (req: Request, res: Response) => {
      return handle(req, res);
    });

    // Add a catch-all route for unmatched requests
    server.use((req: Request, res: Response) => {
      console.log(`404 Not Found: ${req.method} ${req.originalUrl}`);
      res.status(404).json({ error: "Not Found" });
    });

    const httpServer = createServer(server);
    httpServer.listen(3000, () => {
      console.log("🚀 Custom server listening on http://localhost:3000");
    });
  })
  .catch((err) => {
    console.error("Error during app preparation:", err);
  });
