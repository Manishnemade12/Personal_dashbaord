const express = require('express');
const router = express.Router();

// Model Registry mapping entity names to Mongoose models
const MODELS = {
  calendar: require('../models/Calendar'),
  calendar_event: require('../models/CalendarEvent'),
  diet_item: require('../models/DietItem'),
  finance_transaction: require('../models/FinanceTransaction'),
  finance_budget: require('../models/FinanceBudget'),
  investment_holding: require('../models/InvestmentHolding'),
  investment_transaction: require('../models/InvestmentTransaction'),
  portfolio_blog: require('../models/portfolio/Blog'),
  portfolio_project: require('../models/portfolio/Project'),
  portfolio_skill: require('../models/portfolio/Skills'),
  portfolio_photo: require('../models/portfolio/Photo'),
  portfolio_education: require('../models/portfolio/Education'),
  portfolio_social_link: require('../models/portfolio/SocialLink'),
  note: require('../models/Note'),
  note_category: require('../models/NoteCategory'),
  study_subject: require('../models/StudySubject'),
  study_chunk: require('../models/StudyChunk'),
  study_quiz_question: require('../models/StudyQuizQuestion'),
  study_daily_quiz: require('../models/StudyDailyQuiz'),
  study_daily_quiz_attempt: require('../models/StudyDailyQuizAttempt'),
  study_daily_quiz_config: require('../models/StudyDailyQuizConfig'),
  study_weak_question: require('../models/StudyWeakQuestion'),
  study_user_streak: require('../models/StudyUserStreak'),
};

/**
 * POST /api/sync/push
 * Batch mutation receiver with idempotency protection
 */
router.post('/push', async (req, res) => {
  const { mutations, clientId: deviceId } = req.body;
  const userId = req.body.userId || 'admin';

  if (!Array.isArray(mutations)) {
    return res.status(400).json({ error: 'Mutations array is required' });
  }

  const results = [];
  const serverTimestamp = new Date();

  for (const m of mutations) {
    const Model = Object.prototype.hasOwnProperty.call(MODELS, m.entity) ? MODELS[m.entity] : null;
    if (!Model) {
      results.push({ mutationId: m.mutationId, status: 'rejected', error: `Unknown entity: ${m.entity}` });
      continue;
    }

    try {
      if (m.entity === 'investment_holding') {
        m.payload = {
          ...m.payload,
          symbolOrCode: m.payload.symbolOrCode || m.payload.symbol || m.payload.symbol_or_code,
          instrumentName: m.payload.instrumentName || m.payload.name || m.payload.instrument_name,
          averageBuyPrice:
            m.payload.averageBuyPrice ??
            m.payload.avgBuyPrice ??
            m.payload.avg_buy_price ??
            m.payload.buyPrice ??
            0,
          latestPrice:
            m.payload.latestPrice ??
            m.payload.lastKnownPrice ??
            m.payload.last_known_price ??
            m.payload.currentPrice ??
            0,
          assetClass: m.payload.assetClass || m.payload.asset_class || 'Equity',
        };
      } else if (m.entity === 'investment_transaction') {
        m.payload = {
          ...m.payload,
          holdingId: m.payload.holdingId || m.payload.holding_id || m.payload.holdingClientId,
          units: m.payload.units ?? m.payload.quantity ?? 0,
          pricePerUnit: m.payload.pricePerUnit ?? m.payload.price ?? 0,
          totalAmount:
            m.payload.totalAmount ??
            Number(m.payload.units ?? m.payload.quantity ?? 0) * Number(m.payload.pricePerUnit ?? m.payload.price ?? 0),
        };
        if (m.payload.holdingId && !require('mongoose').Types.ObjectId.isValid(m.payload.holdingId)) {
          const holding = await MODELS.investment_holding.findOne({ clientId: m.payload.holdingId, userId });
          if (holding) m.payload.holdingId = holding._id;
        }
      }

      if (m.entity === 'calendar_event' && m.action === 'CREATE') {
        const mongoose = require('mongoose');
        m.payload = m.payload || {};
        if (!m.payload.calendarId || !mongoose.Types.ObjectId.isValid(m.payload.calendarId)) {
          let defaultCal = await MODELS.calendar.findOne({ userId, isDefault: true, isDeleted: false });
          if (!defaultCal) {
            defaultCal = await MODELS.calendar.findOne({ userId, isDeleted: false });
          }
          if (!defaultCal) {
            defaultCal = new MODELS.calendar({ name: 'General', userId, isDefault: true, color: '#7e37d8' });
            await defaultCal.save();
          }
          m.payload.calendarId = defaultCal._id;
        }
      }

      if (m.action === 'CREATE') {
        // Idempotency check: see if a document with this clientId already exists
        let doc = await Model.findOne({ clientId: m.clientId });
        if (!doc) {
          doc = new Model({
            ...m.payload,
            clientId: m.clientId,
            userId,
            isDeleted: false,
            lastMutationId: m.mutationId,
            serverUpdatedAt: serverTimestamp,
          });
          await doc.save();
        }
        results.push({
          mutationId: m.mutationId,
          clientId: m.clientId,
          serverId: doc._id.toString(),
          status: 'applied',
          serverUpdatedAt: doc.serverUpdatedAt,
        });

      } else if (m.action === 'UPDATE') {
        const query = m.serverId ? { _id: m.serverId } : { clientId: m.clientId };
        const doc = await Model.findOneAndUpdate(
          query,
          {
            $set: {
              ...m.payload,
              lastMutationId: m.mutationId,
              serverUpdatedAt: serverTimestamp,
            },
          },
          { returnDocument: 'after', upsert: false }
        );

        results.push({
          mutationId: m.mutationId,
          clientId: m.clientId,
          serverId: doc ? doc._id.toString() : m.serverId,
          status: doc ? 'applied' : 'not_found',
          serverUpdatedAt: serverTimestamp,
        });

      } else if (m.action === 'DELETE') {
        // Soft delete / Tombstone
        const query = m.serverId ? { _id: m.serverId } : { clientId: m.clientId };
        await Model.findOneAndUpdate(
          query,
          {
            $set: {
              isDeleted: true,
              deletedAt: serverTimestamp,
              lastMutationId: m.mutationId,
              serverUpdatedAt: serverTimestamp,
            },
          }
        );

        results.push({
          mutationId: m.mutationId,
          clientId: m.clientId,
          status: 'applied',
          serverUpdatedAt: serverTimestamp,
        });
      }
    } catch (err) {
      console.error(`[Sync Push Error] ${m.entity} ${m.mutationId}:`, err.message);
      results.push({
        mutationId: m.mutationId,
        clientId: m.clientId,
        status: 'error',
        error: err.message,
      });
    }
  }

  res.json({ success: true, results, serverTime: serverTimestamp });
});

/**
 * GET /api/sync/pull
 * Incremental delta synchronization endpoint
 */
router.get('/pull', async (req, res) => {
  try {
    const { since, userId = 'admin' } = req.query;
    const sinceDate = since ? new Date(since) : new Date(0);
    const serverTime = new Date();

    const queryFilter = {
      serverUpdatedAt: { $gt: sinceDate },
    };

    // Parallel fetch across models
    const [
      calendars,
      calendarEvents,
      dietItems,
      financeTransactions,
      financeBudgets,
      investmentHoldings,
      investmentTransactions,
      blogs,
      projects,
      skills,
      photos,
      education,
      socialLinks,
      notes,
      noteCategories,
      studySubjects,
      studyChunks,
      studyQuizQuestions,
      studyDailyQuizzes,
      studyDailyQuizAttempts,
      studyDailyQuizConfigs,
      studyWeakQuestions,
      studyUserStreaks,
    ] = await Promise.all([
      MODELS.calendar.find(queryFilter).lean(),
      MODELS.calendar_event.find(queryFilter).lean(),
      MODELS.diet_item.find(queryFilter).lean(),
      MODELS.finance_transaction.find(queryFilter).lean(),
      MODELS.finance_budget.find(queryFilter).lean(),
      MODELS.investment_holding.find(queryFilter).lean(),
      MODELS.investment_transaction.find(queryFilter).lean(),
      MODELS.portfolio_blog.find(queryFilter).lean(),
      MODELS.portfolio_project.find(queryFilter).lean(),
      MODELS.portfolio_skill.find(queryFilter).lean(),
      MODELS.portfolio_photo.find(queryFilter).lean(),
      MODELS.portfolio_education.find(queryFilter).lean(),
      MODELS.portfolio_social_link.find(queryFilter).lean(),
      MODELS.note.find(queryFilter).lean(),
      MODELS.note_category.find(queryFilter).lean(),
      MODELS.study_subject.find(queryFilter).lean(),
      MODELS.study_chunk.find(queryFilter).lean(),
      MODELS.study_quiz_question.find(queryFilter).lean(),
      MODELS.study_daily_quiz.find(queryFilter).lean(),
      MODELS.study_daily_quiz_attempt.find(queryFilter).lean(),
      MODELS.study_daily_quiz_config.find(queryFilter).lean(),
      MODELS.study_weak_question.find(queryFilter).lean(),
      MODELS.study_user_streak.find(queryFilter).lean(),
    ]);

    res.json({
      serverTime,
      changes: {
        calendars,
        calendarEvents,
        dietItems,
        financeTransactions,
        financeBudgets,
        investmentHoldings,
        investmentTransactions,
        portfolioBlogs: blogs,
        portfolioProjects: projects,
        portfolioSkills: skills,
        portfolioPhotos: photos,
        portfolioEducation: education,
        portfolioSocialLinks: socialLinks,
        notes,
        noteCategories,
        studySubjects,
        studyChunks,
        studyQuizQuestions,
        studyDailyQuizzes,
        studyDailyQuizAttempts,
        studyDailyQuizConfigs,
        studyWeakQuestions,
        studyUserStreaks,
      },
    });
  } catch (err) {
    console.error('[Sync Pull Error]', err);
    res.status(500).json({ error: 'Failed to pull sync changes: ' + err.message });
  }
});

module.exports = router;
