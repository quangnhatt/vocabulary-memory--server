import ReviewService from "../services/review.service.js";

class ReviewController {
  async saveReviewActions(req, res) {
    try {
      await ReviewService.saveReviewActions(req.userId, req.body.actions);

      res.json({ success: true });
    } catch (err) {
      console.error("Save review actions error:", err);
      res.status(400).json({ error: err.message });
    }
  }

  async getReviewSummary(req, res) {
    try {
      const data = await ReviewService.getReviewSummary(
        req.userId,
        req.query.range,
      );
      res.json(data);
    } catch (err) {
      console.error("Get review summary error:", err);
      res.status(400).json({ error: err.message });
    }
  }

  async getPerformanceStatistics(req, res) {
    try {
      const data = await ReviewService.getTodayReviewActionStats(req.userId);

      res.json(data);
    } catch (err) {
      console.error("Get Performance review actions error:", err);
      res.status(400).json({ error: err.message });
    }
  }
}

export default new ReviewController();
