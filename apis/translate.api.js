import TranslateController from "../controllers/translate.controller.js";
import DictionaryController from "../controllers/dictionary.controller.js";

export function load(app) {
  app.get("/api/v1/translate", (req, res, next) =>
    TranslateController.doTranslate(req, res, next)
  );

  app.get("/api/v1/dictionary", (req, res, next) =>
    DictionaryController.getDictionary(req, res, next)
  );
}
