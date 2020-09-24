const AnalystService = require("../services/analyst.service");
const HttpHelper = require("../helpers/http.helper");

class AnalystController {
  async doAnalyst(req, res, next) {
    let i = 0;
    try {
      const stockCodes = await AnalystService.getStockList();
      const today = new Date();
      const toDate = today.getTime();
      const fromDate = HttpHelper.addMonths(-6).getTime();

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
        const upBullishEngulfing = AnalystService.getUpBullishEngulfing(
          item.c,
          item.o,
          item.t
        );
        const upHammer = AnalystService.getUpHammer(
          item.c,
          item.o,
          item.h,
          item.l,
          item.t
        );
        const upInvertedHammer = AnalystService.getUpInvertedHammer(
          item.c,
          item.o,
          item.h,
          item.l,
          item.t
        );
        const upMorningStar = AnalystService.getUpMorningStar(
          item.c,
          item.o,
          item.t
        );

        const volumes = AnalystService.getTotalVolumes(item.v);
        const volumesAverageLastSessions = volumes.volumesLastSession;
        const volumesAverageLast7Sessions = volumes.volumesLast7Sessions / 7;

        result.push({
          code: item.StockCode,
          upBullishEngulfing: upBullishEngulfing,
          upHammer: upHammer,
          upInvertedHammer,
          upMorningStar: upMorningStar,
          volumesLastSession: volumes.volumesLastSession,
          volumesLast7Sessions: volumes.volumesLast7Sessions,
          volumesLast14Sessions: volumes.volumesLast14Sessions,
          volumesLast30Sessions: volumes.volumesLast30Sessions,
          volumesLast90Sessions: volumes.volumesLast90Sessions,
          volumesLast120Sessions: volumes.volumesLast120Sessions,
          volumesLast1Per7Sessions: (
            volumesAverageLastSessions /
            ((volumes.volumesLast7Sessions - volumes.volumesLastSession) / 6)
          ).toFixed(2),
          volumesLast7Per14Sessions: (
            volumesAverageLast7Sessions /
            ((volumes.volumesLast14Sessions - volumes.volumesLast7Sessions) / 7)
          ).toFixed(2),
          volumesLast7Per30Sessions: (
            volumesAverageLast7Sessions /
            ((volumes.volumesLast30Sessions - volumes.volumesLast7Sessions) /
              23)
          ).toFixed(2),
          volumesLast7Per90Sessions: (
            volumesAverageLast7Sessions /
            ((volumes.volumesLast90Sessions - volumes.volumesLast7Sessions) /
              83)
          ).toFixed(2),
          volumesLast7Per120Sessions: (
            volumesAverageLast7Sessions /
            ((volumes.volumesLast120Sessions - volumes.volumesLast7Sessions) /
              113)
          ).toFixed(2),
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
