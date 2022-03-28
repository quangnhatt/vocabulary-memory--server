const fetch = require("node-fetch");
const fs = require("fs");
const _ = require('lodash');
const { extractData: extractDataVNExpress } = require('../helpers/vnexpress.helper');

class CrawlService {
  async getStockList() {
    let stockList = [];
    const b = await fetch("https://finance.vietstock.vn/data/sectionindex", {
      headers: {
        accept: "*/*",
        "accept-language": "en-US,en;q=0.9",
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        "sec-ch-ua":
          '"Google Chrome";v="95", "Chromium";v="95", ";Not A Brand";v="99"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"macOS"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "x-requested-with": "XMLHttpRequest",
        cookie:
          "_ga=GA1.2.1637228069.1600916572; _ga=GA1.3.1637228069.1600916572; __gads=ID=3ad4a460750561d1:T=1600916574:S=ALNI_MaONFDGdXGULuBl-szXLEgvKBJyUA; Theme=Light; AnonymousNotification=; language=vi-VN; _gid=GA1.2.874915460.1635818233; ASP.NET_SessionId=qcx5kri2vn52anhcyiyb01x0; __RequestVerificationToken=iQeOgKsca0p4uwpX0lRsblhUSJiuYwFvVh7iwjnB5WrldNd8SCWXvJOJ2ONZPrNGb0l_P4Roh8xaxHlXoH5Q3iPWFWnyPYuuj_-Tt1Rw1dQ1; _gid=GA1.3.874915460.1635818233; vts_usr_lg=A9134BCBA32675EF6D73DAF5B4F04F976BC39DCD0FEF6347CC75FF411030556AA254AD330E4320709EAD2793479A311188749C101B4D91989DFC6A458EEFD742DF13F32DE1BB5E436F103DFFB2F98A236A9E4A4A06B0BE5A43B14A196594FAC0220CA72FD243906AF3D261DC8A5591ACD6FE0ED69B41F70417BEC42EE660186D; vst_usr_lg_token=+iqU50z0YUu2z3Mr9NvztQ==; isShowLogin=true; finance_viewedstock=AAA,; _gat_gtag_UA_1460625_2=1",
        Referer: "https://finance.vietstock.vn/chi-so-nganh.htm",
        "Referrer-Policy": "strict-origin-when-cross-origin",
      },
      body: "type=1&__RequestVerificationToken=usUYYG7mF8tQ6HXAFGPh_94TTVCeCTonQ6mP39yQdXCDCPID-0dvi_M1A7Z58-wOF5NWzAjRMVQpR0tpWCK6smQAUxTFv5E_rGPCtJvyRDf_uST3iBKz5lOAfkExtbW70",
      method: "POST",
    })
      .then((res) => {
        console.log(res);
        if (res.status == 200) return res.json();
      })
      .catch((e) => console.log(e));

    for (let i = 1; i < 65; i++) {
      const data = await fetch({
        url: "https://finance.vietstock.vn/data/corporateaz",
        headers: {
          accept: "*/*",
          "accept-language": "en-US,en;q=0.9",
          "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
          "sec-ch-ua":
            '"Google Chrome";v="95", "Chromium";v="95", ";Not A Brand";v="99"',
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": '"macOS"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "x-requested-with": "XMLHttpRequest",
          cookie:
            "_ga=GA1.2.1637228069.1600916572; _ga=GA1.3.1637228069.1600916572; __gads=ID=3ad4a460750561d1:T=1600916574:S=ALNI_MaONFDGdXGULuBl-szXLEgvKBJyUA; Theme=Light; AnonymousNotification=; language=vi-VN; _gid=GA1.2.874915460.1635818233; ASP.NET_SessionId=qcx5kri2vn52anhcyiyb01x0; __RequestVerificationToken=iQeOgKsca0p4uwpX0lRsblhUSJiuYwFvVh7iwjnB5WrldNd8SCWXvJOJ2ONZPrNGb0l_P4Roh8xaxHlXoH5Q3iPWFWnyPYuuj_-Tt1Rw1dQ1; _gid=GA1.3.874915460.1635818233; finance_viewedstock=NBB,PTG,; vts_usr_lg=A9134BCBA32675EF6D73DAF5B4F04F976BC39DCD0FEF6347CC75FF411030556AA254AD330E4320709EAD2793479A311188749C101B4D91989DFC6A458EEFD742DF13F32DE1BB5E436F103DFFB2F98A236A9E4A4A06B0BE5A43B14A196594FAC0220CA72FD243906AF3D261DC8A5591ACD6FE0ED69B41F70417BEC42EE660186D; vst_usr_lg_token=+iqU50z0YUu2z3Mr9NvztQ==",
          Referer: "https://finance.vietstock.vn/doanh-nghiep-a-z?page=1",
          "Referrer-Policy": "strict-origin-when-cross-origin",
        },
        body:
          "catID=0&industryID=0" +
          "&page=" +
          i +
          "&pageSize=50&type=0&code=&businessTypeID=0&orderBy=Code&orderDir=ASC&__RequestVerificationToken=Dst5H2URMI3oWNqPyYjlUCKw0R7-e_YPhEW9gZMmGR_zfXUbl_u960LZNk4SvFvaqZzyt4iBgrZ4MvT2nXBzlXB6HtfOUYzYw6d5Ez3suJA64xh1ndqE2yMrDZwr5fV40",
        method: "POST",
      })
        .then((res) => {
          console.log(res);
          if (res.status == 200) return res.json();
        })
        .catch((e) => console.log(e));
      console.log("DONE PAGE " + i + " - TOTAL ITEMS:" + data.length);
      stockList = [...stockList, ...data];
    }

    return stockList;
  }

  async getStockDetail(stockCode) {
    let data;
    try {
      data = await fetch("https://finance.vietstock.vn/company/tradinginfo", {
        headers: {
          accept: "*/*",
          "accept-language": "en-US,en;q=0.9",
          "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
          "sec-ch-ua":
            '"Google Chrome";v="95", "Chromium";v="95", ";Not A Brand";v="99"',
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": '"macOS"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "x-requested-with": "XMLHttpRequest",
          cookie:
            "_ga=GA1.2.1637228069.1600916572; _ga=GA1.3.1637228069.1600916572; __gads=ID=3ad4a460750561d1:T=1600916574:S=ALNI_MaONFDGdXGULuBl-szXLEgvKBJyUA; Theme=Light; AnonymousNotification=; language=vi-VN; _gid=GA1.2.874915460.1635818233; ASP.NET_SessionId=qcx5kri2vn52anhcyiyb01x0; __RequestVerificationToken=iQeOgKsca0p4uwpX0lRsblhUSJiuYwFvVh7iwjnB5WrldNd8SCWXvJOJ2ONZPrNGb0l_P4Roh8xaxHlXoH5Q3iPWFWnyPYuuj_-Tt1Rw1dQ1; _gid=GA1.3.874915460.1635818233; vts_usr_lg=A9134BCBA32675EF6D73DAF5B4F04F976BC39DCD0FEF6347CC75FF411030556AA254AD330E4320709EAD2793479A311188749C101B4D91989DFC6A458EEFD742DF13F32DE1BB5E436F103DFFB2F98A236A9E4A4A06B0BE5A43B14A196594FAC0220CA72FD243906AF3D261DC8A5591ACD6FE0ED69B41F70417BEC42EE660186D; vst_usr_lg_token=+iqU50z0YUu2z3Mr9NvztQ==; isShowLogin=true; _gat_gtag_UA_1460625_2=1; finance_viewedstock=AAA,",
          Referer:
            "https://finance.vietstock.vn/AAA-ctcp-nhua-an-phat-xanh.htm",
          "Referrer-Policy": "strict-origin-when-cross-origin",
        },
        body:
          "code=" +
          stockCode +
          "&s=0&t=&__RequestVerificationToken=PRESouqt-voFpDcG3LAQmGpsYDgRGFBhPoZmBcf4TWK9viLKt9r4yi0-WtMKPz_p7pl3hiNfJYUahzjEyweseAFEl7EkXDK2dfDkD45FZEbbb5I0V3-3W0WTRJ6YIDnF0",
        method: "POST",
      })
        .then((res) => res.json())

        .catch((ex) => {
          console.log(ex);
        });
    } catch (ex) {
      console.log(ex);
    }
    return data;
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
            '"Google Chrome";v="95", "Chromium";v="95", ";Not A Brand";v="99"',
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": '"macOS"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-site",
          Referer: "https://stockchart.vietstock.vn/",
          "Referrer-Policy": "strict-origin-when-cross-origin",
        },
        body: null,
        method: "GET",
      }
    ).then((res) => {
      if (res.status == 200) return res.json();
    });

    data = JSON.parse(data);
    data.StockCode = stockCode;
    fs.writeFileSync(filePath, JSON.stringify(data), "utf8", function () {
      console.log("DONE");
    });

    return data;
  }

  async crawlData(){
    const data = await extractDataVNExpress();
    const listPost = _.chunk(data, 10);
    // let postNews = [];
    // for (const posts of listPost) {
    //     const news = await newRepository.create(posts);
    //     postNews = [...postNews, ...news];
    // }

    return listPost;
}
}
module.exports = new CrawlService();
