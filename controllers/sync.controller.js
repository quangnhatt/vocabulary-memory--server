import SyncService from "../services/sync.service.js";

class SyncController {
  async syncWords(req, res) {
    const result = await SyncService.syncWords({
      userId: req.userId,
      lastSyncAt: req.body.lastSyncAt,
      items: req.body.items,
    });

    res.json(result);
  }
}

export default new SyncController();
