const fetch = require("node-fetch");
const STOCK_DATA = require("../data/stockDetailList.json");
const fs = require("fs");
class AnalystService {
  getTotalVolumes(volumes, numberOfDays = 1) {
    const lastVolume = volumes.slice(-1)[0];
    const volumesWithoutLastVolume = volumes
      .slice(0, -1)
      .slice(-(+numberOfDays + 1));
    const totalLastXVolumes = volumesWithoutLastVolume.reduce(
      (total, vol) => total + vol
    );
    const averageLastXVolumes = (totalLastXVolumes / +numberOfDays).toFixed(0);

    const rateLastXVolumes = (lastVolume / averageLastXVolumes).toFixed(2);

    return {
      lastVolume,
      rateLastXVolumes,
    };
  }

  compareWithLatestPrices(prices, numberOfDays) {
    const lastPrice = prices.slice(-1)[0];
    prices = prices.slice(0, -1);
    const comparedItem = prices.slice(+numberOfDays * -1)[0];
    return (((lastPrice - comparedItem) / comparedItem) * 100).toFixed(2);
  }

  getNumberOfTrends(closePrices, openPrices) {
    const last7ClosePrices = closePrices.slice(-14);
    const last7OpenPrices = openPrices.slice(-14);
    let numberOfUps = 0;
    let numberOfDowns = 0;
    for (let i = 13; i >= 0; i--) {
      if (last7ClosePrices[i] >= last7OpenPrices[i]) {
        if (numberOfDowns == 0) numberOfUps++;
        else break;
      } else {
        if (numberOfUps == 0) numberOfDowns++;
        else break;
      }
    }

    return { numberOfUps, numberOfDowns };
  }

  getBreakPoint(volumes) {
    let isBreakPoint = false;
    let breakIndex = -1;
    for (let index = 0; index < volumes.length - 1; index++) {
      const valToCompare = volumes[index];
      const arrToCompare = volumes.slice(index + 1);
      isBreakPoint = isBreakVolume(valToCompare, arrToCompare);
      if (isBreakPoint) {
        breakIndex = index;
        break;
      }
    }
    return isBreakPoint;
  }

  getStockList(catID = "", industryID = "", peMax = "", epsMin = "") {
    const exchange = getExchange(catID);
    const stockCodes = STOCK_DATA.filter(
      (x) =>
        (!exchange || x.Exchange == exchange) &&
        x.StockCode.length == 3 &&
        (!industryID || x.IndustryID == industryID) &&
        (!epsMin || x.EPS >= +epsMin) &&
        (!peMax || x.PE <= +peMax)
    ).map((x) => x.StockCode);
    return stockCodes;
  }

  async getStockDetailList(catID = 1, industryID) {
    const exchange = getExchange(catID);
    const stockCodes = STOCK_DATA.filter(
      (x) =>
        x.Exchange == exchange &&
        x.StockCode.length == 3 &&
        (!industryID || x.IndustryID == industryID)
    );
    return stockCodes;
  }

  getCachedStockHistories(stockCode, fromDate, toDate) {
    const filePath = "data/stocks/" + stockCode + ".json";
    if (fs.existsSync(filePath)) {
      const STOCK_DATA = require("../" + filePath);
      const lastTime = new Date(STOCK_DATA["LastUpdatedTime"] * 1000).setHours(
        0,
        0,
        0,
        0
      );
      const compareDate = new Date(toDate * 1000);
      const compareHours = compareDate.getHours();
      const compareTime = compareDate.setHours(0, 0, 0, 0);
      if (lastTime == compareTime && (compareHours >= 15 || compareHours <= 8))
        return STOCK_DATA;
    }
    return null;
  }

  async getStockHistories(stockCode, fromDate, toDate) {
    const filePath = "data/stocks/" + stockCode + ".json";
    let data = await fetch(
      "https://api.vietstock.vn/ta/history?symbol=" +
        stockCode +
        "&resolution=D&from=" +
        fromDate +
        "&to=" +
        toDate,
      {
        headers: {
          accept: "*/*",
          "accept-language": "en-US,en;q=0.9",
          "content-type": "text/plain",
          "sec-ch-ua":
            '"Google Chrome";v="89", "Chromium";v="89", ";Not A Brand";v="99"',
          "sec-ch-ua-mobile": "?0",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-site",
        },
        referrer: "https://stockchart.vietstock.vn/",
        referrerPolicy: "strict-origin-when-cross-origin",
        body: null,
        method: "GET",
        mode: "cors",
      }
    ).then((res) => {
      if (res.status == 200) return res.json();
    });

    data = JSON.parse(data);
    data.StockCode = stockCode;
    // update local files
    data.LastUpdatedTime = toDate;
    fs.writeFileSync(filePath, JSON.stringify(data), "utf8", function () {
      console.log("DONE");
    });

    return data;
  }

  async getStockdealDetailByTime(stockCode, timeType = "1Y") {
    let data = await fetch(
      "https://finance.vietstock.vn/data/getstockdealdetailbytime",
      {
        headers: {
          accept: "*/*",
          "accept-language": "en-US,en;q=0.9",
          "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
          "sec-ch-ua":
            '"Google Chrome";v="89", "Chromium";v="89", ";Not A Brand";v="99"',
          "sec-ch-ua-mobile": "?0",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "x-requested-with": "XMLHttpRequest",
          cookie:
            "_ga=GA1.2.1637228069.1600916572; _ga=GA1.3.1637228069.1600916572; __gads=ID=3ad4a460750561d1:T=1600916574:S=ALNI_MaONFDGdXGULuBl-szXLEgvKBJyUA; language=vi-VN; vst_isShowTourGuid=true; isShowLogin=true; vst_usr_lg_token=mZrp0hRqBEW7s0f/+/wVZA==; _gid=GA1.2.1009159127.1616210691; ASP.NET_SessionId=kl4mrzjwqjwf1g40hjdl10gm; finance_viewedstock=AAA,; __RequestVerificationToken=3y4fFJKHrLMqKROOGGeCR44A-9Zi6OtzYI05JofUIm2J1q44QZ4FKYokSSwwyESDHuAyFoSi81HrcxmWUQfo-_otPDVDsTGCQ8_8_LonanA1; _gid=GA1.3.1009159127.1616210691; ats_referrer_history=%5B%22vietstock.vn%22%5D",
        },
        referrer: "https://finance.vietstock.vn/AAA-ctcp-nhua-an-phat-xanh.htm",
        referrerPolicy: "strict-origin-when-cross-origin",
        body:
          "code=" +
          stockCode +
          "&seq=0&timetype=" +
          timeType +
          "&tradingDate=&__RequestVerificationToken=8khPW4DeJ5d16p56hu9ZPBUX2HVkVF0FQ-JMTLq3ZjppPLa-w7Hn6Bv52tPTeCU2xGOwf6fCLOk8p8Olfw60N3lUxaXHskN62gsafiWOgl01",
        method: "POST",
        mode: "cors",
      }
    ).then((res) => {
      if (res.status == 200) return res.json();
    });
    console.log(data);
    return data;
  }

  async getFinanceInfo(stockCode, reportTermType = 2, reportType = "BCTQ") {
    let data = await fetch("https://finance.vietstock.vn/data/financeinfo", {
      headers: {
        accept: "*/*",
        "accept-language": "en-US,en;q=0.9",
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        "sec-ch-ua":
          '"Google Chrome";v="89", "Chromium";v="89", ";Not A Brand";v="99"',
        "sec-ch-ua-mobile": "?0",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "x-requested-with": "XMLHttpRequest",
        cookie:
          "_ga=GA1.2.1637228069.1600916572; _ga=GA1.3.1637228069.1600916572; __gads=ID=3ad4a460750561d1:T=1600916574:S=ALNI_MaONFDGdXGULuBl-szXLEgvKBJyUA; language=vi-VN; vst_isShowTourGuid=true; isShowLogin=true; vst_usr_lg_token=mZrp0hRqBEW7s0f/+/wVZA==; _gid=GA1.2.1009159127.1616210691; ASP.NET_SessionId=kl4mrzjwqjwf1g40hjdl10gm; finance_viewedstock=AAA,; __RequestVerificationToken=3y4fFJKHrLMqKROOGGeCR44A-9Zi6OtzYI05JofUIm2J1q44QZ4FKYokSSwwyESDHuAyFoSi81HrcxmWUQfo-_otPDVDsTGCQ8_8_LonanA1; _gid=GA1.3.1009159127.1616210691; ats_referrer_history=%5B%22vietstock.vn%22%5D",
      },
      referrer: "https://finance.vietstock.vn/" + stockCode + "-ok.htm",
      referrerPolicy: "strict-origin-when-cross-origin",
      body:
        "Code=" +
        stockCode +
        "&Page=1&PageSize=4&ReportTermType=" +
        reportTermType +
        "&ReportType=" +
        reportType +
        "&Unit=1000000&__RequestVerificationToken=8khPW4DeJ5d16p56hu9ZPBUX2HVkVF0FQ-JMTLq3ZjppPLa-w7Hn6Bv52tPTeCU2xGOwf6fCLOk8p8Olfw60N3lUxaXHskN62gsafiWOgl01",
      method: "POST",
      mode: "cors",
    }).then((res) => {
      if (res.status == 200) return res.json();
    });
    console.log(data);
    return data;
  }
}

module.exports = new AnalystService();

function isBreakVolume(value, arrToCompare, ratio = 3) {
  let isBreakPoint = true;
  for (const key in arrToCompare) {
    const valToCompare = arrToCompare[key];
    if (value > valToCompare / ratio || valToCompare < 20000) {
      isBreakPoint = false;
      break;
    }
  }
  return isBreakPoint;
}

function getExchange(catID) {
  let exchange = "";
  switch (catID) {
    case "1":
      exchange = "HOSE";
      break;
    case "2":
      exchange = "HNX";
      break;
    case "5":
      exchange = "UPCoM";
      break;
  }
  return exchange;
}
