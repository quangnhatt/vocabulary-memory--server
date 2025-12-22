export function requireUser(req, res, next) {
  const userId = req.headers["x-user-id"];

  // if (!userId) {
  //   return res.status(401).json({ error: "Missing X-User-Id" });
  // }

  req.userId = userId;
  next();
}
