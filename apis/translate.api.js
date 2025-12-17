import TranslateController from "../controllers/translate.controller.js";

export function load(app) {
  app.get("/api/v1/translate", (req, res, next) =>
    TranslateController.doTranslate(req, res, next)
  );
}
