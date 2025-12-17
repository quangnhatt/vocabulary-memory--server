import SyncService from "../services/sync.service.js";

class SyncController {
  async syncWords(req, res) {
    try {
      const result = await SyncService.syncWords(req.body);
      res.json(result);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Sync failed" });
    }
  }
}

export default new SyncController();
