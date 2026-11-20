const express = require('express');
const { randomUUID } = require('crypto');
const router = express.Router();
const NqtSubject = require('../models/nqt/NqtSubject');
const NqtTopic = require('../models/nqt/NqtTopic');
const NqtQuestion = require('../models/nqt/NqtQuestion');
const NqtGeneratedQuiz = require('../models/nqt/NqtGeneratedQuiz');
const NqtQuizAttempt = require('../models/nqt/NqtQuizAttempt');
const NqtQuizAnswer = require('../models/nqt/NqtQuizAnswer');
const NqtTopicPerformance = require('../models/nqt/NqtTopicPerformance');
const { generateNqtQuestions } = require('../services/nqtQuizAiService');
const { ensureNqtCatalog, toClientCatalog, PATTERN_PROFILE } = require('../services/nqtQuizCatalogService');

const MODES = new Set(['mixed', 'subject', 'topic', 'full_mock']);
const DIFFICULTIES = new Set(['easy', 'medium', 'hard', 'exam']);
const cleanUserId = (value) => String(value || 'admin').trim().slice(0, 100) || 'admin';
const round = (value, places = 1) => Number(Number(value || 0).toFixed(places));

function quizPayload(quiz, questions) {
  return {
    id: quiz.quizId,
    userId: quiz.userId,
    mode: quiz.mode,
    subjectId: quiz.subjectId,
    topicId: quiz.topicId,
    difficulty: quiz.difficulty,
    questionCount: quiz.questionCount,
    durationSeconds: quiz.durationSeconds,
    questionSnapshot: questions,
    config: quiz.config,
    createdAt: quiz.createdAt,
  };
}

function questionForClient(question) {
  return {
    id: question.questionId,
    subjectId: question.subjectId,
    subjectName: question.subjectName,
    section: question.section,
    topicId: question.topicId,
    topicName: question.topicName,
    prompt: question.prompt,
    options: question.options,
    answer: question.answer,
    solution: question.solution,
    difficulty: question.difficulty,
    pattern: question.pattern,
    estimatedSeconds: question.estimatedSeconds,
    importance: question.importance,
  };
}

function mixTargets(count, mode) {
  if (mode === 'full_mock') return Object.fromEntries([
    'nqt_numerical', 'nqt_verbal', 'nqt_reasoning', 'nqt_advanced', 'nqt_coding',
  ].map((subjectId) => [subjectId, 6]));
  const weights = [
    ['nqt_numerical', 0.25],
    ['nqt_verbal', 0.2],
    ['nqt_reasoning', 0.25],
    ['nqt_advanced', 0.2],
    ['nqt_coding', 0.1],
  ];
  const allocations = weights.map(([subjectId, weight]) => ({
    subjectId,
    target: Math.floor(count * weight),
    remainder: count * weight - Math.floor(count * weight),
  }));
  let remaining = count - allocations.reduce((sum, item) => sum + item.target, 0);
  allocations.sort((a, b) => b.remainder - a.remainder);
  for (let index = 0; index < remaining; index += 1) allocations[index % allocations.length].target += 1;
  return Object.fromEntries(allocations.map(({ subjectId, target }) => [subjectId, target]));
}

function asAttemptListItem(attempt, quiz) {
  return {
    id: attempt.attemptId,
    quiz_id: attempt.quizId,
    user_id: attempt.userId,
    score: attempt.score,
    correct_count: attempt.correctCount,
    incorrect_count: attempt.incorrectCount,
    unanswered_count: attempt.unansweredCount,
    accuracy: attempt.accuracy,
    time_taken_seconds: attempt.timeTakenSeconds,
    started_at: attempt.startedAt,
    completed_at: attempt.completedAt,
    mode: quiz.mode,
    difficulty: quiz.difficulty,
    question_count: quiz.questionCount,
    config: quiz.config,
  };
}

async function buildDashboard(userId) {
  const [catalogSubjects, catalogTopics, attempts, performanceRows, allAnswers] = await Promise.all([
    NqtSubject.find().sort({ orderIndex: 1 }).lean(),
    NqtTopic.find().sort({ importance: -1, frequency: -1 }).lean(),
    NqtQuizAttempt.find({ userId }).sort({ completedAt: -1 }).limit(200).lean(),
    NqtTopicPerformance.find({ userId }).lean(),
    NqtQuizAnswer.find({ userId }).sort({ answeredAt: -1 }).limit(1000).lean(),
  ]);
  const quizIds = [...new Set(attempts.map((attempt) => attempt.quizId))];
  const quizzes = await NqtGeneratedQuiz.find({ quizId: { $in: quizIds } }).lean();
  const quizById = new Map(quizzes.map((quiz) => [quiz.quizId, quiz]));
  const attemptItems = attempts.map((attempt) => asAttemptListItem(attempt, quizById.get(attempt.quizId) || {}));
  const performanceByTopic = new Map(performanceRows.map((item) => [item.topicId, item]));
  const topicRows = catalogTopics.map((topic) => {
    const stats = performanceByTopic.get(topic.topicId);
    const seen = Number(stats?.questionsSeen || 0);
    const correct = Number(stats?.correctCount || 0);
    return {
      id: topic.topicId,
      topicId: topic.topicId,
      subjectId: topic.subjectId,
      subjectName: catalogSubjects.find((item) => item.subjectId === topic.subjectId)?.name || '',
      section: catalogSubjects.find((item) => item.subjectId === topic.subjectId)?.section || '',
      name: topic.name,
      importance: topic.importance,
      frequency: topic.frequency,
      difficulty: topic.difficulty,
      bankCount: 0,
      seen,
      correct,
      incorrect: Number(stats?.incorrectCount || 0),
      unanswered: Number(stats?.unansweredCount || 0),
      accuracy: seen ? round((correct / seen) * 100) : null,
      averageSeconds: seen ? round(Number(stats?.totalTimeSeconds || 0) / seen, 0) : null,
      lastAttemptAt: stats?.lastAttemptAt || null,
    };
  });
  const questionIds = [...new Set(allAnswers.map((answer) => answer.questionId))];
  const questions = await NqtQuestion.find({ questionId: { $in: questionIds } })
    .select('questionId prompt topicId subjectId topicName subjectName')
    .lean();
  const questionById = new Map(questions.map((question) => [question.questionId, question]));
  const mistakeByQuestion = new Map();
  for (const answer of allAnswers) {
    const current = mistakeByQuestion.get(answer.questionId) || { wrong_count: 0, correct_count: 0 };
    if (answer.selectedOption && !answer.isCorrect) current.wrong_count += 1;
    if (answer.isCorrect) current.correct_count += 1;
    mistakeByQuestion.set(answer.questionId, current);
  }
  const questionMistakes = Array.from(mistakeByQuestion.entries())
    .filter(([, item]) => item.wrong_count >= 2)
    .map(([id, stats]) => {
      const question = questionById.get(id) || {};
      return {
        id,
        prompt: question.prompt || '',
        topic_id: question.topicId || '',
        topic_name: question.topicName || '',
        subject_name: question.subjectName || '',
        wrong_count: stats.wrong_count,
        correct_count: stats.correct_count,
      };
    })
    .sort((a, b) => b.wrong_count - a.wrong_count)
    .slice(0, 5);

  const totalQuestions = attemptItems.reduce((sum, item) => sum + Number(item.question_count || 0), 0);
  const totalCorrect = attemptItems.reduce((sum, item) => sum + Number(item.correct_count || 0), 0);
  const weakTopics = topicRows.filter((topic) => topic.seen > 0)
    .sort((a, b) => (a.accuracy - b.accuracy) || (b.importance - a.importance));
  const averageOf = (items) => items.length
    ? items.reduce((sum, item) => sum + Number(item.accuracy || 0), 0) / items.length
    : null;
  const recentAverage = attemptItems.length >= 3 ? averageOf(attemptItems.slice(0, 3)) : null;
  const previousAverage = attemptItems.length >= 6 ? averageOf(attemptItems.slice(3, 6)) : null;
  const subjectTotals = new Map();
  for (const topic of topicRows) {
    const item = subjectTotals.get(topic.subjectId) || {
      subjectId: topic.subjectId,
      name: topic.subjectName,
      section: topic.section,
      seen: 0,
      correct: 0,
    };
    item.seen += topic.seen;
    item.correct += topic.correct;
    subjectTotals.set(topic.subjectId, item);
  }
  const subjectPerformance = Array.from(subjectTotals.values()).map((item) => ({
    ...item,
    accuracy: item.seen ? round((item.correct / item.seen) * 100) : null,
  }));
  const bankCounts = await NqtQuestion.aggregate([
    { $match: { userId } },
    { $group: { _id: '$topicId', count: { $sum: 1 } } },
  ]);
  const bankByTopic = new Map(bankCounts.map((item) => [item._id, item.count]));
  const topics = topicRows.map((topic) => ({ ...topic, bankCount: bankByTopic.get(topic.id) || 0 }));
  const totalBank = bankCounts.reduce((sum, item) => sum + item.count, 0);
  return {
    totals: {
      attempts: attemptItems.length,
      averageAccuracy: totalQuestions ? round((totalCorrect / totalQuestions) * 100) : 0,
      bestAccuracy: attemptItems.reduce((best, item) => Math.max(best, Number(item.accuracy || 0)), 0),
      questionsAnswered: totalQuestions,
      topicsPracticed: topics.filter((topic) => topic.seen > 0).length,
      questionBankSize: totalBank,
      recentTrend: recentAverage !== null && previousAverage !== null
        ? round(recentAverage - previousAverage)
        : null,
    },
    attempts: attemptItems,
    topics,
    weakTopics,
    weakestTopic: weakTopics[0] || null,
    strongestTopic: [...weakTopics].reverse().find((topic) => topic.seen >= 2) || null,
    questionMistakes,
    subjects: subjectPerformance,
  };
}

router.get('/catalog', async (req, res) => {
  try {
    const userId = cleanUserId(req.query.userId);
    await ensureNqtCatalog();
    const [subjects, topics] = await Promise.all([
      NqtSubject.find().sort({ orderIndex: 1 }).lean(),
      NqtTopic.find().sort({ importance: -1, frequency: -1 }).lean(),
    ]);
    const catalog = toClientCatalog(subjects, topics);
    const bankCounts = await NqtQuestion.aggregate([
      { $match: { userId } },
      { $group: { _id: '$topicId', count: { $sum: 1 } } },
    ]);
    const countByTopic = new Map(bankCounts.map((item) => [item._id, item.count]));
    res.json({ ...catalog, topics: catalog.topics.map((topic) => ({
      ...topic,
      bankCount: countByTopic.get(topic.id) || 0,
    })) });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Could not load the NQT topic catalog.' });
  }
});

router.post('/generate', async (req, res) => {
  try {
    await ensureNqtCatalog();
    const userId = cleanUserId(req.body?.userId);
    const config = req.body?.config || {};
    if (!MODES.has(config.mode)) return res.status(400).json({ error: 'Choose a valid quiz mode.' });
    if (!DIFFICULTIES.has(config.difficulty)) return res.status(400).json({ error: 'Choose Easy, Medium, Hard, or TCS NQT level.' });
    const questionCount = config.mode === 'full_mock' ? 30 : Math.round(Number(config.questionCount));
    if (!Number.isFinite(questionCount) || questionCount < 5 || questionCount > 30) {
      return res.status(400).json({ error: 'Quiz size must be between 5 and 30 questions.' });
    }
    if (config.mode === 'subject' && !config.subjectId) return res.status(400).json({ error: 'Choose a subject for a subject quiz.' });
    if (config.mode === 'topic' && !config.topicId) return res.status(400).json({ error: 'Choose a topic for topic practice.' });

    const [subjects, allTopics] = await Promise.all([
      NqtSubject.find().sort({ orderIndex: 1 }).lean(),
      NqtTopic.find().sort({ importance: -1, frequency: -1 }).lean(),
    ]);
    const subjectIds = new Set(subjects.map((subject) => subject.subjectId));
    const topicIds = new Set(allTopics.map((topic) => topic.topicId));
    if (config.mode === 'subject' && !subjectIds.has(config.subjectId)) return res.status(400).json({ error: 'Unknown NQT subject.' });
    if (config.mode === 'topic' && !topicIds.has(config.topicId)) return res.status(400).json({ error: 'Unknown NQT topic.' });
    const topics = allTopics.filter((topic) => (
      (config.mode !== 'subject' || topic.subjectId === config.subjectId)
      && (config.mode !== 'topic' || topic.topicId === config.topicId)
    )).map((topic) => ({
      id: topic.topicId,
      subjectId: topic.subjectId,
      name: topic.name,
      importance: topic.importance,
      frequency: topic.frequency,
      difficulty: topic.difficulty,
    }));
    const normalizedConfig = {
      mode: config.mode,
      difficulty: config.difficulty,
      questionCount,
      subjectId: config.mode === 'subject' ? config.subjectId : null,
      topicId: config.mode === 'topic' ? config.topicId : null,
    };

    const performance = await NqtTopicPerformance.find({ userId }).lean();
    const latestAnswers = await NqtQuizAnswer.find({ userId }).sort({ answeredAt: -1 }).limit(500).lean();
    const topicAccuracy = {};
    const topicIncorrect = {};
    const topicWeight = {};
    for (const row of performance) {
      const seen = Number(row.questionsSeen || 0);
      const accuracy = seen ? round((Number(row.correctCount || 0) / seen) * 100) : null;
      const incorrect = Number(row.incorrectCount || 0);
      topicAccuracy[row.topicId] = accuracy;
      topicIncorrect[row.topicId] = incorrect;
      topicWeight[row.topicId] = 1 + (accuracy === null ? 0.15 : (1 - accuracy / 100) * 1.6) + Math.min(0.6, incorrect / 20);
    }
    const mistakenTopics = new Map();
    const wrongQuestionCounts = new Map();
    for (const answer of latestAnswers) {
      if (answer.selectedOption && !answer.isCorrect) {
        mistakenTopics.set(answer.topicId, (mistakenTopics.get(answer.topicId) || 0) + 1);
        wrongQuestionCounts.set(answer.questionId, (wrongQuestionCounts.get(answer.questionId) || 0) + 1);
      }
    }
    const repeatedTopicMistakes = Array.from(mistakenTopics.entries())
      .filter(([, count]) => count >= 2)
      .map(([topicId, count]) => `${topicId}: ${count} recent incorrect answers`)
      .slice(0, 10);
    const historyQuestionIds = [...new Set(latestAnswers.slice(0, 100).map((item) => item.questionId))];
    const [recentQuestions, repeatedQuestionRows] = await Promise.all([
      NqtQuestion.find({ questionId: { $in: historyQuestionIds } })
        .select('prompt createdAt').sort({ createdAt: -1 }).limit(20).lean(),
      NqtQuestion.find({ questionId: { $in: Array.from(wrongQuestionCounts.keys()) } })
        .select('questionId topicName pattern').lean(),
    ]);
    const questionById = new Map(repeatedQuestionRows.map((item) => [item.questionId, item]));
    const repeatedQuestionMistakes = Array.from(wrongQuestionCounts.entries())
      .filter(([, count]) => count >= 2)
      .map(([questionId, count]) => {
        const question = questionById.get(questionId);
        return question ? `${question.topicName}: repeated ${question.pattern} pattern (${count} recent incorrect answers)` : null;
      })
      .filter(Boolean)
      .slice(0, 10);
    const repeatedMistakes = [...repeatedTopicMistakes, ...repeatedQuestionMistakes].slice(0, 10);
    const localAdaptation = req.body?.adaptation && typeof req.body.adaptation === 'object' ? req.body.adaptation : {};
    const adaptation = {
      ...localAdaptation,
      topicAccuracy: { ...(localAdaptation.topicAccuracy || {}), ...topicAccuracy },
      topicIncorrect: { ...(localAdaptation.topicIncorrect || {}), ...topicIncorrect },
      topicWeight: { ...(localAdaptation.topicWeight || {}), ...topicWeight },
      repeatedMistakes: [...new Set([...(localAdaptation.repeatedMistakes || []), ...repeatedMistakes])].slice(0, 10),
    };
    const targetMix = mixTargets(questionCount, config.mode);
    const result = await generateNqtQuestions({
      config: normalizedConfig,
      topics,
      subjects: subjects.map((subject) => ({
        id: subject.subjectId,
        name: subject.name,
        section: subject.section,
        examWeight: subject.examWeight,
        order: subject.orderIndex,
      })),
      adaptation,
      recentQuestions,
      patternProfile: PATTERN_PROFILE,
      targetMix,
      userId,
    });
    const quizId = randomUUID();
    const durationSeconds = config.mode === 'full_mock'
      ? 190 * 60
      : Math.max(300, Math.ceil(questionCount * 90));
    const questions = result.questions.map((question, index) => ({ ...question, id: question.id, orderIndex: index }));
    const generatedQuiz = await NqtGeneratedQuiz.create({
      quizId,
      userId,
      mode: normalizedConfig.mode,
      subjectId: normalizedConfig.subjectId,
      topicId: normalizedConfig.topicId,
      difficulty: normalizedConfig.difficulty,
      questionCount,
      durationSeconds,
      questionIds: questions.map((question) => question.id),
      config: normalizedConfig,
      patternProfile: PATTERN_PROFILE.id,
      promptVersion: result.promptVersion,
      provider: result.provider,
      model: result.model,
    });
    await NqtQuestion.insertMany(questions.map((question) => ({
      questionId: question.id,
      quizId,
      userId,
      ...question,
    })), { ordered: true });
    res.json(quizPayload(generatedQuiz.toObject(), questions));
  } catch (error) {
    const status = Number(error.status) || 500;
    res.status(status).json({ error: error.message || 'Could not generate this NQT quiz.' });
  }
});

router.post('/attempts', async (req, res) => {
  try {
    const userId = cleanUserId(req.body?.userId);
    const attemptId = String(req.body?.attemptId || '').trim();
    const quizId = String(req.body?.quizId || '').trim();
    if (!attemptId || !quizId) return res.status(400).json({ error: 'Attempt and quiz IDs are required.' });
    const previous = await NqtQuizAttempt.findOne({ attemptId, userId }).lean();
    if (previous && previous.quizId !== quizId) return res.status(409).json({ error: 'Attempt ID is already assigned to another quiz.' });
    const quiz = await NqtGeneratedQuiz.findOne({ quizId, userId }).lean();
    if (!quiz) return res.status(404).json({ error: 'Quiz not found for this user.' });
    if (previous) {
      const savedAnswerCount = await NqtQuizAnswer.countDocuments({ attemptId, userId });
      if (savedAnswerCount === quiz.questionCount) return res.json(await buildAttemptResult(previous, quiz));
    }
    const questions = await NqtQuestion.find({ quizId, userId }).sort({ orderIndex: 1 }).lean();
    if (questions.length !== quiz.questionCount) return res.status(409).json({ error: 'Quiz question history is incomplete.' });
    const answers = req.body?.answers && typeof req.body.answers === 'object' ? req.body.answers : {};
    const marked = req.body?.marked && typeof req.body.marked === 'object' ? req.body.marked : {};
    const timeByQuestion = req.body?.timeByQuestion && typeof req.body.timeByQuestion === 'object' ? req.body.timeByQuestion : {};
    const parsedCompletedAt = new Date(req.body?.completedAt || Date.now());
    const completedAt = Number.isNaN(parsedCompletedAt.getTime()) ? new Date() : parsedCompletedAt;
    const parsedStartedAt = new Date(req.body?.startedAt || completedAt);
    const startedAt = Number.isNaN(parsedStartedAt.getTime()) ? completedAt : parsedStartedAt;
    const answerRecords = questions.map((question) => {
      const selectedOption = ['A', 'B', 'C', 'D'].includes(answers[question.questionId]) ? answers[question.questionId] : null;
      return {
        answerId: `${attemptId}:${question.questionId}`,
        attemptId,
        quizId,
        questionId: question.questionId,
        userId,
        subjectId: question.subjectId,
        topicId: question.topicId,
        selectedOption,
        correctOption: question.answer,
        isCorrect: selectedOption === question.answer,
        isMarked: Boolean(marked[question.questionId]),
        timeSpentSeconds: Math.max(0, Math.min(3600, Number(timeByQuestion[question.questionId]) || 0)),
        answeredAt: completedAt,
      };
    });
    const correctCount = answerRecords.filter((answer) => answer.isCorrect).length;
    const answeredCount = answerRecords.filter((answer) => answer.selectedOption).length;
    const attemptData = {
      attemptId,
      quizId,
      userId,
      score: correctCount,
      correctCount,
      incorrectCount: answeredCount - correctCount,
      unansweredCount: questions.length - answeredCount,
      accuracy: questions.length ? (correctCount / questions.length) * 100 : 0,
      timeTakenSeconds: Math.max(0, Math.min(quiz.durationSeconds, Number(req.body?.timeTakenSeconds) || 0)),
      startedAt,
      completedAt,
    };
    await NqtQuizAnswer.bulkWrite(answerRecords.map((answer) => ({
      updateOne: {
        filter: { attemptId, questionId: answer.questionId },
        update: { $set: answer },
        upsert: true,
      },
    })), { ordered: true });
    const topicIds = [...new Set(answerRecords.map((answer) => answer.topicId))];
    const topicAggregates = await NqtQuizAnswer.aggregate([
      { $match: { userId, topicId: { $in: topicIds } } },
      {
        $group: {
          _id: { topicId: '$topicId', subjectId: '$subjectId' },
          questionsSeen: { $sum: 1 },
          correctCount: { $sum: { $cond: ['$isCorrect', 1, 0] } },
          incorrectCount: { $sum: { $cond: [{ $and: [{ $ne: ['$selectedOption', null] }, { $eq: ['$isCorrect', false] }] }, 1, 0] } },
          unansweredCount: { $sum: { $cond: [{ $eq: ['$selectedOption', null] }, 1, 0] } },
          totalTimeSeconds: { $sum: '$timeSpentSeconds' },
          lastAttemptAt: { $max: '$answeredAt' },
        },
      },
    ]);
    await NqtTopicPerformance.bulkWrite(topicAggregates.map((stats) => ({
      updateOne: {
        filter: { userId, topicId: stats._id.topicId },
        update: {
          $set: {
            userId,
            topicId: stats._id.topicId,
            subjectId: stats._id.subjectId,
            questionsSeen: stats.questionsSeen,
            correctCount: stats.correctCount,
            incorrectCount: stats.incorrectCount,
            unansweredCount: stats.unansweredCount,
            totalTimeSeconds: stats.totalTimeSeconds,
            lastAttemptAt: stats.lastAttemptAt,
          },
        },
        upsert: true,
      },
    })), { ordered: false });
    const attempt = await NqtQuizAttempt.findOneAndUpdate(
      { attemptId, userId },
      { $set: attemptData },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    res.json(await buildAttemptResult(attempt.toObject(), quiz, questions, answerRecords));
  } catch (error) {
    res.status(500).json({ error: error.message || 'Could not save quiz attempt.' });
  }
});

async function buildAttemptResult(attempt, quiz, providedQuestions, providedAnswers) {
  if (!quiz) return null;
  const questions = providedQuestions || await NqtQuestion.find({ quizId: quiz.quizId }).sort({ orderIndex: 1 }).lean();
  const answers = providedAnswers || await NqtQuizAnswer.find({ attemptId: attempt.attemptId }).lean();
  const answerByQuestion = new Map(answers.map((answer) => [answer.questionId, answer]));
  return {
    ...asAttemptListItem(attempt, quiz),
    duration_seconds: quiz.durationSeconds,
    quiz_subject_id: quiz.subjectId,
    quiz_topic_id: quiz.topicId,
    question_snapshot: questions.map(questionForClient),
    questions: questions.map((question) => {
      const answer = answerByQuestion.get(question.questionId);
      return {
        ...questionForClient(question),
        selectedOption: answer?.selectedOption || null,
        isMarked: Boolean(answer?.isMarked),
        isCorrect: Boolean(answer?.isCorrect),
        timeSpentSeconds: Number(answer?.timeSpentSeconds || 0),
      };
    }),
  };
}

router.get('/attempts', async (req, res) => {
  try {
    const userId = cleanUserId(req.query.userId);
    const limit = Math.max(1, Math.min(200, Number(req.query.limit) || 100));
    const attempts = await NqtQuizAttempt.find({ userId }).sort({ completedAt: -1 }).limit(limit).lean();
    const quizIds = [...new Set(attempts.map((attempt) => attempt.quizId))];
    const quizzes = await NqtGeneratedQuiz.find({ quizId: { $in: quizIds } }).lean();
    const quizById = new Map(quizzes.map((quiz) => [quiz.quizId, quiz]));
    res.json(attempts.map((attempt) => asAttemptListItem(attempt, quizById.get(attempt.quizId) || {})));
  } catch (error) {
    res.status(500).json({ error: error.message || 'Could not load NQT attempt history.' });
  }
});

router.get('/attempts/:attemptId', async (req, res) => {
  try {
    const userId = cleanUserId(req.query.userId);
    const attempt = await NqtQuizAttempt.findOne({ attemptId: req.params.attemptId, userId }).lean();
    if (!attempt) return res.status(404).json({ error: 'NQT attempt not found.' });
    const quiz = await NqtGeneratedQuiz.findOne({ quizId: attempt.quizId, userId }).lean();
    res.json(await buildAttemptResult(attempt, quiz));
  } catch (error) {
    res.status(500).json({ error: error.message || 'Could not load this NQT result.' });
  }
});

router.get('/analytics', async (req, res) => {
  try {
    await ensureNqtCatalog();
    res.json(await buildDashboard(cleanUserId(req.query.userId)));
  } catch (error) {
    res.status(500).json({ error: error.message || 'Could not calculate NQT performance.' });
  }
});

module.exports = router;
