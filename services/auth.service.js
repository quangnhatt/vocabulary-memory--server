import { pgPool } from '../db/index.js';
import { generateUniqueUserCode } from '../utils/userCode.js';
import { signAuthToken } from '../utils/jwt.js';

export async function signInWithGoogle({
  firebaseUid,
  email,
  displayName,
  avatarUrl
}) {
  if (!firebaseUid) {
    throw new Error('firebaseUid is required');
  }

  // 1. Find existing user
  const existing = await pgPool.query(
    'SELECT * FROM users WHERE firebase_uid = $1',
    [firebaseUid]
  );

  let user;

  if (existing.rowCount > 0) {
    user = existing.rows[0];
  } else {
    // 2. Create user
    const userCode = await generateUniqueUserCode(pgPool);

    const { rows } = await pgPool.query(
      `
      INSERT INTO users (firebase_uid, username, email, user_code, avatar_url)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
      `,
      [firebaseUid, displayName, email, userCode, avatarUrl]
    );

    user = rows[0];

    const data = await pgPool.query(
      `
      INSERT INTO user_settings (user_id)
      VALUES ($1)
      RETURNING *
      `,
      [user.id]
    );

  }

  // 3. Generate auth token (IMPORTANT)
  const token = signAuthToken({
    userId: user.id,
  });

  return {
    user,
    token,
  };
}