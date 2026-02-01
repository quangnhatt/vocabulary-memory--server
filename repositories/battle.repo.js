import { pgPool } from "../db/index.js";
import { BATTLE_ROOM_STATUS } from "../common/constants.js";

class BattleRepository {
  async createBattle(battleId, userA, userB) {
    try {
      await pgPool.query("BEGIN");
      // Create battle
      await pgPool.query(
        `
      INSERT INTO battles (id, status)
      VALUES ($1, 'ACTIVE')
      RETURNING id
      `,
        [battleId],
      );

      // Insert players
      await pgPool.query(
        `
      INSERT INTO battle_players (battle_id, user_id)
      VALUES ($1, $2), ($1, $3)
      `,
        [battleId, userA, userB],
      );

      await pgPool.query("COMMIT");

      return {
        id: battleId,
      };
    } catch (e) {
      await pgPool.query("ROLLBACK");
      throw new Error(`Cannot create battle`);
    }
  }

  async loadBattleQuestions(difficulty) {
    // Load vocab for battle
    const vocabResult = await pgPool.query(
      `
    SELECT
      vp.id,
      vp.word,
      vp.meaning
    FROM vocab_pairs vp
    JOIN vocab_sets vs
      ON vp.vocab_set_id = vs.id
    WHERE vs.difficulty = $1
    ORDER BY random()
    LIMIT 10
    `,
      [difficulty],
    );

    if (vocabResult.rows.length < 6) {
      throw new Error(`Not enough vocab pairs for difficulty: ${difficulty}`);
    }

    // -------------------------
    // Build vocab map
    // wordId -> meaningId
    // -------------------------
    const vocabMap = {};
    vocabResult.rows.forEach((v) => {
      vocabMap[v.id] = v.id;
    });

    return {
      vocabMap,
      vocab: vocabResult.rows,
    };
  }

  async logMatch(battleId, userId, wordId, meaningId, isCorrect) {
    await pgPool.query(
      `
      INSERT INTO battle_matches
      (battle_id, user_id, word_id, meaning_id, is_correct)
      VALUES ($1, $2, $3, $4, $5)
      `,
      [battleId, userId, wordId, meaningId, isCorrect],
    );
  }

  /**
   * Finish a battle safely (idempotent)
   *
   * @param {string} battleId
   * @param {string|null} winnerId - null = draw
   */
  async finishBattle(battleId, winnerId) {
    try {
      await pgPool.query("BEGIN");

      // Lock battle row
      const battleRes = await pgPool.query(
        `
        SELECT status
        FROM battles
        WHERE id = $1
        FOR UPDATE
        `,
        [battleId],
      );

      if (battleRes.rowCount === 0) {
        throw new Error("Battle not found");
      }

      if (battleRes.rows[0].status === BATTLE_ROOM_STATUS.FINISHED) {
        // Already finished → no-op
        await client.query("ROLLBACK");
        return;
      }

      // Update battle
      await pgPool.query(
        `
        UPDATE battles
        SET status = $2,
            end_at = NOW()
        WHERE id = $1
        `,
        [battleId, BATTLE_ROOM_STATUS.FINISHED],
      );

      // Update players (winner / loser)
      if (winnerId) {
        await pgPool.query(
          `
          UPDATE battle_players
          SET is_winner = (user_id = $2)
          WHERE battle_id = $1
          `,
          [battleId, winnerId],
        );
      } else {
        // Draw: no winner
        await pgPool.query(
          `
          UPDATE battle_players
          SET is_winner = FALSE
          WHERE battle_id = $1
          `,
          [battleId],
        );
      }

      await pgPool.query("COMMIT");
    } catch (err) {
      await pgPool.query("ROLLBACK");
      console.error("finishBattle error:", err);
      throw err;
    }
  }
}

export default new BattleRepository();
