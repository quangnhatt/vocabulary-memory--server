const fetch = require("node-fetch");
const AuthService = require("../services/auth.service");

class HttpHelper {
  static async fetch(url, options, retry = 0) {
    const res = await send(url, options);
    return res;
  }
  static convertDateByMilliseconds(ml, append = 1) {
    ml = ml * append;
    return convertDateByMilliseconds(ml);
  }

  static addDays(days) {
    var date = new Date();
    date.setDate(date.getDate() + days);
    return date;
  }

  static addMonths(months) {
    var date = new Date();
    date.setMonth(date.getMonth() + months);
    return date;
  }
}
module.exports = HttpHelper;

async function send(url, options, retry = 0) {
  options["headers"]["token-id"] = await AuthService.getTokenID();
  options["headers"]["x-auth-token"] = await AuthService.getAuthToken();

  let res = await fetch(url, options).then((res) => {
    if (res.status == 200) return res.json();
  });
  if (res && res.error && retry == 0) {
    await AuthService.getAuthToken(true);
    return await send(url, options, 1);
  }
  return res;
}

function pad(s) {
  return s < 10 ? "0" + s : s;
}

function convertDateByMilliseconds(milliseconds) {
  var date = new Date(+milliseconds);
  return (
    date.getFullYear() +
    "-" +
    pad(date.getMonth() + 1) +
    "-" +
    pad(date.getDate())
  );
}
