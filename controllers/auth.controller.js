import {
  signInWithGoogle,
  loginWithFacebook,
  loginWithApple,
  loginWithEmail,
  registerWithEmail,
  saveDeviceToken,
} from "../services/auth.service.js";

class AuthController {
  async googleSignIn(req, res) {
    try {
      const result = await signInWithGoogle(req.body);

      res.json(result);
    } catch (err) {
      console.error("Auth error:", err);
      res.status(400).json({ error: err.message });
    }
  }

  async facebookSignIn(req, res) {
    try {
      const { fbId, email, username, avatarUrl } = req.body;
      const result = await loginWithFacebook(fbId, email, username, avatarUrl);

      res.json(result);
    } catch (err) {
      console.error("Auth error:", err);
      res.status(400).json({ error: err.message });
    }
  }

  async appleSignIn(req, res) {
    try {
      const { identityToken, authorizationCode } = req.body;
      const result = await loginWithApple(identityToken, authorizationCode);

      res.json(result);
    } catch (err) {
      console.error("Auth error:", err);
      res.status(400).json({ error: err.message });
    }
  }

  async emailSignIn(req, res) {
    try {
      const { email, password } = req.body;
      const result = await loginWithEmail(email, password);

      res.json(result);
    } catch (err) {
      console.error("Auth error:", err);
      res.status(400).json({ error: err.message });
    }
  }

  async emailRegister(req, res) {
    try {
      const { email, password } = req.body;
      const result = await registerWithEmail(email, password);

      res.json(result);
    } catch (err) {
      console.error("Auth error:", err);
      res.status(400).json({ error: err.message });
    }
  }

  async saveDeviceToken(req, res) {
    try {
      const result = await saveDeviceToken(req.userId, req.body);

      res.json({
        user: result.user,
        token: result.token,
      });
    } catch (err) {
      console.error("Auth error:", err);
      res.status(400).json({ error: err.message });
    }
  }
}

export default new AuthController();
