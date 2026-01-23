import { pgPool } from "../db/index.js";

class UserRepository {
  async getByUserId(userId) {
    if (!userId) {
      throw new Error("userId is required");
    }

    const { rows } = await pgPool.query(
      `
    SELECT
      id,
      username,
      avatar_url,
      current_level
    FROM users
    WHERE id = $1
    `,
      [userId],
    );

    if (!rows.length) {
      return null;
    }
    return rows[0];
  }

  async getByUsers(userIds) {
    if (!Array.isArray(userIds) || userIds.length === 0) {
      throw new Error("List of userIds is required");
    }

    const { rows } = await pgPool.query(
      `
    SELECT
      id,
      username,
      avatar_url,
      current_level
    FROM users
    WHERE id = ANY($1::uuid[])
    `,
      [userIds],
    );

    if (!rows.length) {
      return null;
    }
    return rows;
  }
}

export default new UserRepository();
