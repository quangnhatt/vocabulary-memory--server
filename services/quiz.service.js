import { pgPool } from "../db/index.js";
import { inverseSkillMultiplier } from "../utils/quiz.scoring.js";

class QuizService {
  async startQuiz(userId) {
    //
    const inverse_skill_multiplier = await calculateUserInverseSkillMultiplier(
      userId
    );
    // 0. ...question (popularity_score,...), effectiveDifficulty, zone
    const questions = await generateQuiz(inverse_skill_multiplier, 20);

    // 1. Create quiz attempt
    const { rows } = await pgPool.query(
      `
    INSERT INTO quiz_attempts (user_id, level_at_start, total_possible_points)
    VALUES ($1, 'unknown', 0)
    RETURNING id
    `,
      [userId]
    );

    const attemptId = rows[0].id;

    // 2. Insert attempt questions
    for (const q of questions) {
      await pgPool.query(
        `
      INSERT INTO quiz_attempt_questions
        (attempt_id, question_id, prompt, popularity_score)
      VALUES ($1, $2, $3, $4)
      `,
        [attemptId, q.id, q.prompt, q.popularity_score]
      );
    }

    // 3. Fetch attempt questions WITH IDs
    const { rows: attemptQuestions } = await pgPool.query(
      `
    SELECT
      id,
      question_id,
      prompt,
      popularity_score
    FROM quiz_attempt_questions
    WHERE attempt_id = $1
    ORDER BY id
    `,
      [attemptId]
    );

    // 4. Attach answers to each attempt question
    let totalPossiblePoints = 0;
    const enrichedQuestions = await Promise.all(
      attemptQuestions.map(async (aq) => {
        const { rows: answers } = await pgPool.query(
          `
        SELECT id, option_text, answer_type, answer_point
        FROM quiz_answers
        WHERE question_id = $1
          AND status = 'active'
        ORDER BY RANDOM()
        `,
          [aq.question_id]
        );
        const relative_difficulty =
          aq.popularity_score * inverse_skill_multiplier;
        let finalAnswers = [];
        let maxPoint = 0;
        for (const ans of answers) {
          const earned_point = calculateEarnedPoint(
            ans?.answer_type,
            ans.answer_point,
            relative_difficulty
          );
          if (earned_point > maxPoint) {
            maxPoint = earned_point;
          }
          finalAnswers.push({
            id: ans.id,
            text: ans.option_text,
            earned_point,
          });
        }
        totalPossiblePoints += maxPoint;
        return {
          attemptQuestionId: aq.id,
          prompt: aq.prompt,
          popularity_score: aq.popularity_score,
          answers: finalAnswers,
        };
      })
    );

    // Update total possible points in attempt record
    await pgPool.query(
      `
    UPDATE quiz_attempts
    SET total_possible_points = $1
    WHERE id = $2
    `,
      [totalPossiblePoints, attemptId]
    );

    return {
      attemptId,
      totalQuestions: enrichedQuestions.length,
      totalPossiblePoints,
      questions: enrichedQuestions,
    };
  }

  async submitQuiz(userId, attemptId, answers) {
    try {
      await pgPool.query("BEGIN");
      /**
       * answers = [
       *   { attemptQuestionId, selectedAnswerText }
       * ]
       */

      // Verify attempt belongs to user
      const { rows: attemptRows } = await pgPool.query(
        `
      SELECT user_id, total_possible_points
      FROM quiz_attempts
      WHERE id = $1
      `,
        [attemptId]
      );

      if (attemptRows.length === 0) {
        throw new Error("Invalid attempt ID");
      }

      if (attemptRows[0].user_id !== userId) {
        throw new Error("Unauthorized attempt submission");
      }

      const totalPossiblePoints = attemptRows[0].total_possible_points;

      const inverse_skill_multiplier =
        await calculateUserInverseSkillMultiplier(userId);

      let totalEarned = 0;
      let difficulties = [];

      for (const ans of answers) {
        const { rows } = await pgPool.query(
          `
        SELECT
          aq.question_id,
          aq.popularity_score,
          qa.answer_type
        FROM quiz_attempt_questions aq
        JOIN quiz_answers qa
          ON qa.question_id = aq.question_id
        WHERE qa.id = $1  AND qa.option_text = $2 AND  aq.id = $3
        `,
          [
            ans.selectedAnswer.id,
            ans.selectedAnswer.text,
            ans.attemptQuestionId,
          ]
        );

        const row = rows[0];
        const relative_difficulty =
          row?.popularity_score * inverse_skill_multiplier;
        const difficulty = +row?.popularity_score;
        const earned = calculateEarnedPoint(
          row?.answer_type,
          row?.answer_point,
          relative_difficulty
        );
        totalEarned += earned;
        difficulties.push(difficulty);

        await pgPool.query(
          `
        INSERT INTO quiz_attempt_answers
          (attempt_question_id, answer_id, answer_text, earned_point)
        VALUES ($1, $2, $3, $4)
        `,
          [
            ans.attemptQuestionId,
            ans.selectedAnswer.id,
            ans.selectedAnswer.text,
            earned,
          ]
        );
      }

      const quizRatio = totalEarned / totalPossiblePoints;
      const difficultyPressure =
        difficulties.reduce((a, b) => a + b, 0) / difficulties.length;
      await pgPool.query("COMMIT");
      return { quizRatio, difficultyPressure };
    } catch (e) {
      console.log(e);
      await pgPool.query("ROLLBACK");
      return { success: false, message: e.message };
    }
  }
}

export default new QuizService();

async function calculateUserInverseSkillMultiplier(userId) {
  // 1. Load user confidence score (MERGED INTO users)
  const { rows } = await pgPool.query(
    `
    SELECT confidence_score
    FROM users
    WHERE id = $1
    `,
    [userId]
  );

  const cs = rows[0]?.confidence_score ?? 0;
  return inverseSkillMultiplier(cs);
}

function calculateEarnedPoint(answerType, answerPoint, relativeDifficulty) {
  const weight =
    answerType === "best"
      ? 10
      : answerType === "acceptable"
      ? 7
      : answerType === "ok"
      ? 4
      : 0;
  const earned_point = Math.ceil(relativeDifficulty * (answerPoint ?? weight));
  return earned_point;
}
// ================================
// Quiz generation (adaptive)
// ================================
async function generateQuiz(inverse_skill_multiplier, questionCount = 20) {
  // 1. Load active questions
  const q = await pgPool.query(
    `
    SELECT *
    FROM quiz_questions
    WHERE status = 'active'
    `
  );

  // 2. Compute effective difficulty per user
  let maxDifficulty = 0;
  let minDifficulty = 2;
  let maxPopularity = 0;
  let minPopularity = 2;
  const questions = q.rows.map((row) => {
    // const effectiveDifficulty = row.popularity_score * inverse_skill_multiplier;
    const effectiveDifficulty =
      inverse_skill_multiplier / (+row.popularity_score + 0.5);
    if (effectiveDifficulty > maxDifficulty)
      maxDifficulty = effectiveDifficulty;
    if (effectiveDifficulty < minDifficulty)
      minDifficulty = effectiveDifficulty;
    if (row.popularity_score > maxPopularity)
      maxPopularity = row.popularity_score;
    if (row.popularity_score < minPopularity)
      minPopularity = row.popularity_score;
    let zone = "same";
    if (effectiveDifficulty < 0.85) zone = "below";
    else if (effectiveDifficulty > 0.9) zone = "above";

    return { ...row, effectiveDifficulty, zone };
  });
  console.log("Difficulty range:", minDifficulty, "to", maxDifficulty);
  console.log("Popularity range:", minPopularity, "to", maxPopularity);
  // 3. Zone-based sampling
  const pickedQuestions = pickQuestionsByZone(questions, questionCount);
  return pickedQuestions
  // const same = pickedQuestions.filter((q) => q.zone === "same"); // 0.8765851852
  // const above = pickedQuestions.filter((q) => q.zone === "above"); // 1.02903478261
  // const below = pickedQuestions.filter((q) => q.zone === "below"); // 0.8161310345

  // const pick = (arr, n) => arr.sort(() => 0.5 - Math.random()).slice(0, n);

  // return [
  //   ...pick(same, Math.floor(questionCount * 0.5)),
  //   ...pick(above, Math.floor(questionCount * 0.3)),
  //   ...pick(
  //     below,
  //     questionCount -
  //       Math.floor(questionCount * 0.5) -
  //       Math.floor(questionCount * 0.3)
  //   ),
  // ];
}

const DISTRIBUTION = {
  same: 0.5,
  above: 0.3,
  below: 0.2,
};

const pickUpTo = (arr, n) =>
  arr
    .slice() // avoid mutating original
    .sort(() => Math.random() - 0.5)
    .slice(0, Math.min(n, arr.length));

function pickQuestionsByZone(questions, questionCount) {
  const zones = {
    same: questions.filter((q) => q.zone === "same"),
    above: questions.filter((q) => q.zone === "above"),
    below: questions.filter((q) => q.zone === "below"),
  };

  const result = [];
  const pickedIds = new Set();

  const remaining = { ...zones };

  // 1. Initial allocation
  for (const zone in DISTRIBUTION) {
    const target = Math.floor(questionCount * DISTRIBUTION[zone]);
    const picked = pickUpTo(remaining[zone], target);

    picked.forEach((q) => pickedIds.add(q.id));
    result.push(...picked);

    remaining[zone] = remaining[zone].filter((q) => !pickedIds.has(q.id));
  }

  // 2. Fill the gap from any remaining questions
  if (result.length < questionCount) {
    const pool = Object.values(remaining).flat();

    const needed = questionCount - result.length;
    const extra = pickUpTo(pool, needed);

    result.push(...extra);
  }

  return result.slice(0, questionCount);
}
