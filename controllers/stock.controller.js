const StockService = require("../services/stock.service");

class StockController {
  async getMyAssets(req, res, next) {
    const assets = await StockService.getMyAssets();
    return res.json(assets.stocks);
  }

  async getIndustries(req, res, next) {
    const industries = require("../data/industries.json");
    return res.json(industries);
  }

  async getStockInfo(req, res, next) {
    const stockCodes = req.query.stockCodes.split(",");
    let promises = [];
    let data = [];
    let info = [];
    for (let index = 0; index < stockCodes.length; index++) {
      const stockCode = stockCodes[index];
      promises.push(StockService.getStockInfo(stockCode));
      if (promises.length >= 20) {
        data = await Promise.all(promises);
        info = info.concat(data);
        promises = [];
        await sleep(1000);
      }
    }
    data = await Promise.all(promises);
    info = info.concat(data);
    return res.json(info);
  }

  async getHistories(req, res, next) {
    let data = await StockService.getHistories();
    let histories = data.histories;
    let promises = [];
    for (let index = 0; index < data.dates.length; index++) {
      const date = data.dates[index];
      promises.push(StockService.getMarketPriceByDate(date, "HOSE"));
      promises.push(StockService.getMarketPriceByDate(date, "HNX"));
    }
    const markets = await Promise.all(promises);
    let marketIndexs = [];
    markets.map((item) => {
      if (!item) return;
      marketIndexs.push({
        lowestPrice: item[1][0].LowestPrice,
        trend: item[1][0].ChangeColor,
        date: convertDate(item[1][0].TradingDate),
        stockCode: item[1][0].StockCode,
      });
    });
    for (let index = 0; index < histories.length; index++) {
      let item = histories[index];
      const hose = marketIndexs.find(
        (x) => x.date == item.execDate && x.stockCode == "VN-Index"
      );
      const hnx = marketIndexs.find(
        (x) => x.date == item.execDate && x.stockCode == "HNX-Index"
      );
      if (!hose || !hnx) continue;
      item.marketIndex =
        hose.lowestPrice +
        "(" +
        hose.trend +
        ")" +
        " - " +
        hnx.lowestPrice +
        "(" +
        hnx.trend +
        ")";
    }
    return res.json(histories);
  }

  async getMarketPrice(req, res, next) {
    const data = await StockService.getMarketPrice();
    return res.json(data);
  }

  async getMarketPriceByDate(req, res, next) {
    const floor = req.query.floor;
    const date = req.query.date;
    const data = await StockService.getMarketPriceByDate(date, floor);
    return res.json(data);
  }
}

module.exports = new StockController();

function convertDate(data) {
  function pad(s) {
    return s < 10 ? "0" + s : s;
  }

  var milliseconds = parseInt(data.replace("/Date(", "").replace(")/", ""));
  var date = new Date(milliseconds);
  return (
    date.getFullYear() +
    "-" +
    pad(date.getMonth() + 1) +
    "-" +
    pad(date.getDate())
  );
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
