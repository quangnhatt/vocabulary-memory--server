import { pgPool } from "/index.js";

async function test() {
  try {
    const res = await pgPool.query("SELECT NOW()");
    console.log("DB time:", res.rows[0]);
    process.exit(0);
  } catch (err) {
    console.error("DB connection failed:", err);
    process.exit(1);
  }
}

test();
