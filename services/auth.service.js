import { pgPool } from "../db/index.js";
import { generateUniqueUserCode } from "../utils/userCode.js";
import { signAuthToken } from "../utils/jwt.js";
import bcrypt from "bcrypt";
import appleSigninAuth from "apple-signin-auth";

const SALT_ROUNDS = 12;

export async function signInWithGoogle({
  firebaseUid,
  email,
  displayName,
  avatarUrl,
}) {
  if (!firebaseUid) {
    throw new Error("firebaseUid is required");
  }

  // Find existing user
  const existing = await pgPool.query(
    "SELECT * FROM users WHERE firebase_uid = $1 or email = $2",
    [firebaseUid, email],
  );

  let user;

  if (existing.rowCount > 0) {
    user = existing.rows[0];
  } else {
    // Create user
    const userCode = await generateUniqueUserCode(pgPool);

    const { rows } = await pgPool.query(
      `
      INSERT INTO users (firebase_uid, username, email, user_code, avatar_url)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
      `,
      [firebaseUid, displayName, email, userCode, avatarUrl],
    );

    user = rows[0];

    await pgPool.query(
      `
      INSERT INTO user_settings (user_id)
      VALUES ($1)
      RETURNING *
      `,
      [user.id],
    );
  }

  // Generate auth token (IMPORTANT)
  const token = signAuthToken({
    userId: user.id,
  });

  return {
    user,
    token,
  };
}

export async function saveDeviceToken(userId, { token, platform }) {
  try {
    await pool.query(
      `
    INSERT INTO device_tokens (user_id, token, platform)
    VALUES ($1, $2, $3)
    ON CONFLICT (token)
    DO UPDATE SET
      user_id = EXCLUDED.user_id,
      platform = EXCLUDED.platform
    `,
      [userId, token, platform],
    );

    return { success: true };
  } catch (e) {
    console.log(e);
    return { success: false };
  }
}

export async function loginWithApple(identityToken, authorizationCode) {
  if (!identityToken || !authorizationCode) {
    return null;
  }

  // Verify token with Apple
  const appleUser = await appleSigninAuth.verifyIdToken(identityToken, {
    audience: process.env.APPLE_CLIENT_ID,
    ignoreExpiration: false,
  });

  const appleUserId = appleUser.sub;
  const email = appleUser.email; // only on first login sometimes
  const displayName = email != null ? email.split("@")[0] : "";
  const avatarUrl = "";

  // Find existing user
  const existing = await pgPool.query(
    "SELECT * FROM users WHERE apple_user_id = $1 or email = $2",
    [appleUserId, email],
  );

  let user;

  if (existing.rowCount > 0) {
    user = existing.rows[0];
    if (!user.apple_user_id) {
      // Link Apple to existing email account
      await await pgPool.query(
        `UPDATE users SET apple_user_id = $1 WHERE id = $2`,
        [appleUserId, user.id],
      );
    }
  } else {
    // Create user
    const userCode = await generateUniqueUserCode(pgPool);

    const { rows } = await pgPool.query(
      `
      INSERT INTO users (apple_user_id, username, email, user_code, avatar_url)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
      `,
      [appleUserId, displayName, email, userCode, avatarUrl],
    );

    user = rows[0];

    // Add new settings
    await pgPool.query(
      `
      INSERT INTO user_settings (user_id)
      VALUES ($1)
      RETURNING *
      `,
      [user.id],
    );
  }

  // Generate auth token (IMPORTANT)
  const token = signAuthToken({
    userId: user.id,
  });

  return {
    user,
    token,
  };
}

export async function loginWithFacebook(fbId, email, name, picture) {
  if (!fbId) {
    return null;
  }

  // Find existing user
  const existing = await pgPool.query(
    "SELECT * FROM users WHERE facebook_user_id = $1 or email = $2",
    [fbId, email],
  );

  let user;

  if (existing.rowCount > 0) {
    user = existing.rows[0];
    if (!user.facebook_user_id) {
      // Link Facebook ID to existing email account
      await await pgPool.query(
        `UPDATE users SET facebook_user_id = $1 WHERE id = $2`,
        [fbId, user.id],
      );
      user.facebook_user_id = fbId;
    }
  } else {
    // Create user
    const userCode = await generateUniqueUserCode(pgPool);

    const { rows } = await pgPool.query(
      `
      INSERT INTO users (facebook_user_id, username, email, user_code, avatar_url)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
      `,
      [fbId, name, email, userCode, picture],
    );

    user = rows[0];

    // Add new settings
    await pgPool.query(
      `
      INSERT INTO user_settings (user_id)
      VALUES ($1)
      RETURNING *
      `,
      [user.id],
    );
  }

  // Generate auth token (IMPORTANT)
  const token = signAuthToken({
    userId: user.id,
  });

  return {
    user,
    token,
  };
}

export async function loginWithEmail(email, password) {
  if (!email || !password) {
    return { success: false, message: "Email and password are required" };
  }

  // Find existing user
  const {rows} = await pgPool.query("SELECT * FROM users WHERE email = $1", [
    email.toLowerCase(),
  ]);
  
  const user = rows[0];

  if (!user || !user.password_hash) {
    return { success: false, message: "Email or password is incorrect" };
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return { success: false, message: "Email or password is incorrect" };
  }

  // Generate auth token (IMPORTANT)
  const token = signAuthToken({
    userId: user.id,
  });

  return {
    success: true,
    user,
    token,
  };
}

export async function registerWithEmail(email, password) {
  // Validate input
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  if (password.length < 6) {
    return {
      success: false,
      message: "Password must be at least 6 characters",
    };
  }

  // Find existing user
  const existingUser = await pgPool.query(
    "SELECT * FROM users WHERE email = $1",
    [email.toLowerCase()],
  );

  if (existingUser.rowCount > 0) {
    return {
      success: false,
      message: "Email already registered",
    };
  }

  const userCode = await generateUniqueUserCode(pgPool);
  // Hash password
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const username = email.split("@")[0];
  // Create user
  const user = await pgPool.query(
    `
    INSERT INTO users (email, password_hash, username, user_code)
    VALUES ($1, $2, $3, $4)
    RETURNING id, email
    `,
    [email.toLowerCase(), passwordHash, username, userCode],
  );
  await pgPool.query("COMMIT");

  // Generate auth token (IMPORTANT)
  const token = signAuthToken({
    userId: user.id,
  });

  return {
    user,
    token,
  };
}
