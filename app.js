import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { loadAPIs } from "./apis/index.js";   // ES Module import
import { pgPool } from "./db/postgres.js"; // Initialize Postgres connection

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Load API routes
loadAPIs(app);

// Export the app (ESM)
export default app;
