const AuthService = require('../services/auth.service');

class AuthController {
    async verifyToken() {
        let res = await AuthService.verifyToken();
        console.log(res);
    }

    async getTokenID() {
        let tokenID = await AuthService.getTokenID();
        console.log(tokenID);
    }
    async getAuthToken() {
        let authToken = await AuthService.getAuthToken();
        console.log(authToken);
    }
}

module.exports = new AuthController();