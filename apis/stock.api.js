const StockController = require('../controllers/stock.controller');
const AnalystController = require('../controllers/analyst.controller');
const CrawlController = require('../controllers/crawl.controller');

exports.load = (app) => {
    app.get('/api/v1/assets', StockController.getMyAssets);
    app.get('/api/v1/histories', StockController.getHistories);
    app.get('/api/v1/market-price', StockController.getMarketPrice);
    app.get('/api/v1/market-price-by-date', StockController.getMarketPriceByDate);
    app.get('/api/v1/stock-info', StockController.getStockInfo);
    app.get('/api/v1/analyst', AnalystController.doAnalyst);
    app.get('/api/v1/crawl', CrawlController.doCrawl);
    app.get('/api/v1/crawl/detail', CrawlController.doCrawlDetail);
};