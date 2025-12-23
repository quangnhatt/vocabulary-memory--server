import CategoryController from "../controllers/category.controller.js";

export function load(app) {
  app.post("/api/v1/category/import", CategoryController.importVocabulariesByCategory);
}
