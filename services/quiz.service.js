import { pgPool } from "../db/index.js";
import { inverseSkillMultiplier } from "../utils/quiz.scoring.js";

class QuizService {
  async startQuiz(userId) {
    const questions = await generateQuiz(userId);

    // 1. Create quiz attempt
    const { rows } = await pgPool.query(
      `
    INSERT INTO quiz_attempts (user_id, level_at_start)
    VALUES ($1, 'unknown')
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
        (attempt_id, question_id, prompt, popularity_score, dimension)
      VALUES ($1, $2, $3, $4, $5)
      `,
        [attemptId, q.id, q.prompt, q.popularity_score, q.dimension]
      );
    }

    // 3. Fetch attempt questions WITH IDs
    const { rows: attemptQuestions } = await pgPool.query(
      `
    SELECT
      id,
      question_id,
      prompt,
      dimension
    FROM quiz_attempt_questions
    WHERE attempt_id = $1
    ORDER BY id
    `,
      [attemptId]
    );

    // 4. Attach answers to each attempt question
    const enrichedQuestions = await Promise.all(
      attemptQuestions.map(async (aq) => {
        const { rows: answers } = await pgPool.query(
          `
        SELECT option_text
        FROM quiz_answers
        WHERE question_id = $1
          AND status = 'active'
        ORDER BY RANDOM()
        `,
          [aq.question_id]
        );

        return {
          attemptQuestionId: aq.id,
          prompt: aq.prompt,
          dimension: aq.dimension,
          answers: answers.map((a) => ({
            text: a.option_text,
          })),
        };
      })
    );

    return {
      attemptId,
      questions: enrichedQuestions,
    };
  }

  async submitQuiz(attemptId, answers) {
    /**
     * answers = [
     *   { attemptQuestionId, selectedAnswerText }
     * ]
     */

    let earned = 0;
    let possible = 0;
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
         AND qa.option_text = $1
        WHERE aq.id = $2
        `,
        [ans.selectedAnswerText, ans.attemptQuestionId]
      );

      const row = rows[0];

      const weight =
        row?.answer_type === "best"
          ? 1
          : row?.answer_type === "acceptable"
          ? 0.7
          : row?.answer_type === "ok"
          ? 0.4
          : 0;

      const difficulty = +(row.popularity_score);

      earned += 10 * difficulty * weight;
      possible += 10 * difficulty;
      difficulties.push(difficulty);

      await pgPool.query(
        `
        INSERT INTO quiz_attempt_answers
          (attempt_question_id, selected_option_text, answer_weight)
        VALUES ($1, $2, $3)
        `,
        [ans.attemptQuestionId, ans.selectedAnswerText, weight]
      );
    }

    const quizRatio = earned / possible;
    const difficultyPressure =
      difficulties.reduce((a, b) => a + b, 0) / difficulties.length;

    return { quizRatio, difficultyPressure };
  }
}

export default new QuizService();

// ================================
// Quiz generation (adaptive)
// ================================
async function generateQuiz(userId, questionCount = 18) {
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
  const multiplier = inverseSkillMultiplier(cs);

  // 2. Load active questions
  const q = await pgPool.query(
    `
    SELECT *
    FROM quiz_questions
    WHERE status = 'active'
    `
  );

  // 3. Compute effective difficulty per user
  const questions = q.rows.map((row) => {
    const effectiveDifficulty = row.popularity_score * multiplier;

    let zone = "same";
    if (effectiveDifficulty < 0.45) zone = "below";
    else if (effectiveDifficulty > 0.75) zone = "above";

    return { ...row, effectiveDifficulty, zone };
  });

  // 4. Zone-based sampling
  const same = questions.filter((q) => q.zone === "same");
  const above = questions.filter((q) => q.zone === "above");
  const below = questions.filter((q) => q.zone === "below");

  const pick = (arr, n) => arr.sort(() => 0.5 - Math.random()).slice(0, n);

  return [
    ...pick(same, Math.floor(questionCount * 0.5)),
    ...pick(above, Math.floor(questionCount * 0.3)),
    ...pick(
      below,
      questionCount -
        Math.floor(questionCount * 0.5) -
        Math.floor(questionCount * 0.3)
    ),
  ];
}
