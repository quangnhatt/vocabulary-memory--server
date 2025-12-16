import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ESM replacement for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function loadModulesInDir(dir, app) {
  const currentDirectory = path.resolve(__dirname, `../${dir}`);
  const allFilesInDir = fs.readdirSync(currentDirectory);

  switch (dir) {
    case "apis": {
      for (const file of allFilesInDir) {
        if (file === "index.js") continue;

        const modulePath = path.resolve(currentDirectory, file);

        // Dynamic import instead of require
        const module = await import(modulePath);

        if (module.load) {
          module.load(app);
        }
      }
      break;
    }

    default: {
      for (const file of allFilesInDir) {
        if (file === "index.js") continue;

        const modulePath = path.resolve(currentDirectory, file);
        await import(modulePath);
      }
    }
  }
}
