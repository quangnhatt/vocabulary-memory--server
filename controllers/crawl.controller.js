const CrawlService = require("../services/crawl.service");
const fs = require("fs");
const HttpHelper = require("../helpers/http.helper");

class CrawlController {
  async doCrawl(req, res, next) {
    try {
      // let stockList = await CrawlService.getStockList()

      // fs.writeFileSync(
      //   "data/stockList.json",
      //   JSON.stringify(stockList),
      //   "utf8",
      //   function () {
      //     console.log("DONE");
      //   }
      // );

      await getTradingInfo();

      return res.json(200);
    } catch (ex) {
      console.log(ex);
    }
  }

  async doCrawlDetail(req, res, next) {
    let stockList = require("../data/stockList.json");
    const toDate = Math.round(HttpHelper.addDays(0).getTime() / 1000);
    const fromDate = Math.round(HttpHelper.addMonths(-3).getTime() / 1000);
    const skippedStockCodes = [];
    const validExchange = ["UPCoM", "HOSE", "HNX"];
    for (let i = 0; i < stockList.length; i++) {
      let stock = stockList[i];
      if (
        !stock ||
        !stock.Code ||
        stock.Code.length != 3 ||
        validExchange.indexOf(stock.Exchange) == -1 ||
        skippedStockCodes.indexOf(stock.Code) > -1
      )
        continue;
      console.log("START " + i + " " + stock.Code);
      await CrawlService.getStockHistories(stock.Code, fromDate, toDate);
      console.log("COMPLETED " + i + " " + stock.Code);
    }

    return res.json(200);
  }

  async doCrawlNews(req, res, next) {
    try {
      const listPost = await CrawlService.crawlData();
      return res.json(listPost);
    } catch (ex) {
      console.log(ex);
    }
  }
}

module.exports = new CrawlController();

async function getTradingInfo() {
  let stockList = require("../data/stockList.json");
  const skippedStockCodes = [
    "AAC",
    "AIA",
    "ALC",
    "ALS",
    "AON",
    "ATC",
    "AVA",
    "BAF",
    "BAV",
    "BBL",
    "BDS",
    "BJC",
    "BNC",
    "BTJ",
    "BTL",
    "BVA",
    "BVC",
  ];
  // stockList = [{Code: "AAC"}]
  const validExchange = ["UPCoM", "HOSE", "HNX"];
  for (let i = 0; i < stockList.length; i++) {
    let stock = stockList[i];
    if (
      !stock ||
      !stock.Code ||
      stock.Code.length != 3 ||
      validExchange.indexOf(stock.Exchange) == -1 ||
      skippedStockCodes.indexOf(stock.Code) > -1
    )
      continue;
    console.log("START " + i + " " + stock.Code);
    let timeout = setTimeout(function () {
      console.log("WRITE FILE SYNC AT " + i);
      writeFileSync(stockList);
    }, 2000);
    const data = await CrawlService.getStockDetail(stock.Code);
    if (!data) return;
    stock.BVPS = data.BVPS;
    stock.Beta = data.Beta;
    stock.Dividend = data.Dividend;
    stock.EPS = data.EPS;
    stock.FEPS = data.FEPS;
    stock.MarketCapital = data.MarketCapital;
    stock.PB = data.PB;
    stock.PE = data.PE;
    stock.OutstandingBuy = data.OutstandingBuy;
    stock.OutstandingSell = data.OutstandingSell;
    console.log("DONE " + i + " - " + stock.Code);
    clearTimeout(timeout);
  }
  console.log("WRITE FILE SYNC DONE");
  writeFileSync(stockList);
}

function writeFileSync(stockList) {
  fs.writeFileSync(
    "data/stockList.json",
    JSON.stringify(stockList),
    "utf8",
    function () {
      console.log("DONE");
    }
  );
}
