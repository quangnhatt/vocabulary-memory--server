const CrawlService = require("../services/crawl.service");
const fs = require("fs");

class CrawlController {
  async doCrawl(req, res, next) {
    try {
      const industries = require("../data/industries.json");
      const industryIDs = industries.map((x) => x.ID);
      const catIDs = [1, 2, 5]; //HOSE, HNX, UPCoM
      let stockList = [];
      for (const i in catIDs) {
        const catID = catIDs[i];
        for (const key in industryIDs) {
          stockList = stockList.concat(
            await CrawlService.getStockList(catID, industryIDs[key])
          );
        }
      }
      console.log(stockList);
      fs.writeFileSync(
        "data/stockList.json",
        JSON.stringify(stockList),
        "utf8",
        function () {
          console.log("DONE");
        }
      );
      return res.json(200);
    } catch (ex) {
      console.log(ex);
    }
  }

  async doCrawlDetail(req, res, next) {
    const stockList = require("../data/stockList.json");
    console.log(stockList);
    return res.json(200);
  }
}

module.exports = new CrawlController();
