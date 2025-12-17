import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pkg;

export const pgPool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

pgPool.on("connect", () => {
  console.log("✅ PostgreSQL connected");
});

pgPool.on("error", (err) => {
  console.error("❌ PostgreSQL error:", err);
});
