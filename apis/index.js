// import dotenv from "dotenv";
import { loadModulesInDir } from "../helpers/load-modules.js";
import { requireUser } from "../middlewares/user.middleware.js";

// Load environment variables
// dotenv.config();

export function loadAPIs(app) {
  app.use("/api/v1", requireUser);

  loadModulesInDir("apis", app);
}
