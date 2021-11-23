const fetch = require("node-fetch");
const HttpHelper = require("../helpers/http.helper");

class StockService {
  async getMyAssets() {
    let url = "https://trade-api.vndirect.com.vn/accounts/v3/0001208904/stocks";
    let options = {
      headers: {
        accept: "application/json, text/plain, */*",
        "accept-language": "en-US,en;q=0.9",
        "cache-control": "no-cache",
        pragma: "no-cache",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
      },
      referrer: "https://trade.vndirect.com.vn/giao-dich-chung-khoan/tong-quan",
      referrerPolicy: "no-referrer-when-downgrade",
      body: null,
      method: "GET",
      mode: "cors",
    };
    let res = await HttpHelper.fetch(url, options);
    return res;
  }

  async getHistories() {
    var today = new Date().toISOString().slice(0, 10);
    let url =
      `https://trade-report-api.vndirect.com.vn/accounts/0001208904/orders_history/?fromDate=2020-07-07&toDate=` +
      today +
      `&pageSize=1000`;
    let options = {
      headers: {
        accept: "application/json, text/plain, */*",
        "accept-language": "en-US,en;q=0.9",
        "cache-control": "no-cache",
        pragma: "no-cache",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
      },
      referrer: "https://trade.vndirect.com.vn/lich-su-mua-ban",
      referrerPolicy: "no-referrer-when-downgrade",
      body: null,
      method: "GET",
      mode: "cors",
    };

    let result = [];
    let dates = [];
    let data = await HttpHelper.fetch(url, options);
    let tigs = [];
    let hbs = [];
    for (let index = 0; index < data.length; index++) {
      const item = data[index];

      // if (item.symbol  == "TIG")
      //  { tigs.push(item);
      //   continue;
      //  }
      //  if (item.symbol  == "HBS")
      //  { hbs.push(item);
      //   continue;
      //  }
      if (!item.histOrderReports) continue;
      for (let i = 0; i < item.histOrderReports.length; i++){
        let histItem = item.histOrderReports[i];
        if (histItem && histItem.matchQuantity > 0){
          let newItem;
          newItem = {
            symbol: histItem.symbol,
            execType: histItem.execType,
            execDate: histItem.transactionDate.substring(0, 10),
            execQuantity: histItem.matchQuantity,
            execPrice: +histItem.matchPrice,
            execAmount: histItem.matchQuantity * (+histItem.matchPrice),
          };
          if (dates.indexOf(item.transactionDate.substring(0, 10)) == -1)
            dates.push(item.transactionDate.substring(0, 10));
          result.push(newItem);
        }
      }
      
    }
    return {
      histories: result,
      dates,
    };
  }

  async getStockInfo(stockCode) {
    let data = await fetch("https://finance.vietstock.vn/company/tradinginfo", {
      headers: {
        accept: "*/*",
        "accept-language": "en-US,en;q=0.9",
        "cache-control": "no-cache",
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        pragma: "no-cache",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "x-requested-with": "XMLHttpRequest",
      },
      referrerPolicy: "no-referrer-when-downgrade",
      body: "code=" + stockCode + "&s=0&t=",
      method: "POST",
      mode: "cors",
    }).then((res) => {
      if (res.status == 200) return res.json();
    });
    return data;
  }

  async getMarketPrice() {
    let data = await fetch(
      "https://finance.vietstock.vn/data/getmarketprice?type=2",
      {
        headers: {
          accept: "*/*",
          "accept-language": "en-US,en;q=0.9",
          "cache-control": "no-cache",
          pragma: "no-cache",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "x-requested-with": "XMLHttpRequest",
        },
        referrerPolicy: "no-referrer-when-downgrade",
        body: null,
        method: "GET",
        mode: "cors",
      }
    ).then((res) => {
      if (res.status == 200) return res.json();
    });
    return data;
  }

  async getMarketPriceByDate(fromDate, toDate, floor) {
    let catID = 1;
    let stockID = -19;
    if (floor == "HNX") {
      catID = 2;
      stockID = -18;
    }

    

    const data = await fetch(
      "https://finance.vietstock.vn/data/KQGDThongKeGiaStockPaging?page=1&pageSize=30&catID=" +
        catID +
        "&stockID=" +
        stockID +
        "&fromDate=" +
        fromDate +
        "&toDate=" +
        toDate,
      {
        headers: {
          accept: "*/*",
          "accept-language": "en-US,en;q=0.9",
          "sec-ch-ua":
            '"Google Chrome";v="89", "Chromium";v="89", ";Not A Brand";v="99"',
          "sec-ch-ua-mobile": "?0",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "x-requested-with": "XMLHttpRequest",
          cookie:
            "_ga=GA1.2.1637228069.1600916572; _ga=GA1.3.1637228069.1600916572; __gads=ID=3ad4a460750561d1:T=1600916574:S=ALNI_MaONFDGdXGULuBl-szXLEgvKBJyUA; language=vi-VN; vst_usr_lg_token=mZrp0hRqBEW7s0f/+/wVZA==; _gid=GA1.2.52334258.1618156736; _gid=GA1.3.52334258.1618156736; ASP.NET_SessionId=errfgvbb4tgrx2h3kzhfz4yc; __RequestVerificationToken=03tRlVv5xtmJryyyZBM-F9Q_CHFv1-jk8hHzR-NSgBTzWWijFzxjHfFllk5auZRuk3XAQyFelZr9Pg9x87wGNLyAts-Fn41x7UaiwTwkgPk1; isShowLogin=true; finance_viewedstock=ACM,APC,; ats_referrer_history=%5B%22vietstock.vn%22%2C%22finance.vietstock.vn%22%2C%22finance.vietstock.vn%22%2C%22finance.vietstock.vn%22%2C%22finance.vietstock.vn%22%2C%22finance.vietstock.vn%22%2C%22finance.vietstock.vn%22%2C%22finance.vietstock.vn%22%2C%22finance.vietstock.vn%22%2C%22finance.vietstock.vn%22%5D; _gat_UA-1460625-2=1",
        },
        referrer:
          "https://finance.vietstock.vn/ket-qua-giao-dich?tab=thong-ke-gia&exchange=1&code=" + stockID,
        referrerPolicy: "strict-origin-when-cross-origin",
        body: null,
        method: "GET",
        mode: "cors",
      }
    ).then((res) => {
      if (res.status == 200) return res.json();
    });
    return data;
  }
}

module.exports = new StockService();
