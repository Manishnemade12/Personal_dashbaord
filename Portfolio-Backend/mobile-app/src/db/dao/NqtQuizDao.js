import { getDatabase } from '../database';
import { generateUUID } from '../../utils/uuid';
import { NQT_SUBJECTS, NQT_TOPICS } from '../../screens/quizzes/nqtQuestionBank';

const safeJson = (value, fallback) => {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch (_error) {
    return fallback;
  }
};

const round = (value, digits = 1) => Number(Number(value || 0).toFixed(digits));
let seedPromise = null;

async function ensureSeeded() {
  if (!seedPromise) {
    seedPromise = (async () => {
      const db = await getDatabase();
      await db.withTransactionAsync(async () => {
        for (const subject of NQT_SUBJECTS) {
          await db.runAsync(
            `INSERT OR IGNORE INTO nqt_subjects (id, name, section, exam_weight, order_index) VALUES (?, ?, ?, ?, ?)`,
            [subject.id, subject.name, subject.section, subject.examWeight, subject.order]
          );
        }
        for (const topic of NQT_TOPICS) {
          await db.runAsync(
            `INSERT OR IGNORE INTO nqt_topics (id, subject_id, name, importance, frequency, difficulty) VALUES (?, ?, ?, ?, ?, ?)`,
            [topic.id, topic.subjectId, topic.name, topic.importance, topic.frequency, topic.difficulty]
          );
        }
      });
    })().catch((error) => {
      seedPromise = null;
      throw error;
    });
  }
  return seedPromise;
}

function mapTopicStats(rows) {
  return rows.map((row) => {
    const seen = Number(row.correct_count || 0) + Number(row.incorrect_count || 0) + Number(row.unanswered_count || 0);
    const accuracy = seen ? (Number(row.correct_count || 0) / seen) * 100 : null;
    return {
      id: row.topic_id,
      topicId: row.topic_id,
      subjectId: row.subject_id,
      subjectName: row.subject_name,
      section: row.section,
      name: row.name,
      importance: Number(row.importance || 3),
      frequency: Number(row.frequency || 3),
      difficulty: row.difficulty,
      bankCount: Number(row.bank_count || 0),
      seen,
      correct: Number(row.correct_count || 0),
      incorrect: Number(row.incorrect_count || 0),
      unanswered: Number(row.unanswered_count || 0),
      accuracy: accuracy === null ? null : round(accuracy),
      averageSeconds: seen ? round(Number(row.total_time_seconds || 0) / seen, 0) : null,
      lastAttemptAt: row.last_attempt_at || null,
    };
  });
}

export const NqtQuizDao = {
  async initialize() {
    await ensureSeeded();
  },

  async getSubjects() {
    await ensureSeeded();
    const db = await getDatabase();
    return db.getAllAsync('SELECT * FROM nqt_subjects ORDER BY order_index ASC');
  },

  async syncCatalog(catalog) {
    if (!catalog?.subjects?.length || !catalog?.topics?.length) return;
    const db = await getDatabase();
    await db.withTransactionAsync(async () => {
      for (const subject of catalog.subjects) {
        await db.runAsync(
          `INSERT OR REPLACE INTO nqt_subjects (id, name, section, exam_weight, order_index) VALUES (?, ?, ?, ?, ?)`,
          [subject.id, subject.name, subject.section, subject.examWeight || 1, subject.order || 0]
        );
      }
      for (const topic of catalog.topics) {
        await db.runAsync(
          `INSERT OR REPLACE INTO nqt_topics (id, subject_id, name, importance, frequency, difficulty) VALUES (?, ?, ?, ?, ?, ?)`,
          [topic.id, topic.subjectId, topic.name, topic.importance || 3, topic.frequency || 3, topic.difficulty || 'medium']
        );
      }
    });
  },

  async getTopics(userId = 'admin') {
    await ensureSeeded();
    const db = await getDatabase();
    const rows = await db.getAllAsync(
      `SELECT t.*, s.name AS subject_name, s.section,
              (SELECT COUNT(*) FROM nqt_questions q WHERE q.topic_id = t.id AND q.user_id = ?) AS bank_count,
              COALESCE(p.correct_count, 0) AS correct_count,
              COALESCE(p.incorrect_count, 0) AS incorrect_count,
              COALESCE(p.unanswered_count, 0) AS unanswered_count,
              COALESCE(p.total_time_seconds, 0) AS total_time_seconds,
              p.last_attempt_at
       FROM nqt_topics t JOIN nqt_subjects s ON s.id = t.subject_id
       LEFT JOIN nqt_topic_performance p ON p.topic_id = t.id AND p.user_id = ?
       ORDER BY t.importance DESC, t.frequency DESC, s.order_index ASC, t.name ASC`,
      [userId, userId]
    );
    return mapTopicStats(rows);
  },

  async getQuestionCount(userId = 'admin') {
    await ensureSeeded();
    const db = await getDatabase();
    const row = await db.getFirstAsync('SELECT COUNT(*) AS count FROM nqt_questions WHERE user_id = ?', [userId]);
    return Number(row?.count || 0);
  },

  async getGenerationContext(userId = 'admin') {
    await ensureSeeded();
    const db = await getDatabase();
    const [performanceRows, recentRows, mistakeRows] = await Promise.all([
      db.getAllAsync('SELECT * FROM nqt_topic_performance WHERE user_id = ?', [userId]),
      db.getAllAsync(
        `SELECT q.prompt FROM nqt_answers a
         JOIN nqt_attempts attempt ON attempt.id = a.attempt_id
         JOIN nqt_questions q ON q.id = a.question_id
         WHERE attempt.user_id = ? ORDER BY a.answered_at DESC LIMIT 20`,
        [userId]
      ),
      db.getAllAsync(
        `SELECT a.topic_id, COUNT(*) AS wrong_count
         FROM nqt_answers a JOIN nqt_attempts attempt ON attempt.id = a.attempt_id
         WHERE attempt.user_id = ? AND a.selected_option IS NOT NULL AND a.is_correct = 0
         GROUP BY a.topic_id HAVING COUNT(*) >= 2 ORDER BY wrong_count DESC LIMIT 10`,
        [userId]
      ),
    ]);
    const topicAccuracy = {};
    const topicIncorrect = {};
    for (const row of performanceRows) {
      const seen = Number(row.correct_count || 0) + Number(row.incorrect_count || 0) + Number(row.unanswered_count || 0);
      topicAccuracy[row.topic_id] = seen ? round((Number(row.correct_count || 0) / seen) * 100) : null;
      topicIncorrect[row.topic_id] = Number(row.incorrect_count || 0);
    }
    return {
      topicAccuracy,
      topicIncorrect,
      repeatedMistakes: mistakeRows.map((row) => `${row.topic_id}: ${row.wrong_count} incorrect answers`),
      recentQuestionStems: recentRows.map((row) => row.prompt),
    };
  },

  async saveGeneratedQuiz(quiz, userId = 'admin') {
    await ensureSeeded();
    const db = await getDatabase();
    const now = quiz.createdAt || new Date().toISOString();
    const questions = quiz.questionSnapshot || [];
    const config = { ...(quiz.config || {}), questionCount: questions.length };
    const savedQuiz = { ...quiz, userId, questionCount: questions.length, config, createdAt: now };
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT OR IGNORE INTO nqt_generated_quizzes (
          id, user_id, mode, subject_id, topic_id, difficulty, question_count,
          duration_seconds, question_snapshot, config, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [savedQuiz.id, userId, savedQuiz.mode, savedQuiz.subjectId, savedQuiz.topicId,
          savedQuiz.difficulty, savedQuiz.questionCount, savedQuiz.durationSeconds,
          JSON.stringify(questions), JSON.stringify(config), now]
      );
      for (const question of questions) {
        await db.runAsync(
          `INSERT OR IGNORE INTO nqt_questions (
            id, user_id, subject_id, topic_id, prompt, options, answer, solution,
            difficulty, pattern, estimated_seconds, importance
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [question.id, userId, question.subjectId, question.topicId, question.prompt,
            JSON.stringify(question.options), question.answer, JSON.stringify(question.solution),
            question.difficulty, question.pattern, question.estimatedSeconds, question.importance]
        );
      }
    });
    return savedQuiz;
  },

  async queueAttemptUpload(attemptId, userId, payload) {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT OR REPLACE INTO nqt_sync_queue (attempt_id, user_id, payload, created_at) VALUES (?, ?, ?, ?)`,
      [attemptId, userId, JSON.stringify(payload), new Date().toISOString()]
    );
  },

  async getPendingAttemptUploads(userId = 'admin') {
    const db = await getDatabase();
    const rows = await db.getAllAsync('SELECT * FROM nqt_sync_queue WHERE user_id = ? ORDER BY created_at ASC', [userId]);
    return rows.map((row) => ({ ...row, payload: safeJson(row.payload, {}) }));
  },

  async removePendingAttemptUpload(attemptId) {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM nqt_sync_queue WHERE attempt_id = ?', [attemptId]);
  },

  async finishAttempt({ quiz, answers = {}, marked = {}, timeByQuestion = {}, startedAt, timeTakenSeconds }, userId = 'admin') {
    const db = await getDatabase();
    const questions = quiz.questionSnapshot || [];
    const completedAt = new Date().toISOString();
    const attemptId = generateUUID();
    const correctCount = questions.filter((q) => answers[q.id] === q.answer).length;
    const answeredCount = questions.filter((q) => Boolean(answers[q.id])).length;
    const incorrectCount = answeredCount - correctCount;
    const unansweredCount = questions.length - answeredCount;
    const accuracy = questions.length ? (correctCount / questions.length) * 100 : 0;
    const elapsed = Math.max(0, Number(timeTakenSeconds || 0));

    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT INTO nqt_attempts (
          id, quiz_id, user_id, score, correct_count, incorrect_count, unanswered_count,
          accuracy, time_taken_seconds, started_at, completed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [attemptId, quiz.id, userId, correctCount, correctCount, incorrectCount, unansweredCount, accuracy, elapsed, startedAt, completedAt]
      );

      for (const question of questions) {
        const selected = answers[question.id] || null;
        const isCorrect = selected === question.answer;
        const time = Number(timeByQuestion[question.id] || 0);
        await db.runAsync(
          `INSERT INTO nqt_answers (
            id, attempt_id, question_id, subject_id, topic_id, selected_option,
            correct_option, is_correct, is_marked, time_spent_seconds, answered_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [generateUUID(), attemptId, question.id, question.subjectId, question.topicId, selected, question.answer,
            isCorrect ? 1 : 0, marked[question.id] ? 1 : 0, time, completedAt]
        );

        const existing = await db.getFirstAsync(
          'SELECT * FROM nqt_topic_performance WHERE user_id = ? AND topic_id = ?',
          [userId, question.topicId]
        );
        await db.runAsync(
          `INSERT OR REPLACE INTO nqt_topic_performance (
            user_id, topic_id, attempts, correct_count, incorrect_count, unanswered_count,
            total_time_seconds, last_attempt_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            userId,
            question.topicId,
            Number(existing?.attempts || 0) + 1,
            Number(existing?.correct_count || 0) + (isCorrect ? 1 : 0),
            Number(existing?.incorrect_count || 0) + (selected && !isCorrect ? 1 : 0),
            Number(existing?.unanswered_count || 0) + (!selected ? 1 : 0),
            Number(existing?.total_time_seconds || 0) + time,
            completedAt,
          ]
        );
      }
    });

    return this.getAttempt(attemptId, userId);
  },

  async getAttempts(userId = 'admin', limit = 100) {
    await ensureSeeded();
    const db = await getDatabase();
    return db.getAllAsync(
      `SELECT a.*, q.mode, q.difficulty, q.question_count, q.config
       FROM nqt_attempts a JOIN nqt_generated_quizzes q ON q.id = a.quiz_id
       WHERE a.user_id = ? ORDER BY a.completed_at DESC LIMIT ?`,
      [userId, limit]
    );
  },

  async getAttempt(attemptId, userId = 'admin') {
    await ensureSeeded();
    const db = await getDatabase();
    const row = await db.getFirstAsync(
      `SELECT a.*, q.mode, q.difficulty, q.question_count, q.duration_seconds,
              q.subject_id AS quiz_subject_id, q.topic_id AS quiz_topic_id, q.config, q.question_snapshot
       FROM nqt_attempts a JOIN nqt_generated_quizzes q ON q.id = a.quiz_id
       WHERE a.id = ? AND a.user_id = ?`,
      [attemptId, userId]
    );
    if (!row) return null;
    const answerRows = await db.getAllAsync('SELECT * FROM nqt_answers WHERE attempt_id = ?', [attemptId]);
    const answerByQuestion = new Map(answerRows.map((answer) => [answer.question_id, answer]));
    const questions = safeJson(row.question_snapshot, []).map((question) => {
      const answer = answerByQuestion.get(question.id);
      return {
        ...question,
        selectedOption: answer?.selected_option || null,
        isMarked: Boolean(answer?.is_marked),
        isCorrect: Boolean(answer?.is_correct),
        timeSpentSeconds: Number(answer?.time_spent_seconds || 0),
      };
    });
    return { ...row, questions };
  },

  async getDashboard(userId = 'admin') {
    const [attempts, topics, questionMistakes, questionBankSize] = await Promise.all([
      this.getAttempts(userId, 200),
      this.getTopics(userId),
      (async () => {
        const db = await getDatabase();
        return db.getAllAsync(
          `SELECT q.id, q.prompt, q.topic_id, t.name AS topic_name, s.name AS subject_name,
                  SUM(CASE WHEN a.selected_option IS NOT NULL AND a.is_correct = 0 THEN 1 ELSE 0 END) AS wrong_count,
                  SUM(CASE WHEN a.is_correct = 1 THEN 1 ELSE 0 END) AS correct_count
           FROM nqt_answers a
           JOIN nqt_attempts attempt ON attempt.id = a.attempt_id
           JOIN nqt_questions q ON q.id = a.question_id
           JOIN nqt_topics t ON t.id = q.topic_id
           JOIN nqt_subjects s ON s.id = q.subject_id
           WHERE attempt.user_id = ?
           GROUP BY q.id, q.prompt, q.topic_id, t.name, s.name
           HAVING SUM(CASE WHEN a.selected_option IS NOT NULL AND a.is_correct = 0 THEN 1 ELSE 0 END) >= 2
           ORDER BY wrong_count DESC LIMIT 5`,
          [userId]
        );
      })(),
      this.getQuestionCount(userId),
    ]);
    const totalQuestions = attempts.reduce((sum, item) => sum + Number(item.question_count || 0), 0);
    const totalCorrect = attempts.reduce((sum, item) => sum + Number(item.correct_count || 0), 0);
    const averageAccuracy = totalQuestions ? (totalCorrect / totalQuestions) * 100 : 0;
    const best = attempts.reduce((value, item) => Math.max(value, Number(item.accuracy || 0)), 0);
    const topicCount = topics.filter((topic) => topic.seen > 0).length;
    const weakTopics = topics
      .filter((topic) => topic.seen > 0)
      .sort((a, b) => (a.accuracy - b.accuracy) || (b.importance - a.importance));
    const recentAverage = attempts.length >= 3
      ? attempts.slice(0, 3).reduce((sum, item) => sum + Number(item.accuracy || 0), 0) / 3
      : null;
    const previousAverage = attempts.length >= 6
      ? attempts.slice(3, 6).reduce((sum, item) => sum + Number(item.accuracy || 0), 0) / 3
      : null;
    const subjectPerformance = new Map();
    for (const topic of topics) {
      let subject = subjectPerformance.get(topic.subjectId);
      if (!subject) {
        subject = { subjectId: topic.subjectId, name: topic.subjectName, section: topic.section, seen: 0, correct: 0 };
        subjectPerformance.set(topic.subjectId, subject);
      }
      subject.seen += topic.seen;
      subject.correct += topic.correct;
    }
    const subjects = Array.from(subjectPerformance.values()).map((subject) => ({
      ...subject,
      accuracy: subject.seen ? round((subject.correct / subject.seen) * 100) : null,
    }));
    return {
      totals: {
        attempts: attempts.length,
        averageAccuracy: round(averageAccuracy),
        bestAccuracy: round(best),
        questionsAnswered: totalQuestions,
        topicsPracticed: topicCount,
        questionBankSize,
        recentTrend: recentAverage !== null && previousAverage !== null
          ? round(recentAverage - previousAverage)
          : null,
      },
      attempts,
      topics,
      weakTopics,
      weakestTopic: weakTopics[0] || null,
      strongestTopic: [...weakTopics].reverse().find((topic) => topic.seen >= 2) || null,
      questionMistakes,
      subjects,
    };
  },
};

export default NqtQuizDao;
