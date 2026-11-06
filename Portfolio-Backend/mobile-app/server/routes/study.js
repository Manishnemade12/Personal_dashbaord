const express = require('express');
const router = express.Router();

const StudySubject = require('../models/StudySubject');
const StudyChunk = require('../models/StudyChunk');
const StudyQuizQuestion = require('../models/StudyQuizQuestion');
const StudyDailyQuiz = require('../models/StudyDailyQuiz');
const StudyDailyQuizAttempt = require('../models/StudyDailyQuizAttempt');
const StudyDailyQuizConfig = require('../models/StudyDailyQuizConfig');
const StudyWeakQuestion = require('../models/StudyWeakQuestion');
const StudyUserStreak = require('../models/StudyUserStreak');

const { organizeContentWithAi } = require('../services/studyAiChunkerService');
const { generateQuizFromNotes } = require('../services/studyAiQuizService');

// ================= 1. BOOTSTRAP / FULL FETCH =================

router.get('/all', async (req, res) => {
  try {
    const userId = req.user?.id || req.query.userId || 'admin';
    const [subjects, chunks, quizQuestions] = await Promise.all([
      StudySubject.find({ userId, isDeleted: false }).sort({ orderIndex: 1, createdAt: 1 }).lean(),
      StudyChunk.find({ userId, isDeleted: false }).sort({ orderIndex: 1, createdAt: 1 }).lean(),
      StudyQuizQuestion.find({ userId, isDeleted: false }).sort({ orderIndex: 1 }).lean(),
    ]);

    // Attach in-chunk quizzes
    const quizMap = new Map();
    for (const q of quizQuestions) {
      const list = quizMap.get(q.chunkId) || [];
      list.push({
        id: q.clientId || q._id,
        _id: q._id,
        clientId: q.clientId,
        chunkId: q.chunkId,
        question: q.question,
        type: q.type,
        options: q.options || [],
        answer: q.answer,
        explanation: q.explanation || '',
      });
      quizMap.set(q.chunkId, list);
    }

    const formattedChunks = chunks.map((c) => ({
      id: c.clientId || c._id,
      _id: c._id,
      clientId: c.clientId,
      subjectId: c.subjectId,
      parentChunkId: c.parentChunkId,
      title: c.title,
      order: c.orderIndex,
      orderIndex: c.orderIndex,
      summary: c.summary || '',
      notes: c.notes || '',
      keyPoints: c.keyPoints || [],
      terms: c.terms || [],
      quiz: quizMap.get(c.clientId) || quizMap.get(String(c._id)) || [],
      revised: Boolean(c.revised),
      createdAt: c.createdAt ? new Date(c.createdAt).getTime() : Date.now(),
      updatedAt: c.updatedAt ? new Date(c.updatedAt).getTime() : Date.now(),
    }));

    const formattedSubjects = subjects.map((s) => ({
      id: s.clientId || s._id,
      _id: s._id,
      clientId: s.clientId,
      name: s.name,
      description: s.description || '',
      orderIndex: s.orderIndex,
      createdAt: s.createdAt ? new Date(s.createdAt).getTime() : Date.now(),
    }));

    res.json({
      success: true,
      subjects: formattedSubjects,
      chunks: formattedChunks,
    });
  } catch (err) {
    console.error('[Study API] /all error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ================= 2. AI PROCESSING =================

router.post('/ai/chunk-content', async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || content.trim().length < 20) {
      return res.status(400).json({ error: 'Please provide at least a paragraph of study content.' });
    }

    const organizedTree = await organizeContentWithAi(content);
    res.json(organizedTree);
  } catch (err) {
    console.error('[Study API] /ai/chunk-content error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/ai/generate-quiz', async (req, res) => {
  try {
    const { notes, difficulty = 'medium', count = 10, subjectId, chunkIds } = req.body;
    let textToUse = notes || '';

    // If chunkIds provided but no notes, pull them from database
    if (!textToUse && Array.isArray(chunkIds) && chunkIds.length > 0) {
      const chunks = await StudyChunk.find({
        $or: [{ clientId: { $in: chunkIds } }, { _id: { $in: chunkIds } }],
        isDeleted: false,
      }).lean();
      textToUse = chunks.map((c) => `# ${c.title}\n${c.notes}`).join('\n\n');
    }

    if (!textToUse && subjectId) {
      const chunks = await StudyChunk.find({
        subjectId,
        isDeleted: false,
      }).lean();
      textToUse = chunks.map((c) => `# ${c.title}\n${c.notes}`).join('\n\n');
    }

    if (!textToUse || textToUse.trim().length < 20) {
      return res.status(400).json({ error: 'No content found to generate quiz from.' });
    }

    const questions = await generateQuizFromNotes(textToUse, difficulty, count);
    res.json({ questions });
  } catch (err) {
    console.error('[Study API] /ai/generate-quiz error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ================= 3. IMPORT TREE =================

router.post('/import-tree', async (req, res) => {
  try {
    const userId = req.user?.id || req.body.userId || 'admin';
    const { tree, target } = req.body;

    if (!tree?.subjects?.length) {
      return res.status(400).json({ error: 'No subjects in provided tree.' });
    }

    // Target parent chunk: all imported chunks become sub-chunks
    if (target?.parentChunkId) {
      const parent = await StudyChunk.findOne({
        $or: [{ clientId: target.parentChunkId }, { _id: target.parentChunkId }],
        isDeleted: false,
      });
      if (!parent) return res.status(404).json({ error: 'Target parent chunk not found.' });

      const subjectId = parent.subjectId;
      const baseCount = await StudyChunk.countDocuments({
        parentChunkId: parent.clientId || String(parent._id),
        isDeleted: false,
      });

      const flat = tree.subjects.flatMap((s) => s.chunks || []);
      const createdChunks = [];

      for (let i = 0; i < flat.length; i++) {
        const c = flat[i];
        const newChunk = new StudyChunk({
          userId,
          clientId: c.clientId || require('crypto').randomUUID(),
          subjectId,
          parentChunkId: parent.clientId || String(parent._id),
          title: c.title || 'Untitled',
          orderIndex: baseCount + i,
          summary: c.summary || '',
          notes: c.notes || '',
          keyPoints: c.keyPoints || [],
          terms: c.terms || [],
        });
        await newChunk.save();
        createdChunks.push(newChunk);

        // Save in-chunk quizzes
        for (let qi = 0; qi < (c.quiz || []).length; qi++) {
          const q = c.quiz[qi];
          const quizDoc = new StudyQuizQuestion({
            userId,
            clientId: q.clientId || require('crypto').randomUUID(),
            chunkId: newChunk.clientId,
            question: q.question,
            type: q.type || 'mcq',
            options: q.options || [],
            answer: q.answer,
            explanation: q.explanation || '',
            orderIndex: qi,
          });
          await quizDoc.save();
        }
      }

      return res.status(201).json({ success: true, count: createdChunks.length });
    }

    // Normal tree import
    let importedChunksCount = 0;
    for (const s of tree.subjects) {
      let subjectId = target?.subjectId;
      if (!subjectId) {
        let existingSubj = await StudySubject.findOne({
          userId,
          name: { $regex: new RegExp(`^${s.name.trim()}$`, 'i') },
          isDeleted: false,
        });
        if (existingSubj) {
          subjectId = existingSubj.clientId || String(existingSubj._id);
        } else {
          const newSubj = new StudySubject({
            userId,
            clientId: require('crypto').randomUUID(),
            name: s.name.trim(),
            description: s.description || '',
          });
          await newSubj.save();
          subjectId = newSubj.clientId;
        }
      }

      const baseCount = await StudyChunk.countDocuments({
        subjectId,
        parentChunkId: null,
        isDeleted: false,
      });

      for (let i = 0; i < (s.chunks || []).length; i++) {
        const c = s.chunks[i];
        const parentChunk = new StudyChunk({
          userId,
          clientId: c.clientId || require('crypto').randomUUID(),
          subjectId,
          parentChunkId: null,
          title: c.title || 'Untitled',
          orderIndex: baseCount + i,
          summary: c.summary || '',
          notes: c.notes || '',
          keyPoints: c.keyPoints || [],
          terms: c.terms || [],
        });
        await parentChunk.save();
        importedChunksCount++;

        for (let qi = 0; qi < (c.quiz || []).length; qi++) {
          const q = c.quiz[qi];
          const quizDoc = new StudyQuizQuestion({
            userId,
            clientId: q.clientId || require('crypto').randomUUID(),
            chunkId: parentChunk.clientId,
            question: q.question,
            type: q.type || 'mcq',
            options: q.options || [],
            answer: q.answer,
            explanation: q.explanation || '',
            orderIndex: qi,
          });
          await quizDoc.save();
        }

        // Sub-chunks
        for (let ci = 0; ci < (c.children || []).length; ci++) {
          const child = c.children[ci];
          const childChunk = new StudyChunk({
            userId,
            clientId: child.clientId || require('crypto').randomUUID(),
            subjectId,
            parentChunkId: parentChunk.clientId,
            title: child.title || 'Untitled',
            orderIndex: ci,
            summary: child.summary || '',
            notes: child.notes || '',
            keyPoints: child.keyPoints || [],
            terms: child.terms || [],
          });
          await childChunk.save();
          importedChunksCount++;

          for (let cqi = 0; cqi < (child.quiz || []).length; cqi++) {
            const cq = child.quiz[cqi];
            const cQuizDoc = new StudyQuizQuestion({
              userId,
              clientId: cq.clientId || require('crypto').randomUUID(),
              chunkId: childChunk.clientId,
              question: cq.question,
              type: cq.type || 'mcq',
              options: cq.options || [],
              answer: cq.answer,
              explanation: cq.explanation || '',
              orderIndex: cqi,
            });
            await cQuizDoc.save();
          }
        }
      }
    }

    res.status(201).json({ success: true, count: importedChunksCount });
  } catch (err) {
    console.error('[Study API] /import-tree error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ================= 4. SUBJECTS CRUD =================

router.get('/subjects', async (req, res) => {
  try {
    const userId = req.user?.id || req.query.userId || 'admin';
    const subjects = await StudySubject.find({ userId, isDeleted: false })
      .sort({ orderIndex: 1, createdAt: 1 })
      .lean();
    res.json(subjects.map((s) => ({ ...s, id: s.clientId || s._id })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/subjects', async (req, res) => {
  try {
    const userId = req.user?.id || req.body.userId || 'admin';
    const { name, description = '' } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Subject name is required.' });

    let existing = await StudySubject.findOne({
      userId,
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
      isDeleted: false,
    });
    if (existing) return res.json({ ...existing.toObject(), id: existing.clientId || existing._id });

    const maxOrderDoc = await StudySubject.findOne({ userId, isDeleted: false }).sort({ orderIndex: -1 });
    const orderIndex = (maxOrderDoc?.orderIndex ?? -1) + 1;

    const subject = new StudySubject({
      userId,
      clientId: require('crypto').randomUUID(),
      name: name.trim(),
      description,
      orderIndex,
    });
    await subject.save();
    res.status(201).json({ ...subject.toObject(), id: subject.clientId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/subjects/:id', async (req, res) => {
  try {
    const userId = req.user?.id || 'admin';
    const { id } = req.params;

    const subject = await StudySubject.findOneAndUpdate(
      { $or: [{ clientId: id }, { _id: id }], userId },
      { $set: { isDeleted: true, deletedAt: new Date() } }
    );
    if (!subject) return res.status(404).json({ error: 'Subject not found.' });

    // Cascade soft delete
    const subjIdKey = subject.clientId || String(subject._id);
    await StudyChunk.updateMany(
      { subjectId: subjIdKey, userId },
      { $set: { isDeleted: true, deletedAt: new Date() } }
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= 5. CHUNKS CRUD =================

router.get('/chunks/:id', async (req, res) => {
  try {
    const userId = req.user?.id || 'admin';
    const { id } = req.params;

    const chunk = await StudyChunk.findOne({
      $or: [{ clientId: id }, { _id: id }],
      userId,
      isDeleted: false,
    }).lean();

    if (!chunk) return res.status(404).json({ error: 'Chunk not found.' });

    const quizzes = await StudyQuizQuestion.find({
      chunkId: chunk.clientId || String(chunk._id),
      userId,
      isDeleted: false,
    }).sort({ orderIndex: 1 }).lean();

    res.json({
      ...chunk,
      id: chunk.clientId || chunk._id,
      quiz: quizzes.map((q) => ({
        id: q.clientId || q._id,
        question: q.question,
        type: q.type,
        options: q.options || [],
        answer: q.answer,
        explanation: q.explanation || '',
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/chunks', async (req, res) => {
  try {
    const userId = req.user?.id || req.body.userId || 'admin';
    const { subjectId, parentChunkId, title, summary, notes, keyPoints, terms, quiz } = req.body;

    const count = await StudyChunk.countDocuments({
      userId,
      subjectId,
      parentChunkId: parentChunkId || null,
      isDeleted: false,
    });

    const chunk = new StudyChunk({
      userId,
      clientId: require('crypto').randomUUID(),
      subjectId,
      parentChunkId: parentChunkId || null,
      title: title || 'Untitled',
      orderIndex: count,
      summary: summary || '',
      notes: notes || '',
      keyPoints: keyPoints || [],
      terms: terms || [],
    });
    await chunk.save();

    if (Array.isArray(quiz)) {
      for (let i = 0; i < quiz.length; i++) {
        const q = quiz[i];
        const qDoc = new StudyQuizQuestion({
          userId,
          clientId: require('crypto').randomUUID(),
          chunkId: chunk.clientId,
          question: q.question,
          type: q.type || 'mcq',
          options: q.options || [],
          answer: q.answer,
          explanation: q.explanation || '',
          orderIndex: i,
        });
        await qDoc.save();
      }
    }

    res.status(201).json({ ...chunk.toObject(), id: chunk.clientId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/chunks/:id', async (req, res) => {
  try {
    const userId = req.user?.id || 'admin';
    const { id } = req.params;
    const patch = req.body;

    const updated = await StudyChunk.findOneAndUpdate(
      { $or: [{ clientId: id }, { _id: id }], userId },
      { $set: patch },
      { returnDocument: 'after' }
    );
    if (!updated) return res.status(404).json({ error: 'Chunk not found.' });

    res.json({ ...updated.toObject(), id: updated.clientId || updated._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/chunks/:id', async (req, res) => {
  try {
    const userId = req.user?.id || 'admin';
    const { id } = req.params;

    const target = await StudyChunk.findOneAndUpdate(
      { $or: [{ clientId: id }, { _id: id }], userId },
      { $set: { isDeleted: true, deletedAt: new Date() } }
    );
    if (!target) return res.status(404).json({ error: 'Chunk not found.' });

    // Cascade delete sub-chunks
    await StudyChunk.updateMany(
      { parentChunkId: target.clientId || String(target._id), userId },
      { $set: { isDeleted: true, deletedAt: new Date() } }
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= 6. DAILY QUIZZES & ATTEMPTS =================

router.get('/daily-quiz/today', async (req, res) => {
  try {
    const userId = req.user?.id || 'admin';
    const date = req.query.date || new Date().toISOString().split('T')[0];

    const quizzes = await StudyDailyQuiz.find({
      userId,
      quizDate: date,
      isDeleted: false,
    }).sort({ createdAt: -1 }).lean();

    res.json(quizzes.map((q) => ({
      ...q,
      id: q.clientId || q._id,
      total_questions: q.totalQuestions || q.questions?.length,
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/daily-quiz/:id', async (req, res) => {
  try {
    const userId = req.user?.id || 'admin';
    const { id } = req.params;

    const quiz = await StudyDailyQuiz.findOne({
      $or: [{ clientId: id }, { _id: id }],
      userId,
      isDeleted: false,
    }).lean();

    if (!quiz) return res.status(404).json({ error: 'Quiz not found.' });
    res.json({ ...quiz, id: quiz.clientId || quiz._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/daily-quiz', async (req, res) => {
  try {
    const userId = req.user?.id || req.body.userId || 'admin';
    const { subjectId, quizDate, questions, difficulty = 'medium', source = 'ai' } = req.body;
    const date = quizDate || new Date().toISOString().split('T')[0];

    const quiz = new StudyDailyQuiz({
      userId,
      clientId: require('crypto').randomUUID(),
      subjectId,
      quizDate: date,
      questions: questions || [],
      totalQuestions: (questions || []).length,
      difficulty,
      source,
    });
    await quiz.save();
    res.status(201).json({ ...quiz.toObject(), id: quiz.clientId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/daily-quiz/attempt', async (req, res) => {
  try {
    const userId = req.user?.id || req.body.userId || 'admin';
    const { dailyQuizId, subjectId, quizDate, answers, score, totalQuestions, percentage, timeTaken } = req.body;

    const attempt = new StudyDailyQuizAttempt({
      userId,
      clientId: require('crypto').randomUUID(),
      dailyQuizId,
      subjectId,
      quizDate: quizDate || new Date().toISOString().split('T')[0],
      answers: answers || [],
      score,
      totalQuestions,
      percentage,
      timeTaken: timeTaken || 0,
      completed: true,
      startedAt: req.body.startedAt || new Date(),
      completedAt: new Date(),
    });
    await attempt.save();

    // Streak bump
    const todayStr = new Date().toISOString().split('T')[0];
    let streakDoc = await StudyUserStreak.findOne({ userId });
    if (!streakDoc) {
      streakDoc = new StudyUserStreak({
        userId,
        clientId: require('crypto').randomUUID(),
        currentStreak: 1,
        longestStreak: 1,
        lastActiveDate: todayStr,
        totalQuizzesCompleted: 1,
      });
      await streakDoc.save();
    } else {
      let current = streakDoc.currentStreak || 0;
      const last = streakDoc.lastActiveDate ? new Date(streakDoc.lastActiveDate) : null;
      const totalDone = (streakDoc.totalQuizzesCompleted || 0) + 1;

      if (!last) {
        current = 1;
      } else {
        const today = new Date();
        const diffDays = Math.floor(
          (Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()) -
            Date.UTC(last.getUTCFullYear(), last.getUTCMonth(), last.getUTCDate())) /
            (1000 * 60 * 60 * 24)
        );
        if (diffDays === 1) current += 1;
        else if (diffDays > 1) current = 1;
      }

      streakDoc.currentStreak = current;
      streakDoc.longestStreak = Math.max(current, streakDoc.longestStreak || 0);
      streakDoc.lastActiveDate = todayStr;
      streakDoc.totalQuizzesCompleted = totalDone;
      await streakDoc.save();
    }

    res.status(201).json({
      success: true,
      attempt: { ...attempt.toObject(), id: attempt.clientId },
      streak: streakDoc,
    });
  } catch (err) {
    console.error('[Study API] /daily-quiz/attempt error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/attempts', async (req, res) => {
  try {
    const userId = req.user?.id || 'admin';
    const limit = parseInt(req.query.limit, 10) || 50;

    const attempts = await StudyDailyQuizAttempt.find({
      userId,
      completed: true,
      isDeleted: false,
    }).sort({ completedAt: -1 }).limit(limit).lean();

    res.json(attempts.map((a) => ({ ...a, id: a.clientId || a._id })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/attempts/:id', async (req, res) => {
  try {
    const userId = req.user?.id || 'admin';
    const { id } = req.params;

    const attempt = await StudyDailyQuizAttempt.findOne({
      $or: [{ clientId: id }, { _id: id }],
      userId,
    }).lean();

    if (!attempt) return res.status(404).json({ error: 'Attempt not found.' });

    const quiz = await StudyDailyQuiz.findOne({
      $or: [{ clientId: attempt.dailyQuizId }, { _id: attempt.dailyQuizId }],
    }).lean();

    res.json({
      ...attempt,
      id: attempt.clientId || attempt._id,
      daily_quiz: quiz ? { ...quiz, id: quiz.clientId || quiz._id } : null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= 7. WEAK TOPICS & DRILLS =================

router.get('/weak-questions', async (req, res) => {
  try {
    const userId = req.user?.id || 'admin';
    const { subjectId, tab = 'active', limit = 50 } = req.query;

    const query = { userId, isDeleted: false };
    if (subjectId) query.subjectId = subjectId;
    if (tab === 'mastered') query.mastered = true;
    else if (tab === 'active') query.mastered = false;

    const items = await StudyWeakQuestion.find(query)
      .sort({ timesWrong: -1, lastWrongAt: -1 })
      .limit(parseInt(limit, 10) || 50)
      .lean();

    res.json(items.map((w) => ({
      ...w,
      id: w.clientId || w._id,
      subject_id: w.subjectId,
      times_wrong: w.timesWrong,
      times_correct: w.timesCorrect,
      last_wrong_at: w.lastWrongAt,
      last_seen_at: w.lastSeenAt,
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/weak-questions/drill', async (req, res) => {
  try {
    const userId = req.user?.id || 'admin';
    const { subjectId } = req.body;
    if (!subjectId) return res.status(400).json({ error: 'Subject ID required for drill.' });

    const weak = await StudyWeakQuestion.find({
      userId,
      subjectId,
      mastered: false,
      isDeleted: false,
    }).sort({ timesWrong: -1, lastWrongAt: -1 }).limit(20).lean();

    const questions = weak.map((w) => ({
      question: w.question,
      type: 'mcq',
      options: w.options || [],
      answer: w.answer,
      explanation: w.explanation || 'Previously missed topic.',
    })).filter((q) => q.options.length === 4);

    if (questions.length === 0) {
      return res.status(400).json({ error: 'Not enough valid weak questions to form a drill.' });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const quiz = new StudyDailyQuiz({
      userId,
      clientId: require('crypto').randomUUID(),
      subjectId,
      quizDate: todayStr,
      questions,
      totalQuestions: questions.length,
      difficulty: 'medium',
      source: 'manual',
    });
    await quiz.save();

    res.json({ ...quiz.toObject(), id: quiz.clientId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/weak-questions/:id/master', async (req, res) => {
  try {
    const userId = req.user?.id || 'admin';
    const { id } = req.params;

    const item = await StudyWeakQuestion.findOneAndUpdate(
      { $or: [{ clientId: id }, { _id: id }], userId },
      { $set: { mastered: true, timesCorrect: 99 } },
      { returnDocument: 'after' }
    );
    if (!item) return res.status(404).json({ error: 'Item not found.' });

    res.json({ success: true, item });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/weak-questions/:id', async (req, res) => {
  try {
    const userId = req.user?.id || 'admin';
    const { id } = req.params;

    await StudyWeakQuestion.findOneAndUpdate(
      { $or: [{ clientId: id }, { _id: id }], userId },
      { $set: { isDeleted: true, deletedAt: new Date() } }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= 8. STREAK & STATS =================

router.get('/streak', async (req, res) => {
  try {
    const userId = req.user?.id || 'admin';
    const streak = await StudyUserStreak.findOne({ userId, isDeleted: false }).lean();
    if (!streak) {
      return res.json({
        current_streak: 0,
        longest_streak: 0,
        last_active_date: null,
        total_quizzes_completed: 0,
      });
    }
    res.json({
      current_streak: streak.currentStreak,
      longest_streak: streak.longestStreak,
      last_active_date: streak.lastActiveDate,
      total_quizzes_completed: streak.totalQuizzesCompleted,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/revision-report', async (req, res) => {
  try {
    const userId = req.user?.id || 'admin';
    const [subjects, attempts, weakQuestions] = await Promise.all([
      StudySubject.find({ userId, isDeleted: false }).lean(),
      StudyDailyQuizAttempt.find({ userId, completed: true, isDeleted: false }).lean(),
      StudyWeakQuestion.find({ userId, isDeleted: false }).lean(),
    ]);

    const statsMap = new Map();
    for (const s of subjects) {
      statsMap.set(s.clientId || String(s._id), {
        subjectId: s.clientId || s._id,
        subjectName: s.name,
        attempts: 0,
        avgPct: 0,
        lastPct: null,
        activeWeak: 0,
        mastered: 0,
        totalWrongs: 0,
      });
    }

    const sumBySubject = new Map();
    for (const a of attempts) {
      const st = statsMap.get(a.subjectId);
      if (!st) continue;
      st.attempts += 1;
      sumBySubject.set(a.subjectId, (sumBySubject.get(a.subjectId) || 0) + Number(a.percentage || 0));
      if (st.lastPct === null) st.lastPct = Number(a.percentage || 0);
    }

    sumBySubject.forEach((totalPct, subjId) => {
      const st = statsMap.get(subjId);
      if (st && st.attempts > 0) st.avgPct = totalPct / st.attempts;
    });

    for (const w of weakQuestions) {
      const st = statsMap.get(w.subjectId);
      if (!st) continue;
      if (w.mastered) st.mastered += 1;
      else st.activeWeak += 1;
      st.totalWrongs += w.timesWrong || 0;
    }

    const totalAttempts = attempts.length;
    const totalCorrect = attempts.reduce((acc, a) => acc + (a.score || 0), 0);
    const totalQ = attempts.reduce((acc, a) => acc + (a.totalQuestions || 0), 0);
    const accuracy = totalQ ? (totalCorrect / totalQ) * 100 : 0;
    const activeWeak = weakQuestions.filter((w) => !w.mastered).length;
    const mastered = weakQuestions.filter((w) => w.mastered).length;

    res.json({
      totals: { totalAttempts, accuracy, activeWeak, mastered },
      subjectStats: Array.from(statsMap.values()).filter((s) => s.attempts > 0 || s.activeWeak > 0),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= 9. DAILY QUIZ CONFIG =================

router.get('/quiz-config', async (req, res) => {
  try {
    const userId = req.user?.id || 'admin';
    let config = await StudyDailyQuizConfig.findOne({ userId, isDeleted: false }).lean();
    if (!config) {
      config = {
        enabled: true,
        scheduleTime: '12:00:00',
        timezone: 'Asia/Kolkata',
        difficulty: 'mixed',
        includePyq: true,
        numQuestions: 10,
      };
    }
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/quiz-config', async (req, res) => {
  try {
    const userId = req.user?.id || 'admin';
    const patch = req.body;

    const config = await StudyDailyQuizConfig.findOneAndUpdate(
      { userId },
      { $set: patch },
      { upsert: true, returnDocument: 'after' }
    );
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

