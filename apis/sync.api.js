import SyncController from "../controllers/sync.controller.js";

export const load = (app) => {
  app.post("/api/v1/sync/words", SyncController.syncWords);
};
