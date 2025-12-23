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

  async saveWordByUserCode(req, res) {
    try {
      const result = await SyncService.saveWordByUserCode({
        user_code: req.body.userCode,
        term: req.body.term,
        translation: req.body.translation,
        example: req.body.example,
        tags: req.body.tags,
        source_lang: req.body.sourceLang,
        target_lang: req.body.targetLang,
      });
      res.json({ success: true, word: result });
    } catch (e) {
      console.error(e);
      res.status(400).json({ error: e.message });
    }
  }
}

export default new SyncController();
