const fetch = require('node-fetch');
const HttpHelper = require('../helpers/http.helper');

class StockService {
    async getMyAssets() {
        let url = 'https://trade-api.vndirect.com.vn/accounts/v3/0001208904/stocks';
        let options = {
            "headers": {
                "accept": "application/json, text/plain, */*",
                "accept-language": "en-US,en;q=0.9",
                "cache-control": "no-cache",
                "pragma": "no-cache",
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-site"
            },
            "referrer": "https://trade.vndirect.com.vn/giao-dich-chung-khoan/tong-quan",
            "referrerPolicy": "no-referrer-when-downgrade",
            "body": null,
            "method": "GET",
            "mode": "cors"
        }
        let res = await HttpHelper.fetch(url, options);
        return res;
    }

    async getHistories() {
        var today = new Date().toISOString().slice(0, 10);
        let url = `https://trade-report-api.vndirect.com.vn/accounts/0001208904/orders_history/?fromDate=2020-07-07&toDate=` + today + `&pageSize=1000`;
        let options = {
            "headers": {
                "accept": "application/json, text/plain, */*",
                "accept-language": "en-US,en;q=0.9",
                "cache-control": "no-cache",
                "pragma": "no-cache",
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-site"
            },
            "referrer": "https://trade.vndirect.com.vn/lich-su-mua-ban",
            "referrerPolicy": "no-referrer-when-downgrade",
            "body": null,
            "method": "GET",
            "mode": "cors"
        }
        let result = [];
        let dates = [];
        let data = await HttpHelper.fetch(url, options);
        for (let index = 0; index < data.length; index++) {
            const item = data[index];
            if (!item.matchDetails) continue;
            let newItem;
            newItem = {
                symbol: item.symbol,
                execType: item.execType,
                execDate: item.transactionDate,
                execQuantity: item.matchQuantity,
                execPrice: +item.matchAveragePrice,
                execAmount: item.matchAmount
            }
            if (dates.indexOf(item.transactionDate) == -1)
                dates.push(item.transactionDate);
            result.push(newItem);
        }
        return {
            histories: result,
            dates
        };
    }

    async getStockInfo(stockCode) {
        let data = await fetch("https://finance.vietstock.vn/company/tradinginfo", {
            "headers": {
                "accept": "*/*",
                "accept-language": "en-US,en;q=0.9",
                "cache-control": "no-cache",
                "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
                "pragma": "no-cache",
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-origin",
                "x-requested-with": "XMLHttpRequest"
            },
            "referrerPolicy": "no-referrer-when-downgrade",
            "body": "code=" + stockCode + "&s=0&t=",
            "method": "POST",
            "mode": "cors"
        }).then(res => {
            if (res.status == 200)
                return res.json();
        });
        return data;
    }

    async getMarketPrice() {
        let data = await fetch("https://finance.vietstock.vn/data/getmarketprice?type=2", {
            "headers": {
                "accept": "*/*",
                "accept-language": "en-US,en;q=0.9",
                "cache-control": "no-cache",
                "pragma": "no-cache",
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-origin",
                "x-requested-with": "XMLHttpRequest"
            },
            "referrerPolicy": "no-referrer-when-downgrade",
            "body": null,
            "method": "GET",
            "mode": "cors"
        }).then(res => res.json());
        return data;
    }

    async getMarketPriceByDate(date, floor) {
        let catID = 1;
        let stockID = -19;
        if (floor == 'HNX') {
            catID = 2;
            stockID = -18;
        }

        const data = await fetch("https://finance.vietstock.vn/data/KQGDThongKeGiaStockPaging?page=1&pageSize=20&catID=" + catID + "&stockID=" + stockID + "&fromDate=" + date + "&toDate=" + date, {
            "headers": {
                "accept": "*/*",
                "accept-language": "en-US,en;q=0.9",
                "cache-control": "no-cache",
                "pragma": "no-cache",
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-origin",
                "x-requested-with": "XMLHttpRequest"
            },
            "referrerPolicy": "no-referrer-when-downgrade",
            "body": null,
            "method": "GET",
            "mode": "cors"
        }).then(res => res.json());
        return data;

    }
}

module.exports = new StockService();