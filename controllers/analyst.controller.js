const AnalystService = require("../services/analyst.service");
const HttpHelper = require("../helpers/http.helper");
const _ = require("lodash");
const fs = require("fs");
class AnalystController {
  async doAnalyst(req, res, next) {
    try {
      const catID = req.query.catID;
      const industryID = req.query.industryID;
      const peMax = req.query.peMax;
      const epsMin = req.query.epsMin;
      const volumeMin = req.query.volumeMin;
      const volumeMax = req.query.volumeMax;
      const closePriceMin = req.query.closePriceMin;
      const closePriceMax = req.query.closePriceMax;
      const days = +req.query.days;
      const closePriceRateMin = +req.query.closePriceRateMin;
      const closePriceRateMax = +req.query.closePriceRateMax;
      let codeHistories = await getCodeHistories(
        catID,
        industryID,
        peMax,
        epsMin
      );
      let result = [];
      for (let index = 0; index < codeHistories.length; index++) {
        const item = codeHistories[index];
        if (!item) continue;
        if (!days || days == 0) {
          if (volumeMin && item.v.slice(-1)[0] < +volumeMin) continue;
          if (volumeMax && item.v.slice(-1)[0] > +volumeMax) continue;
          if (closePriceMin && item.c.slice(-1)[0] < +closePriceMin) continue;
          if (closePriceMax && item.c.slice(-1)[0] > +closePriceMax) continue;
        } else {
          const lastVolumes = item.v.slice(-days);
          const invalidVolumes = lastVolumes.filter((vol) => {
            return (
              (volumeMin && vol < +volumeMin) || (volumeMax && vol > +volumeMax)
            );
          });
          if (invalidVolumes.length > 0) continue;
          const lastClosePrices = item.c.slice(-(days + 1));
          // rate
          if (closePriceRateMin || closePriceRateMax) {
            const firstPrice = lastClosePrices[0];
            const lastPrice = days > lastClosePrices.length ? lastClosePrices.slice(-1)[0] : lastClosePrices[days];
            const priceRate = ((lastPrice - firstPrice) / firstPrice) * 100;
            if (closePriceRateMin && priceRate < +closePriceRateMin) continue;
            if (closePriceRateMax && priceRate > +closePriceRateMax) continue;
          }
          //
          const invalidClosePrices = lastClosePrices.filter((price) => {
            return (
              (closePriceMin && price < +closePriceMin) ||
              (closePriceMax && price > +closePriceMax)
            );
          });
          if (invalidClosePrices.length > 0) continue;
        }

        try {
          const volumesAnalyst = AnalystService.getTotalVolumes(item.v, days);
          const rateClosePriceLast1andX = AnalystService.compareWithLatestPrices(
            item.c,
            days
          );
          const isAccumulatedStock = AnalystService.getBreakPoint(item.v);
          const trend = AnalystService.getNumberOfTrends(item.c, item.o);
          result.push({
            code: item.StockCode,
            lastVolume: volumesAnalyst.lastVolume,
            rateVolLast1andX: volumesAnalyst.rateLastXVolumes,
            rateClosePriceLast1andX,
            lastPrice: item.c.slice(-1)[0],
            lastXPrice: item.c.slice(days && days != 0 ? -(days + 1) : -7)[0],
            isAccumulatedStock: isAccumulatedStock,
            numberOfUps: trend.numberOfUps,
            numberOfDowns: trend.numberOfDowns,
          });
        } catch (ex) {
          console.log(item.StockCode + " -  " + ex);
          result.push({});
        }
      }
      //
      return res.json(result);
    } catch (ex) {
      console.log(ex);
    }
  }

  async doAnalystWithFinancialReport(req, res, next) {
    try {
      const catID = req.query.catID;
      const stockCodes = AnalystService.getStockList(catID);
      for (const key in stockCodes) {
        const stockCode = stockCodes[key];
        const [stockdealDetail, financeInfo] = await Promise.all([
          AnalystService.getStockdealDetailByTime(stockCode),
          AnalystService.getFinanceInfo(stockCode),
        ]);
      }
      return res.json(200);
    } catch (ex) {
      console.log(ex);
    }
  }

  async doAnalystWithCustomFilter(req, res, next) {
    try {
      const catID = req.query.catID;
      const industryID = req.query.industryID;
      const stocks = await AnalystService.getStockDetailList(catID, industryID);
      const filterOption = req.body;

      let arr = filterCustom(stocks, filterOption);

      // for (const key in stockCodes) {
      //   const stockCode = stockCodes[key];
      //   const [stockdealDetail, financeInfo] = await Promise.all([
      //     AnalystService.getStockdealDetailByTime(stockCode),
      //     AnalystService.getFinanceInfo(stockCode),
      //   ]);
      // }
      arr = sortCustom(arr, filterOption);
      return res.json(arr);
    } catch (ex) {
      console.log(ex);
    }
  }

  async getStrangerStock(req, res, next) {
    const days = 14;
    const top = 30;
    const catID = req.query.catID;
    const industryID = req.query.industryID;
    let codeHistories = await getCodeHistories(catID, industryID);
    codeHistories = codeHistories.map((x) => {
      for (let i = 0; i < days + 1; i++) {
        const idx = x.v.length - i - 1;
        x["count"] = 0;
        x["v" + i] = x.v[idx];
      }

      return x;
    });
    let todayTopStockCodes = [];
    // sort by n th -- from newest
    for (let i = 0; i < days + 1; i++) {
      const sortedCodeHistories = _.orderBy(codeHistories, ["v" + i], ["desc"]);
      if (i === 0) {
        todayTopStockCodes = sortedCodeHistories.slice(0, top).map((x) => {
          return { StockCode: x.StockCode };
        });
      } else {
        sortedCodeHistories.slice(0, top).map((x) => {
          let stock = codeHistories.find((k) => k.StockCode == x.StockCode);
          stock["count"]++;
        });
      }
    }

    const topStockCodes = _.orderBy(codeHistories, ["count"], ["desc"])
      .slice(0, top)
      .map((x) => {
        return { StockCode: x.StockCode, Count: x.count };
      });

    const differStockCodes = _.differenceBy(
      todayTopStockCodes,
      topStockCodes,
      "StockCode"
    ).map((x) => {
      let stock = codeHistories.find((k) => k.StockCode == x.StockCode);
      x["Count"] = stock["count"];
      return x;
    });

    return res.json({
      differ: differStockCodes,
      today: todayTopStockCodes,
      top: topStockCodes,
    });
  }
}

module.exports = new AnalystController();

async function getCodeHistories(catID, industryID, peMax, epsMin) {
  const stockCodes = AnalystService.getStockList(
    catID,
    industryID,
    peMax,
    epsMin
  );
  // const stockCodes = ["SSB", "TCH"];
  const today = new Date();
  const toDate = Math.round(today.getTime() / 1000);
  const fromDate = Math.round(HttpHelper.addMonths(-2).getTime() / 1000);

  let promises = [];
  let codeHistories = [];
  let data = [];
  // stockCodes.length
  for (let index = 0; index < stockCodes.length; index++) {
    const stockCode = stockCodes[index];
    const cachedStockHistory = AnalystService.getCachedStockHistories(
      stockCode,
      fromDate,
      toDate
    );
    if (cachedStockHistory) {
      codeHistories = codeHistories.concat(cachedStockHistory);
    } else {
      promises.push(
        AnalystService.getStockHistories(stockCode, fromDate, toDate)
      );
      data = await Promise.all(promises);
      codeHistories = codeHistories.concat(data);
    }
  }
 
  let error = codeHistories.filter((x) => x == undefined).length;
  console.log("ERROR " + error);
  return codeHistories;
}

function filterCustom(arr, filterOption) {
  return arr.filter(function (itemInArr) {
    let isValidItemInArr = true;
    if (filterOption.condition == "AND") {
      for (const key in filterOption.items) {
        const item = filterOption.items[key];
        const str = itemInArr[item.att] + item.operation + item.value;
        if (eval(str) == true) {
          continue;
        } else {
          isValidItemInArr = false;
          break;
        }
      }
    }
    return isValidItemInArr;
  });
}

function sortCustom(arr, filterOption) {
  let fields = [];
  let directions = [];
  fields = filterOption.sort.map((x) => x.field);
  directions = filterOption.sort.map((x) => x.direction);
  arr = _.orderBy(arr, fields, directions);
  return arr;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
