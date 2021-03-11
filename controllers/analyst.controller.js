const AnalystService = require("../services/analyst.service");
const HttpHelper = require("../helpers/http.helper");

class AnalystController {
  async doAnalyst(req, res, next) {
    let i = 0;
    try {
      const board = req.query.board;
      const stockCodes = await AnalystService.getStockList(board);
      // const stockCodes = ["AAA", "VIG"];
      const today = new Date();
      const toDate = today.getTime();
      const fromDate = HttpHelper.addMonths(-2).getTime();

      let promises = [];
      let codeHistories = [];
      let data = [];
      // stockCodes.length
      for (let index = 0; index < stockCodes.length; index++) {
        const stockCode = stockCodes[index];
        i++;

        promises.push(
          AnalystService.getStockHistories(stockCode, fromDate, toDate)
        );
        if (promises.length >= 20) {
          data = await Promise.all(promises);
          codeHistories = codeHistories.concat(data);
          promises = [];
          await sleep(2000);
        }
      }
      data = await Promise.all(promises);
      codeHistories = codeHistories.concat(data);
      let error = codeHistories.filter((x) => x == undefined).length;
      console.log("ERROR " + error);
      let result = [];
      for (let index = 0; index < codeHistories.length; index++) {
        const item = codeHistories[index];
        if (!item) continue;
        const volumes = AnalystService.getTotalVolumes(item.v);
        const priceGrowthRateLast7Days = AnalystService.compareWithLatestPrices(
          7,
          item.o
        );
        const priceGrowthRateLast14Days = AnalystService.compareWithLatestPrices(
          14,
          item.o
        );
        const priceGrowthRateLast30Days = AnalystService.compareWithLatestPrices(
          30,
          item.o
        );
        const last7Trends = AnalystService.getNumberOfTrends(item.c.slice(-8));
        const last2Trends = AnalystService.getNumberOfTrends(item.c.slice(-3));
        result.push({
          code: item.StockCode,
          volumesLastSession: volumes.volumesLastSession,
          volRateLast7Sessions: (volumes.volumesLastSession/ volumes.averageVolumesLast7Sessions).toFixed(2),
          volRateLast14Sessions: (volumes.volumesLastSession/ volumes.averageVolumesLast14Sessions).toFixed(2),
          volRateLast30Sessions: (volumes.volumesLastSession/ volumes.averageVolumesLast30Sessions).toFixed(2),
          priceGrowthRateLast7Days,
          priceGrowthRateLast14Days,
          priceGrowthRateLast30Days,
          lastPrice: item.o.slice(-1)[0],
          last7Price: item.o.slice(-7)[0],
          last14Price: item.o.slice(-14)[0],
          last30Price: item.o.slice(-30)[0],
          numberOfUptrend: last7Trends.numberOfUptrend,
          numberOfDowntrend: last7Trends.numberOfDowntrend,
          last2Uptrend: last2Trends.numberOfUptrend,
          last2Downtrend: last2Trends.numberOfDowntrend
        });
      }
      return res.json(result);
    } catch (ex) {
      console.log(i);
      console.log(ex);
    }
  }
}

module.exports = new AnalystController();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
