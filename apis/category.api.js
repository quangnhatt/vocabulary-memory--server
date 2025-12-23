import CategoryController from "../controllers/category.controller.js";

export function load(app) {
  app.get("/api/v1/category", CategoryController.listSystemCategories);
  app.post("/api/v1/category/import", CategoryController.importVocabulariesByCategory);
}
