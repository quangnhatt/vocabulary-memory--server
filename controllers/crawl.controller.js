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
    let stockList = require("../data/stockList.json");
    const skippedStockCodes = ["NSC", "ABT", "VFG"];
    let cnt = 0;
    // stockList = [{StockCode: "NSC"}]
    for (const key in stockList) {
      let stock = stockList[key];
      if (skippedStockCodes.indexOf(stock.StockCode) > -1) continue;
      console.log("START " + stock.StockCode);
      const data = await CrawlService.getStockDetail(stock.StockCode);
      if (!data) continue;
      stock.BVPS = data.BVPS;
      stock.Beta = data.Beta;
      stock.Dividend = data.Dividend;
      stock.EPS = data.EPS;
      stock.FEPS = data.FEPS;
      stock.MarketCapital = data.MarketCapital;
      stock.PB = data.PB;
      stock.PE = data.PE;
      cnt++;
      console.log("DONE " + cnt + " - " + stock.StockCode);
    }

    fs.writeFileSync(
      "data/stockDetailList.json",
      JSON.stringify(stockList),
      "utf8",
      function () {
        console.log("DONE");
      }
    );

    return res.json(200);
  }
}

module.exports = new CrawlController();
