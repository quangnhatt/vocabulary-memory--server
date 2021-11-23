const StockService = require("../services/stock.service");
const moment = require("moment");
const _ = require("lodash");
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
    let groupped = _.chain(histories)
      .groupBy("symbol")
      .map((value, key) => ({ symbol: key, details: value }))
      .value();

    let totalProfit = 0;
    for (let index = 0; index < groupped.length; index++) {
      let item = groupped[index];
      let reversedDetails = item.details;
      if (reversedDetails.length == 0) continue;
      let profit = 0;
      let nbAmount = 0;
      let nsAmount = 0;
      let averagePrice = 0;
      let quantity = 0;

      _.reverse(reversedDetails).map((detail) => {
        if (detail.execType == "NS") {
          nsAmount += detail.execAmount;
          quantity -= detail.execQuantity;

          //
          profit += +(((detail.execPrice - averagePrice) * detail.execQuantity).toFixed(0));

          //
          nbAmount -= (detail.execQuantity * averagePrice);
        }
        if (detail.execType == "NB") {
          nbAmount += detail.execAmount;
          quantity += detail.execQuantity;

          averagePrice = +((nbAmount / quantity).toFixed(3));
        }
        
      });
      item.profit = profit;
      totalProfit += item.profit;
    }
  
    return res.json({
      totalProfit: totalProfit,
      histories: histories,
      grouppedHistories: groupped
    });
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
