import { signInWithGoogle, saveDeviceToken } from "../services/auth.service.js";

class AuthController {
  async googleSignIn(req, res) {
    try {
      const result = await signInWithGoogle(req.body);

      res.json({
        user: result.user,
        token: result.token,
      });
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
