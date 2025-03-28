import * as express from "express";
import * as bodyParser from "body-parser";
import * as cookieParser from "cookie-parser";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

const app = express.default();

// Middleware
app.use(bodyParser.json());
app.use(express.json());
app.use(cookieParser.default());

// Simple route for testing
app.get("/api/test", (req, res) => {
  res.json({ message: "API is working!" });
});

app.get("/", (req, res) => {
  res.send("Hello from ArcadeEdu!");
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 