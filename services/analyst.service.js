const fetch = require('node-fetch');
const HttpHelper = require('../helpers/http.helper');

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

            if ((last2OpenPrices[1] < last2ClosePrices[0]) && (last2ClosePrices[1] > last2OpenPrices[0]))
                result.push(HttpHelper.convertDateByMilliseconds(dates[index + 1], 1000));
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
            let hasFirst3RedCandles = isAllRedCandles(last4ClosePrices.slice(0, 3), last4OpenPrices.slice(0, 3));
            let isLastGreen = isGreenCandle(last4ClosePrices[3], last4OpenPrices[3]);
            if (!hasFirst3RedCandles || !isLastGreen) continue;
            if ((last4ClosePrices[3] == last4HighestPrices[3]) &&
                (last4OpenPrices[3] - last4LowestPrices[3] > 0) &&
                last4OpenPrices[3] - last4LowestPrices[3] > 1.5 * (last4ClosePrices[3] - last4OpenPrices[3]))
                result.push(HttpHelper.convertDateByMilliseconds(dates[index + 3], 1000));
        }
        return result;
    }

    getUpInvertedHammer(closePrices, openPrices, highestPrices, lowestPrices, dates) {
        let result = [];
        closePrices = closePrices.slice(-15);
        openPrices = openPrices.slice(-15);
        const len = closePrices.length;
        for (let index = 0; index < len - 3; index++) {
            const last4ClosePrices = closePrices.slice(index, index + 4);
            const last4OpenPrices = openPrices.slice(index, index + 4);
            const last4HighestPrices = highestPrices.slice(index, index + 4);
            const last4LowestPrices = lowestPrices.slice(index, index + 4);
            const hasFirst3RedCandles = isAllRedCandles(last4ClosePrices.slice(0, 3), last4OpenPrices.slice(0, 3));
            const isLastGreen = isGreenCandle(last4ClosePrices[3], last4OpenPrices[3]);
            if (!hasFirst3RedCandles || !isLastGreen) continue;
            if ((last4OpenPrices[3] == last4LowestPrices[3]) &&
                (last4HighestPrices[3] - last4ClosePrices[3] > 0) &&
                last4HighestPrices[3] - last4ClosePrices[3] > 1.5 * (last4ClosePrices[3] - last4OpenPrices[3]))
                result.push(HttpHelper.convertDateByMilliseconds(dates[index + 3], 1000));
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
            const hasFirst2RedCandles = isAllRedCandles(last3ClosePrices.slice(0, 2), last3OpenPrices.slice(0, 2));
            const isLastGreen = isGreenCandle(last3ClosePrices[2], last3OpenPrices[2]);
            if (!hasFirst2RedCandles || !isLastGreen)
                continue
            if (last3ClosePrices[0] > last3OpenPrices[1] &&
                last3ClosePrices[2] * 2 > (last3ClosePrices[0] + last3OpenPrices[0]))
                result.push(HttpHelper.convertDateByMilliseconds(dates[index + 2], 1000));
        }
        return result;
    }

    getTotalVolumes(volumes) {
        const volumesLast7Sessions = volumes.slice(-7).reduce((total, vol) => total + vol);
        const volumesLast14Sessions = volumes.slice(-14).reduce((total, vol) => total + vol);
        const volumesLast30Sessions = volumes.slice(-30).reduce((total, vol) => total + vol);
        const volumesLast90Sessions = volumes.slice(-90).reduce((total, vol) => total + vol);
        const volumesLast120Sessions = volumes.slice(-120).reduce((total, vol) => total + vol);

        return {
            volumesLastSession: volumes.slice(-1)[0],
            volumesLast7Sessions,
            volumesLast14Sessions,
            volumesLast30Sessions,
            volumesLast90Sessions,
            volumesLast120Sessions
        }
    }



    async getStockList() {
        const data = await fetch("https://finance.vietstock.vn/data/stocklist?catID=1", {
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
        let stockCodes = [];
        for (let index = 0; index < data.length; index++) {
            const item = data[index];
            if (item.StockCode.length != 3) continue;
            if (stockCodes.indexOf(item.StockCode) == -1)
                stockCodes.push(item.StockCode);
        }
        return stockCodes;
    }

    async getStockHistories(stockCode, fromDate, toDate) {
        const url = "https://dchart-api.vndirect.com.vn/dchart/history?resolution=D&symbol=" + stockCode + "&from=" + fromDate.toString().slice(0, -3) + "&to=" + toDate.toString().slice(0, -3);
        const data = await fetch(url, {
            "headers": {
                "accept": "application/json, text/plain, */*",
                "accept-language": "en-US,en;q=0.9",
                "cache-control": "no-cache",
                "pragma": "no-cache",
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-site"
            },
            "referrerPolicy": "no-referrer-when-downgrade",
            "body": null,
            "method": "GET",
            "mode": "cors"
        }).then(res => {
            if (res.status == 200)
                return res.json();
        });

        data.StockCode = stockCode;

        return data;
    }
}

module.exports = new AnalystService();

function getTotalVolumeLast3Months(volumes) {

}

function getTotalVolumeLast6Months(volumes) {

}

function getTotalVolumeLast1Months(volumes) {

}

function getTotalVolumeLast2Weeks(volumes) {

}

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