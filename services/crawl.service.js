const fetch = require("node-fetch");

class CrawlService {
  async getStockList(
    catID = 1,
    industryID = 0,
    currentPage = 1,
    stockList = []
  ) {
    const data = await fetch("https://finance.vietstock.vn/data/corporateaz", {
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
          "_ga=GA1.2.1637228069.1600916572; _ga=GA1.3.1637228069.1600916572; __gads=ID=3ad4a460750561d1:T=1600916574:S=ALNI_MaONFDGdXGULuBl-szXLEgvKBJyUA; language=vi-VN; vst_isShowTourGuid=true; _gid=GA1.2.616838540.1615727645; ASP.NET_SessionId=strwkfum24gqicf2wp213is3; __RequestVerificationToken=MA4Y6U_44KLEdfpq2ga1tQJFEUjCto-LYh-DIuZDiXtob5csxNjNl3a1j9wLmNgrKCw2N8XDX76S4UnK-yldYT1US4zMZG0mElNbwYN8BGc1; _gid=GA1.3.616838540.1615727645; isShowLogin=true; vts_usr_lg=6F04264A61D5487896D168FEF0CE8CE0FC646C0FA5DF72B85D4253EC26D93EE82870CB8606F85FE07FB88DF56B7FF25F949F3EB9860832FE123AC1061569E5D2BE4F793CC4FCAA0BCA4A95CBBC9D66EA936FB91B451A8339B7ABD9EA745E81F3DFC827ABE3B2C23A151EE795FADC29B6C4A21272A56873320362D80CAD5F9B17; vst_usr_lg_token=mZrp0hRqBEW7s0f/+/wVZA==; finance_viewedstock=GAS,DXG,THD,VNP,DGW,PET,GVR,AAS,VGI,OCB,A32,DRH,BID,VIETNHATFPT,AAUS,; ats_referrer_history=%5B%22finance.vietstock.vn%22%2C%22finance.vietstock.vn%22%2C%22finance.vietstock.vn%22%2C%22finance.vietstock.vn%22%2C%22finance.vietstock.vn%22%2C%22finance.vietstock.vn%22%2C%22finance.vietstock.vn%22%5D",
      },
      referrer: "https://finance.vietstock.vn/doanh-nghiep-a-z?page=1",
      referrerPolicy: "strict-origin-when-cross-origin",
      body:
        "catID=" +
        catID +
        "&industryID=" +
        industryID +
        "&page=" +
        currentPage +
        "&pageSize=50&type=0&code=&businessTypeID=0&orderBy=Code&orderDir=ASC",
      method: "POST",
      mode: "cors",
    }).then((res) => {
      if (res.status == 200) return res.json();
    });

    stockList = stockList.concat(
      data.map((x) => ({
        ID: x.ID,
        CatID: x.CatID,
        StockCode: x.Code,
        CompanyName: x.Name,
        Exchange: x.Exchange,
        IndustryID: industryID,
        IndustryName: x.IndustryName,
        URL: x.URL,
      }))
    );
    if (!data || data.length == 0) return [];
    const totalRecords = data[0].TotalRecord;
    const lastPage = Math.round(totalRecords / 50);
    if (currentPage < lastPage) {
      currentPage++;
      return await this.getStockList(catID, industryID, currentPage, stockList);
    } else {
      return stockList;
    }
  }

  async getStockDetail(stockCode) {
    let data;
    data = await fetch("https://finance.vietstock.vn/company/tradinginfo", {
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
          "_ga=GA1.2.1637228069.1600916572; _ga=GA1.3.1637228069.1600916572; __gads=ID=3ad4a460750561d1:T=1600916574:S=ALNI_MaONFDGdXGULuBl-szXLEgvKBJyUA; language=vi-VN; vst_isShowTourGuid=true; ASP.NET_SessionId=strwkfum24gqicf2wp213is3; __RequestVerificationToken=MA4Y6U_44KLEdfpq2ga1tQJFEUjCto-LYh-DIuZDiXtob5csxNjNl3a1j9wLmNgrKCw2N8XDX76S4UnK-yldYT1US4zMZG0mElNbwYN8BGc1; isShowLogin=true; vts_usr_lg=6F04264A61D5487896D168FEF0CE8CE0FC646C0FA5DF72B85D4253EC26D93EE82870CB8606F85FE07FB88DF56B7FF25F949F3EB9860832FE123AC1061569E5D2BE4F793CC4FCAA0BCA4A95CBBC9D66EA936FB91B451A8339B7ABD9EA745E81F3DFC827ABE3B2C23A151EE795FADC29B6C4A21272A56873320362D80CAD5F9B17; vst_usr_lg_token=mZrp0hRqBEW7s0f/+/wVZA==; _gid=GA1.2.2049685424.1615861110; _gat_UA-1460625-2=1; _gid=GA1.3.2049685424.1615861110; finance_viewedstock=AAA,; ats_referrer_history=%5B%22%22%2C%22finance.vietstock.vn%22%2C%22finance.vietstock.vn%22%5D",
      },
      referrer:
        "https://finance.vietstock.vn/" +
        stockCode +
        "-ctcp-nhua-an-phat-xanh.htm",
      referrerPolicy: "strict-origin-when-cross-origin",
      body: "code=" + stockCode + "&s=0&t=",
      method: "POST",
      mode: "cors",
    })
      .then(
        (res) => {
          return res.json();
        },
        (err) => {
          console.log(err);
        }
      )
      .catch((ex) => {
        console.log(ex);
      });

    return data;
  }
}
module.exports = new CrawlService();
