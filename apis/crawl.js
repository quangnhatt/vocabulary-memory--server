const CrawlerController = require('../controllers/crawl.controller');

exports.load = (app) => {
    app.get('/api/v1/crawl-news', CrawlerController.doCrawlNews);
};