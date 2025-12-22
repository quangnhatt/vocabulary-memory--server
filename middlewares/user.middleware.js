import { verifyAuthToken } from '../utils/jwt.js';

const PUBLIC_PATHS = [
  '/auth/google',
  '/ext/translate',
  '/ext/sync/word',
];

export function requireUser(req, res, next) {
  // ✅ Skip public routes
  if (PUBLIC_PATHS.includes(req.path)) {
    return next();
  }

  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing Authorization token' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = verifyAuthToken(token);

    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}