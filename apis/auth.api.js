import AuthController from "../controllers/auth.controller.js";

export function load(app) {
  app.get("/api/ping", (req, res) => {
    res.send("pong");
  });
  app.post("/api/v1/auth/google", (req, res, next) =>
    AuthController.googleSignIn(req, res, next)
  );

  app.post("/api/v1/auth/facebook", (req, res, next) =>
    AuthController.facebookSignIn(req, res, next)
  );

  app.post("/api/v1/auth/apple", (req, res, next) =>
    AuthController.appleSignIn(req, res, next)
  );

  app.post("/api/v1/auth/email/login", (req, res, next) =>
    AuthController.emailSignIn(req, res, next)
  );

   app.delete("/api/v1/account/delete", (req, res, next) =>
    AuthController.deleteAccount(req, res, next)
  );

   app.post("/api/v1/auth/device-token", AuthController.saveDeviceToken);
}
