import AuthController from "../controllers/auth.controller.js";

export function load(app) {
  app.post("/api/v1/auth/google", (req, res, next) =>
    AuthController.googleSignIn(req, res, next)
  );
}
