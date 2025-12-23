import SystemCategoryService from "../services/system_category.service.js";

class CategoryController {
  async importVocabulariesByCategory(req, res) {
    try {
      const { category_ids } = req.body;

      if (!Array.isArray(category_ids) || category_ids.length === 0) {
        return res.status(400).json({ error: "category_ids required" });
      }

      const result = await SystemCategoryService.importCategories(
        req.userId,
        category_ids
      );
      res.json(result);
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  }

  async listSystemCategories(req, res) {
    try {
      const categories = await SystemCategoryService.getSystemCategories();
      res.json(categories);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to load categories" });
    }
  }
}
export default new CategoryController();
