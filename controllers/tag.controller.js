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
        req.query.regenerated == "true",
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

  async executeShareEndpoint(req, res) {
    const code = req.query.code;

    const iosUniversalLink = `https://bluefenix.io/share/${code}`;
    const androidAppLink = `https://bluefenix.io/share/${code}`;

    const iosStore = "https://apps.apple.com/app/idYOUR_APP_ID";
    const androidStore =
      "https://play.google.com/store/apps/details?id=com.yourcompany.yourapp&referrer=code%3D" +
      encodeURIComponent(code);

    const userAgent = req.headers["user-agent"] || "";

    // Basic UA routing
    if (/iphone|ipad|ipod/i.test(userAgent)) {
      res.redirect(iosUniversalLink);
    } else if (/android/i.test(userAgent)) {
      res.redirect(androidAppLink);
    } else {
      // Desktop → landing page
      res.redirect(`https://bluefenix.io/install?code=${code}`);
    }
  }
}

export default new TagController();
