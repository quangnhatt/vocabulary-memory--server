import CrawlController from "../controllers/crawl.controller.js";

export const load = (app) => {
  app.post("/api/v1/dictionary", CrawlController.doCrawl);
};
