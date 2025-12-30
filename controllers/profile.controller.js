import ProfileService from "../services/profile.service.js";

class ProfileController {
  async getMyProfile(req, res) {
    try {
      const result = await ProfileService.getMyProfile(req.userId);

      res.json(result);
    } catch (err) {
      console.error("Auth error:", err);
      res.status(400).json({ error: err.message });
    }
  }
}

export default new ProfileController();
