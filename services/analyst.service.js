const fetch = require("node-fetch");
const HttpHelper = require("../helpers/http.helper");

class AnalystService {
  getUpBullishEngulfing(closePrices, openPrices, dates) {
    let result = [];
    closePrices = closePrices.slice(-15);
    openPrices = openPrices.slice(-15);
    const len = closePrices.length;
    for (let index = 0; index < len - 1; index++) {
      let last2ClosePrices = closePrices.slice(index, index + 2);
      let last2OpenPrices = openPrices.slice(index, index + 2);
      let isFirstRed = !isGreenCandle(last2ClosePrices[0], last2OpenPrices[0]);
      let isLastGreen = isGreenCandle(last2ClosePrices[1], last2OpenPrices[1]);
      if (!isFirstRed || !isLastGreen) continue;

      if (
        last2OpenPrices[1] < last2ClosePrices[0] &&
        last2ClosePrices[1] > last2OpenPrices[0]
      )
        result.push(
          HttpHelper.convertDateByMilliseconds(dates[index + 1], 1000)
        );
    }
    return result;
  }

  getUpHammer(closePrices, openPrices, highestPrices, lowestPrices, dates) {
    let result = [];
    closePrices = closePrices.slice(-15);
    openPrices = openPrices.slice(-15);
    const len = closePrices.length;
    for (let index = 0; index < len - 3; index++) {
      let last4ClosePrices = closePrices.slice(index, index + 4);
      let last4OpenPrices = openPrices.slice(index, index + 4);
      let last4HighestPrices = highestPrices.slice(index, index + 4);
      let last4LowestPrices = lowestPrices.slice(index, index + 4);
      let hasFirst3RedCandles = isAllRedCandles(
        last4ClosePrices.slice(0, 3),
        last4OpenPrices.slice(0, 3)
      );
      let isLastGreen = isGreenCandle(last4ClosePrices[3], last4OpenPrices[3]);
      if (!hasFirst3RedCandles || !isLastGreen) continue;
      if (
        last4ClosePrices[3] == last4HighestPrices[3] &&
        last4OpenPrices[3] - last4LowestPrices[3] > 0 &&
        last4OpenPrices[3] - last4LowestPrices[3] >
          1.5 * (last4ClosePrices[3] - last4OpenPrices[3])
      )
        result.push(
          HttpHelper.convertDateByMilliseconds(dates[index + 3], 1000)
        );
    }
    return result;
  }

  getUpInvertedHammer(
    closePrices,
    openPrices,
    highestPrices,
    lowestPrices,
    dates
  ) {
    let result = [];
    closePrices = closePrices.slice(-15);
    openPrices = openPrices.slice(-15);
    const len = closePrices.length;
    for (let index = 0; index < len - 3; index++) {
      const last4ClosePrices = closePrices.slice(index, index + 4);
      const last4OpenPrices = openPrices.slice(index, index + 4);
      const last4HighestPrices = highestPrices.slice(index, index + 4);
      const last4LowestPrices = lowestPrices.slice(index, index + 4);
      const hasFirst3RedCandles = isAllRedCandles(
        last4ClosePrices.slice(0, 3),
        last4OpenPrices.slice(0, 3)
      );
      const isLastGreen = isGreenCandle(
        last4ClosePrices[3],
        last4OpenPrices[3]
      );
      if (!hasFirst3RedCandles || !isLastGreen) continue;
      if (
        last4OpenPrices[3] == last4LowestPrices[3] &&
        last4HighestPrices[3] - last4ClosePrices[3] > 0 &&
        last4HighestPrices[3] - last4ClosePrices[3] >
          1.5 * (last4ClosePrices[3] - last4OpenPrices[3])
      )
        result.push(
          HttpHelper.convertDateByMilliseconds(dates[index + 3], 1000)
        );
    }
    return result;
  }

  getUpMorningStar(closePrices, openPrices, dates) {
    let result = [];
    closePrices = closePrices.slice(-15);
    openPrices = openPrices.slice(-15);
    const len = closePrices.length;
    for (let index = 0; index < len - 2; index++) {
      const last3ClosePrices = closePrices.slice(index, index + 3);
      const last3OpenPrices = openPrices.slice(index, index + 3);
      const hasFirst2RedCandles = isAllRedCandles(
        last3ClosePrices.slice(0, 2),
        last3OpenPrices.slice(0, 2)
      );
      const isLastGreen = isGreenCandle(
        last3ClosePrices[2],
        last3OpenPrices[2]
      );
      if (!hasFirst2RedCandles || !isLastGreen) continue;
      if (
        last3ClosePrices[0] > last3OpenPrices[1] &&
        last3ClosePrices[2] * 2 > last3ClosePrices[0] + last3OpenPrices[0]
      )
        result.push(
          HttpHelper.convertDateByMilliseconds(dates[index + 2], 1000)
        );
    }
    return result;
  }

  getTotalVolumes(volumes) {
    const volumesLastSession = volumes.slice(-1)[0];
    volumes = volumes.slice(0, -1);
    const volumesLast7Sessions = volumes
      .slice(-7)
      .reduce((total, vol) => total + vol);
    const averageVolumesLast7Sessions = (volumesLast7Sessions / 7).toFixed(0);

    const volumesLast14Sessions = volumes
      .slice(-14)
      .reduce((total, vol) => total + vol);
    const averageVolumesLast14Sessions = (volumesLast14Sessions / 14).toFixed(
      0
    );

    const volumesLast30Sessions = volumes
      .slice(-30)
      .reduce((total, vol) => total + vol);
    const averageVolumesLast30Sessions = (volumesLast30Sessions / 30).toFixed(
      0
    );

    return {
      volumesLastSession,
      volumesLast7Sessions,
      averageVolumesLast7Sessions,
      averageVolumesLast14Sessions,
      averageVolumesLast30Sessions,
    };
  }

  compareWithLatestPrices(lastNumberOfDays, openPrices) {
    const lastPrice = openPrices.slice(-1)[0];
    openPrices = openPrices.slice(0, -1);
    const comparedItem = openPrices.slice(lastNumberOfDays * -1)[0];
    return (lastPrice / comparedItem).toFixed(2);
  }

  getNumberOfTrends(last7ClosePrices) {
    let numberOfUptrend = 0;
    let numberOfDowntrend = 0;
    for (let i = 0; i < last7ClosePrices.length - 1; i++) {
      let prevPrice = last7ClosePrices[i];
      let currentPrice = last7ClosePrices[i + 1];
      if ((currentPrice - prevPrice) / prevPrice > 0.04) numberOfUptrend++;
      if ((prevPrice - currentPrice) / currentPrice > 0.04) numberOfDowntrend++;
    }

    return { numberOfUptrend, numberOfDowntrend };
  }

  async getStockList(catID = 1) {
    const exchange = getExchange(catID);
    const stockList = require("../data/stockList.json");
    const stockCodes = stockList
      .filter((x) => x.Exchange == exchange)
      .map((x) => x.StockCode);
    return stockCodes;
  }

  async getStockHistories(stockCode, fromDate, toDate) {
    const url =
      "https://dchart-api.vndirect.com.vn/dchart/history?resolution=D&symbol=" +
      stockCode +
      "&from=" +
      fromDate.toString().slice(0, -3) +
      "&to=" +
      toDate.toString().slice(0, -3);
    const data = await fetch(url, {
      headers: {
        accept: "application/json, text/plain, */*",
        "accept-language": "en-US,en;q=0.9",
        "cache-control": "no-cache",
        pragma: "no-cache",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
      },
      referrerPolicy: "no-referrer-when-downgrade",
      body: null,
      method: "GET",
      mode: "cors",
    }).then((res) => {
      if (res.status == 200) return res.json();
    });
    if (data) data.StockCode = stockCode;

    return data;
  }
}

module.exports = new AnalystService();

function isGreenCandle(closePrice, openPrice) {
  return closePrice > openPrice;
}

function isAllRedCandles(closePrices, openPrices) {
  const len = closePrices.length;
  let isValid = true;
  for (let i = 0; i < len; i++) {
    if (closePrices[i] > openPrices[i]) {
      isValid = false;
      break;
    }
  }
  return isValid;
}

function getExchange(catID) {
  let exchange = "HOSE";
  switch (catID) {
    case 1:
      exchange = "HOSE";
      break;
    case 2:
      exchange = "HNX";
      break;
    case 3:
      exchange = "UPCoM";
      break;
  }
  return exchange;
}
