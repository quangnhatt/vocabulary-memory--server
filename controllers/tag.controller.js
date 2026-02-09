import TagService from "../services/tag.service.js";

class TagController {
  async suggest(req, res) {
    const tags = await TagService.suggestTags(req.userId, req.query.q || "");
    res.json(tags);
  }

  async getAllTags(req, res) {
    const tags = await TagService.getAllTags(req.userId);
    res.json(tags);
  }

  async createOrRegenerateSharedCode(req, res) {
    const { success, tagId, tagName, sharedCode, sharedURL } =
      await TagService.createOrRegenerateSharedCode(
        req.userId,
        req.query.tag || "",
        req.query.regenerated == 'true',
      );
    res.json({
      success,
      tagId,
      tagName,
      sharedCode,
      sharedURL,
    });
  }

  async deactivateSharedCode(req, res) {
    const success = await TagService.deactivateSharedCode(
      req.userId,
      req.query.tag || "",
    );
    res.json({
      success,
    });
  }

  async importWordsBySharedCode(req, res) {
    const result = await TagService.importWordsBySharedCode(
      req.userId,
      req.query.sharedTagCode || "",
    );
    res.json(result);
  }
}

export default new TagController();
