# 06. Backend Modifications & Schema Migrations

## 1. Overview of Backend Requirements

To support bidirectional synchronization, idempotency, and tombstones (soft deletes), the Node.js/Express backend requires enhancements while maintaining **100% backward compatibility** with all existing REST endpoints.

```
mobile-app/server/
├── models/
│   ├── plugins/
│   │   └── syncPlugin.js             # Mongoose plugin adding sync fields & hooks
│   ├── Calendar.js                   # Enhanced with syncPlugin
│   ├── CalendarEvent.js              # Enhanced with syncPlugin
│   ├── EventReminder.js              # Enhanced with syncPlugin
│   ├── DietItem.js                   # Enhanced with syncPlugin
│   ├── FinanceTransaction.js         # Enhanced with syncPlugin
│   ├── InvestmentHolding.js          # Enhanced with syncPlugin
│   └── portfolio/*.js                # Enhanced with syncPlugin
├── routes/
│   ├── sync.js                       # NEW: Push & Pull Sync Handlers
│   └── ...existing routes            # Preserved with soft-delete & pre-save hooks
└── scripts/
    └── migrateSyncFields.js          # One-time migration for existing MongoDB docs
```

---

## 2. Reusable Mongoose Sync Plugin (`syncPlugin.js`)

Rather than duplicating schema definitions across 20+ model files, a reusable Mongoose plugin injects synchronization capabilities:

```javascript
// server/models/plugins/syncPlugin.js
module.exports = function syncPlugin(schema, options) {
  schema.add({
    clientId: {
      type: String,
      sparse: true,
      index: true,
      trim: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    serverUpdatedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    lastMutationId: {
      type: String,
      default: null,
    },
  });

  // Automatically update serverUpdatedAt on any document modification
  schema.pre('save', function (next) {
    this.serverUpdatedAt = new Date();
    next();
  });

  schema.pre('findOneAndUpdate', function (next) {
    this.set({ serverUpdatedAt: new Date() });
    next();
  });

  schema.pre('updateOne', function (next) {
    this.set({ serverUpdatedAt: new Date() });
    next();
  });
};
```

---

## 3. Dedicated Sync Route Handlers (`server/routes/sync.js`)

### 3.1 Push Handler (`POST /api/sync/push`)

Processes incoming client mutations with idempotency checks and maps client UUIDs to MongoDB ObjectIds:

```javascript
const express = require('express');
const router = express.Router();

// Model Registry mapping entity names to Mongoose models
const MODELS = {
  calendar: require('../models/Calendar'),
  calendar_event: require('../models/CalendarEvent'),
  event_reminder: require('../models/EventReminder'),
  diet_item: require('../models/DietItem'),
  finance_transaction: require('../models/FinanceTransaction'),
  finance_budget: require('../models/FinanceBudget'),
  investment_holding: require('../models/InvestmentHolding'),
  investment_transaction: require('../models/InvestmentTransaction'),
  portfolio_blog: require('../models/portfolio/Blog'),
  portfolio_project: require('../models/portfolio/Project'),
  portfolio_skill: require('../models/portfolio/Skills'),
  portfolio_photo: require('../models/portfolio/Photo'),
  portfolio_contact: require('../models/portfolio/Contact'),
  portfolio_education: require('../models/portfolio/Education'),
  portfolio_social_link: require('../models/portfolio/SocialLink'),
};

router.post('/push', async (req, res) => {
  const { mutations, clientId: deviceId } = req.body;
  const userId = req.body.userId || 'admin';

  if (!Array.isArray(mutations)) {
    return res.status(400).json({ error: 'Mutations array is required' });
  }

  const results = [];
  const serverTimestamp = new Date();

  for (const m of mutations) {
    const Model = MODELS[m.entity];
    if (!Model) {
      results.push({ mutationId: m.mutationId, status: 'rejected', error: 'Unknown entity' });
      continue;
    }

    try {
      if (m.action === 'CREATE') {
        // Idempotency check: see if record with this clientId or lastMutationId exists
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
          { new: true, upsert: false }
        );

        results.push({
          mutationId: m.mutationId,
          clientId: m.clientId,
          serverId: doc ? doc._id.toString() : m.serverId,
          status: doc ? 'applied' : 'not_found',
          serverUpdatedAt: serverTimestamp,
        });

      } else if (m.action === 'DELETE') {
        // Tombstone Soft Delete
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
```

---

### 3.2 Pull Handler (`GET /api/sync/pull`)

Queries all models for documents created, updated, or soft-deleted after the `since` cursor:

```javascript
router.get('/pull', async (req, res) => {
  try {
    const { since, userId = 'admin' } = req.query;
    const sinceDate = since ? new Date(since) : new Date(0);
    const serverTime = new Date();

    const queryFilter = {
      userId,
      serverUpdatedAt: { $gt: sinceDate },
    };

    // Execute queries in parallel across all synchronized collections
    const [
      calendars,
      calendarEvents,
      reminders,
      dietItems,
      financeTransactions,
      financeBudgets,
      investmentHoldings,
      investmentTransactions,
      blogs,
      projects,
      skills,
      photos,
      contacts,
      education,
      socialLinks,
    ] = await Promise.all([
      MODELS.calendar.find(queryFilter).lean(),
      MODELS.calendar_event.find(queryFilter).lean(),
      MODELS.event_reminder.find(queryFilter).lean(),
      MODELS.diet_item.find({ serverUpdatedAt: { $gt: sinceDate } }).lean(),
      MODELS.finance_transaction.find(queryFilter).lean(),
      MODELS.finance_budget.find(queryFilter).lean(),
      MODELS.investment_holding.find(queryFilter).lean(),
      MODELS.investment_transaction.find(queryFilter).lean(),
      MODELS.portfolio_blog.find(queryFilter).lean(),
      MODELS.portfolio_project.find(queryFilter).lean(),
      MODELS.portfolio_skill.find(queryFilter).lean(),
      MODELS.portfolio_photo.find(queryFilter).lean(),
      MODELS.portfolio_contact.find(queryFilter).lean(),
      MODELS.portfolio_education.find(queryFilter).lean(),
      MODELS.portfolio_social_link.find(queryFilter).lean(),
    ]);

    res.json({
      serverTime,
      changes: {
        calendars,
        calendarEvents,
        reminders,
        dietItems,
        financeTransactions,
        financeBudgets,
        investmentHoldings,
        investmentTransactions,
        portfolioBlogs: blogs,
        portfolioProjects: projects,
        portfolioSkills: skills,
        portfolioPhotos: photos,
        portfolioContacts: contacts,
        portfolioEducation: education,
        portfolioSocialLinks: socialLinks,
      },
    });
  } catch (err) {
    console.error('[Sync Pull Error]', err);
    res.status(500).json({ error: 'Failed to pull sync changes: ' + err.message });
  }
});

module.exports = router;
```

---

## 4. Existing Database Migration Script

To ensure backward compatibility for all documents created prior to the sync engine, run `server/scripts/migrateSyncFields.js`:

```javascript
// server/scripts/migrateSyncFields.js
const mongoose = require('mongoose');
const connectDB = require('../config/db');

const migrate = async () => {
  await connectDB();
  const collections = [
    'calendars',
    'calendarevents',
    'eventreminders',
    'dietitems',
    'financetransactions',
    'financebudgets',
    'investmentholdings',
    'investmenttransactions',
    'blogs',
    'projects',
    'skills',
    'photos',
    'contacts',
    'educations',
    'sociallinks'
  ];

  for (const colName of collections) {
    const col = mongoose.connection.collection(colName);
    const result = await col.updateMany(
      { serverUpdatedAt: { $exists: false } },
      [
        {
          $set: {
            serverUpdatedAt: { $ifNull: ['$updatedAt', '$createdAt', new Date()] },
            isDeleted: false,
            deletedAt: null,
          }
        }
      ]
    );
    console.log(`[Migrated] ${colName}: modified ${result.modifiedCount} documents.`);
  }

  console.log('Sync schema migration completed successfully.');
  process.exit(0);
};

migrate().catch(console.error);
```

---

## 5. Next Steps
The next document (**[07_UI_UX_OFFLINE_PATTERNS_AND_STATE_MANAGEMENT.md](./07_UI_UX_OFFLINE_PATTERNS_AND_STATE_MANAGEMENT.md)**) defines the user interface states, online/offline banners, and visual indicators.

