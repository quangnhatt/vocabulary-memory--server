const fetch = require("node-fetch");
const path = require("path");
const fs = require("fs");
const fullPath = path.join(__dirname, "../temp");

class AuthService {
  async verifyToken() {
    let authTokenPath = `${fullPath}/authToken.txt`;
    let authToken = fs.readFileSync(authTokenPath, "utf-8");
    return new Promise((resolve) => {
      fetch("https://id.vndirect.com.vn/authentication/verify", {
        headers: {
          "content-type": "text/plain",
          "token-id": authToken,
        },
        referrer:
          "https://id.vndirect.com.vn/login?httpReferer=https%3A%2F%2Fmyaccount.vndirect.com.vn%2Fauth?response=%2F",
        referrerPolicy: "no-referrer-when-downgrade",
        body: null,
        method: "GET",
        mode: "cors",
      }).then((res) => {
        if (res.status == 200) return res.json();
      });
    });
  }
  async getTokenID(renew = false) {
    let tokenIDPath = `${fullPath}/tokenID.txt`;
    let tokenID;
    if (!renew) {
      tokenID = fs.readFileSync(tokenIDPath, "utf-8");

      return tokenID;
    }

    return new Promise(function (resolve) {
      let username = process.env.username;
      let password = process.env.password;
      fetch("https://id.vndirect.com.vn/login", {
        headers: {
          accept: "*/*",
          "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
          "x-requested-with": "XMLHttpRequest",
        },
        referrer: "https://id.vndirect.com.vn/login",
        referrerPolicy: "no-referrer-when-downgrade",
        body: `username=${username}&password=${password}`,
        method: "POST",
        mode: "cors",
      })
        .then((res) => {
          if (res.status == 200) return res.text();
        })
        .then((res) => {
          tokenID = res.split("=")[2];
          fs.writeFileSync(tokenIDPath, tokenID);
          return resolve(tokenID);
        });
    });
  }

  async getAuthToken(renew = false) {
    if (!renew) {
      let authTokenPath = `${fullPath}/authToken.txt`;
      let authToken = fs.readFileSync(authTokenPath, "utf-8");

      return authToken;
    }
    let tokenID = await this.getTokenID(renew);
    return new Promise((resolve) => {
      fetch("https://auth-api.vndirect.com.vn/v3/session_auth", {
        headers: {
          accept: "application/json, text/plain, */*",
          "accept-language": "en-US,en;q=0.9",
          "cache-control": "no-cache",
          "content-type": "application/json;charset=UTF-8",
          pragma: "no-cache",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-site",
          "token-id": tokenID,
        },
        referrer: "https://myaccount.vndirect.com.vn/",
        referrerPolicy: "no-referrer-when-downgrade",
        body: "{}",
        method: "POST",
        mode: "cors",
      })
        .then((res) => {
          if (res.status == 200) return res.json();
        })
        .then((res) => {
          fs.writeFileSync(`${fullPath}/authToken.txt`, res.token);
          return resolve(res);
        });
    });
  }
}

module.exports = new AuthService();
