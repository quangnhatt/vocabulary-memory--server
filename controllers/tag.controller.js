import TagService from "../services/tag.service.js";

class TagController {
  async suggest(req, res) {
    const tags = await TagService.suggestTags(
      req.userId,
      req.query.q || ""
    );
    res.json(tags);
  }
}

export default new TagController();
