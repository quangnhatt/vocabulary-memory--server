import AuthController from "../controllers/auth.controller.js";

export function load(app) {
  app.get("/api/ping", (req, res) => {
    res.send("pong");
  });
  app.post("/api/v1/auth/google", (req, res, next) =>
    AuthController.googleSignIn(req, res, next)
  );

   app.post("/api/v1/auth/device-token", AuthController.saveDeviceToken);
}
