import SystemCategoryService from "../services/system_category.service.js";

class CategoryController {
  async importVocabulariesByCategory(req, res) {
    try {
      const { category_id } = req.body;

      if (!category_id) {
        return res.status(400).json({ error: "category_id required" });
      }

      const result = await SystemCategoryService.importCategories(
        req.userId,
        category_id
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
