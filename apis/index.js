import { loadModulesInDir } from "../helpers/load-modules.js";

export function loadAPIs(app) {
    loadModulesInDir("apis", app);
}
