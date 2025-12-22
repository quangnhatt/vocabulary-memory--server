import SyncService from "../services/sync.service.js";

class SyncController {
  async syncWords(req, res) {
    const result = await SyncService.syncWords({
      userId: req.userId,
      lastSyncAt: req.body.lastSyncAt,
      changes: req.body.changes,
    });

    res.json(result);
  }
}

export default new SyncController();
