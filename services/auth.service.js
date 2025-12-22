import { pgPool } from '../db/index.js';
import { generateUniqueUserCode } from '../utils/userCode.js';

export async function signInWithGoogle({
  firebaseUid,
  email,
  displayName,
}) {
  if (!firebaseUid) {
    throw new Error('firebaseUid is required');
  }

  // 1. Check existing user
  const existing = await pgPool.query(
    'SELECT * FROM users WHERE firebase_uid = $1',
    [firebaseUid]
  );

  if (existing.rowCount > 0) {
    return existing.rows[0];
  }

  // 2. Generate unique user code
  const userCode = await generateUniqueUserCode(pgPool);

  // 3. Create new user
  const { rows } = await pgPool.query(
    `
    INSERT INTO users (firebase_uid, username, email, user_code)
    VALUES ($1, $2, $3, $4)
    RETURNING *
    `,
    [firebaseUid, displayName, email, userCode]
  );

  return rows[0];
}