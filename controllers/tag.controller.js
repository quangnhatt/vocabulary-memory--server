import TagService from "../services/tag.service.js";

class TagController {
  async suggest(req, res) {
    try {
      const { userId, q = "" } = req.query;

      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }

      const tags = await TagService.suggestTags(userId, q);
      res.json(tags);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to suggest tags" });
    }
  }
}

export default new TagController();
