import CrawlService from "../services/crawl.service.js";

class CrawController {
  async doCrawl(req, res) {
    const result = await CrawlService.crawlCambridgeDictionary(
      req.userId,
      req.body.word|| ""
    );
    res.json(result);
  }
}

export default new CrawController();
