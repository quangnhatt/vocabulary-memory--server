import TranslateController from "../controllers/translate.controller.js";
import SyncController from "../controllers/sync.controller.js";

export function load(app) {
  app.get("/api/v1/ext/translate", (req, res, next) =>
    TranslateController.doTranslate(req, res, next)
  );
  app.post("/api/v1/ext/sync/word", SyncController.saveWordByUserCode);
}
