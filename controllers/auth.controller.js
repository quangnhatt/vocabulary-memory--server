import { signInWithGoogle } from "../services/auth.service.js";

class AuthController {
  async googleSignIn(req, res, next) {
    try {
      const user = await signInWithGoogle(req.body);
      res.json(user);
    } catch (err) {
      console.error("Auth error:", err);
      res.status(400).json({ error: err.message });
    }
  }
}

export default new AuthController();