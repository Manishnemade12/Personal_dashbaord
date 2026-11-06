# Database and Offline Schema Specification: Smart Study Flow

## 1. Architecture Overview

To provide 100% offline capability alongside real-time multi-device cloud synchronization, the Smart Study Flow data architecture mirrors the proven dual-tier model established in the Portfolio-Backend for Notes, Calendar, and Diet:

1. **Local Tier (Client - React Native / Expo)**:
   - Backed by **SQLite** (`expo-sqlite` on native / web-shim).
   - Instant reads and writes with zero network latency.
   - Every mutating action generates an entry in `sync_outbox`.
2. **Remote Tier (Server - Node.js Express & MongoDB Atlas)**:
   - Backed by **Mongoose / MongoDB Atlas**.
   - Handles multi-device backup, delta synchronization, and AI background processing.
3. **ID Bridging Strategy**:
   - Every record is assigned a client-generated UUID `id` upon creation.
   - The server accepts the client's `id` as an indexed unique field, mapping its own MongoDB `_id` transparently. This eliminates ID rewriting during offline creation.

---

## 2. SQLite Local Schemas (`schema.js`)

The following tables will be appended to `mobile-app/src/db/schema.js`:

### 2.1. `study_subjects`
Stores subject taxonomy (e.g. History, Geography, Polity, Science, Reasoning).

```sql
CREATE TABLE IF NOT EXISTS study_subjects (
  id TEXT PRIMARY KEY,
  server_id TEXT,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  order_index INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  sync_status TEXT DEFAULT 'synced',
  is_deleted INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_study_subjects_updated ON study_subjects(updated_at);
```

### 2.2. `study_chunks`
Stores study units, parent chapters, and leaf sub-chunks.

```sql
CREATE TABLE IF NOT EXISTS study_chunks (
  id TEXT PRIMARY KEY,
  server_id TEXT,
  subject_id TEXT NOT NULL,
  parent_chunk_id TEXT,
  title TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  summary TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  key_points TEXT DEFAULT '[]', -- JSON array of strings: ["point 1", "point 2"]
  terms TEXT DEFAULT '[]',      -- JSON array of objects: [{"term": "...", "meaning": "..."}]
  revised INTEGER DEFAULT 0,    -- 0 = false, 1 = true
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  sync_status TEXT DEFAULT 'synced',
  is_deleted INTEGER DEFAULT 0,
  FOREIGN KEY (subject_id) REFERENCES study_subjects(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_study_chunks_subject ON study_chunks(subject_id);
CREATE INDEX IF NOT EXISTS idx_study_chunks_parent ON study_chunks(parent_chunk_id);
CREATE INDEX IF NOT EXISTS idx_study_chunks_updated ON study_chunks(updated_at);
```

### 2.3. `study_quiz_questions`
Stores chunk-specific quiz questions (MCQs, true/false, one-liners).

```sql
CREATE TABLE IF NOT EXISTS study_quiz_questions (
  id TEXT PRIMARY KEY,
  server_id TEXT,
  chunk_id TEXT NOT NULL,
  question TEXT NOT NULL,
  type TEXT DEFAULT 'mcq',       -- 'mcq', 'true_false', 'one_line'
  options TEXT DEFAULT '[]',     -- JSON array: ["opt A", "opt B", "opt C", "opt D"]
  answer TEXT NOT NULL,
  explanation TEXT DEFAULT '',
  order_index INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  sync_status TEXT DEFAULT 'synced',
  is_deleted INTEGER DEFAULT 0,
  FOREIGN KEY (chunk_id) REFERENCES study_chunks(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_study_quiz_chunk ON study_quiz_questions(chunk_id);
```

### 2.4. `study_daily_quizzes`
Stores generated daily and drill quizzes.

```sql
CREATE TABLE IF NOT EXISTS study_daily_quizzes (
  id TEXT PRIMARY KEY,
  server_id TEXT,
  subject_id TEXT NOT NULL,
  quiz_date TEXT NOT NULL,       -- 'YYYY-MM-DD'
  questions TEXT NOT NULL,       -- JSON array of questions: [{"question": "...", "options": [...], "answer": "...", "explanation": "..."}]
  total_questions INTEGER DEFAULT 0,
  difficulty TEXT DEFAULT 'medium', -- 'easy', 'medium', 'hard', 'mixed'
  source TEXT DEFAULT 'ai',         -- 'ai', 'pyq', 'manual'
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  sync_status TEXT DEFAULT 'synced',
  is_deleted INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_study_daily_quiz_date ON study_daily_quizzes(quiz_date);
CREATE INDEX IF NOT EXISTS idx_study_daily_quiz_subject ON study_daily_quizzes(subject_id);
```

### 2.5. `study_daily_quiz_attempts`
Stores user attempts and grading data.

```sql
CREATE TABLE IF NOT EXISTS study_daily_quiz_attempts (
  id TEXT PRIMARY KEY,
  server_id TEXT,
  daily_quiz_id TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  quiz_date TEXT NOT NULL,
  answers TEXT NOT NULL,         -- JSON array: [{"questionIdx": 0, "selectedAnswer": "A", "isCorrect": true}]
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  percentage REAL NOT NULL,
  time_taken INTEGER DEFAULT 0,  -- seconds
  completed INTEGER DEFAULT 1,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  sync_status TEXT DEFAULT 'synced',
  is_deleted INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_study_attempts_quiz ON study_daily_quiz_attempts(daily_quiz_id);
CREATE INDEX IF NOT EXISTS idx_study_attempts_date ON study_daily_quiz_attempts(quiz_date);
```

### 2.6. `study_daily_quiz_config`
User preferences for automated quizzes.

```sql
CREATE TABLE IF NOT EXISTS study_daily_quiz_config (
  id TEXT PRIMARY KEY,
  server_id TEXT,
  enabled INTEGER DEFAULT 1,
  schedule_time TEXT DEFAULT '12:00:00',
  timezone TEXT DEFAULT 'Asia/Kolkata',
  difficulty TEXT DEFAULT 'mixed',
  include_pyq INTEGER DEFAULT 1,
  num_questions INTEGER DEFAULT 10,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  sync_status TEXT DEFAULT 'synced',
  is_deleted INTEGER DEFAULT 0
);
```

### 2.7. `study_weak_questions`
Tracks mistakes and mastery progression.

```sql
CREATE TABLE IF NOT EXISTS study_weak_questions (
  id TEXT PRIMARY KEY,
  server_id TEXT,
  subject_id TEXT NOT NULL,
  question_hash TEXT NOT NULL,
  question TEXT NOT NULL,
  options TEXT DEFAULT '[]',     -- JSON array
  answer TEXT NOT NULL,
  explanation TEXT DEFAULT '',
  times_wrong INTEGER DEFAULT 1,
  times_correct INTEGER DEFAULT 0,
  mastered INTEGER DEFAULT 0,    -- 1 if times_correct >= 2 or manually marked
  last_wrong_at TEXT,
  last_seen_at TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  sync_status TEXT DEFAULT 'synced',
  is_deleted INTEGER DEFAULT 0,
  UNIQUE(subject_id, question_hash)
);
CREATE INDEX IF NOT EXISTS idx_study_weak_subject ON study_weak_questions(subject_id);
CREATE INDEX IF NOT EXISTS idx_study_weak_mastered ON study_weak_questions(mastered);
```

### 2.8. `study_user_streaks`
Tracks learning consistency and streaks.

```sql
CREATE TABLE IF NOT EXISTS study_user_streaks (
  id TEXT PRIMARY KEY,
  server_id TEXT,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_active_date TEXT,         -- 'YYYY-MM-DD'
  total_quizzes_completed INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  sync_status TEXT DEFAULT 'synced',
  is_deleted INTEGER DEFAULT 0
);
```

---

## 3. Server Mongoose Schemas (`mobile-app/server/models/`)

### 3.1. `StudySubject.js`
```javascript
const mongoose = require('mongoose');

const studySubjectSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  clientId: { type: String, required: true, index: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  orderIndex: { type: Number, default: 0 },
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

studySubjectSchema.index({ userId: 1, name: 1 });
module.exports = mongoose.model('StudySubject', studySubjectSchema);
```

### 3.2. `StudyChunk.js`
```javascript
const mongoose = require('mongoose');

const termSchema = new mongoose.Schema({
  term: { type: String, required: true },
  meaning: { type: String, required: true }
}, { _id: false });

const studyChunkSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  clientId: { type: String, required: true, index: true },
  subjectId: { type: String, required: true, index: true },
  parentChunkId: { type: String, default: null, index: true },
  title: { type: String, required: true, trim: true },
  orderIndex: { type: Number, default: 0 },
  summary: { type: String, default: '' },
  notes: { type: String, default: '' },
  keyPoints: [{ type: String }],
  terms: [termSchema],
  revised: { type: Boolean, default: false },
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('StudyChunk', studyChunkSchema);
```

### 3.3. `StudyQuizQuestion.js`
```javascript
const mongoose = require('mongoose');

const studyQuizQuestionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  clientId: { type: String, required: true, index: true },
  chunkId: { type: String, required: true, index: true },
  question: { type: String, required: true },
  type: { type: String, enum: ['mcq', 'true_false', 'one_line'], default: 'mcq' },
  options: [{ type: String }],
  answer: { type: String, required: true },
  explanation: { type: String, default: '' },
  orderIndex: { type: Number, default: 0 },
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('StudyQuizQuestion', studyQuizQuestionSchema);
```

### 3.4. `StudyDailyQuiz.js`
```javascript
const mongoose = require('mongoose');

const dailyQuestionItemSchema = new mongoose.Schema({
  question: { type: String, required: true },
  type: { type: String, enum: ['mcq'], default: 'mcq' },
  options: [{ type: String }],
  answer: { type: String, required: true },
  explanation: { type: String, default: '' }
}, { _id: false });

const studyDailyQuizSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  clientId: { type: String, required: true, index: true },
  subjectId: { type: String, required: true, index: true },
  quizDate: { type: String, required: true, index: true }, // 'YYYY-MM-DD'
  questions: [dailyQuestionItemSchema],
  totalQuestions: { type: Number, required: true },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard', 'mixed'], default: 'medium' },
  source: { type: String, enum: ['ai', 'pyq', 'manual'], default: 'ai' },
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

studyDailyQuizSchema.index({ userId: 1, subjectId: 1, quizDate: 1 });
module.exports = mongoose.model('StudyDailyQuiz', studyDailyQuizSchema);
```

### 3.5. `StudyDailyQuizAttempt.js`
```javascript
const mongoose = require('mongoose');

const answerItemSchema = new mongoose.Schema({
  questionIdx: { type: Number, required: true },
  selectedAnswer: { type: String, default: '' },
  isCorrect: { type: Boolean, default: false }
}, { _id: false });

const studyDailyQuizAttemptSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  clientId: { type: String, required: true, index: true },
  dailyQuizId: { type: String, required: true, index: true },
  subjectId: { type: String, required: true, index: true },
  quizDate: { type: String, required: true, index: true },
  answers: [answerItemSchema],
  score: { type: Number, required: true },
  totalQuestions: { type: Number, required: true },
  percentage: { type: Number, required: true },
  timeTaken: { type: Number, default: 0 },
  completed: { type: Boolean, default: true },
  startedAt: { type: Date, required: true },
  completedAt: { type: Date },
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('StudyDailyQuizAttempt', studyDailyQuizAttemptSchema);
```

### 3.6. `StudyWeakQuestion.js`
```javascript
const mongoose = require('mongoose');

const studyWeakQuestionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  clientId: { type: String, required: true, index: true },
  subjectId: { type: String, required: true, index: true },
  questionHash: { type: String, required: true, index: true },
  question: { type: String, required: true },
  options: [{ type: String }],
  answer: { type: String, required: true },
  explanation: { type: String, default: '' },
  timesWrong: { type: Number, default: 1 },
  timesCorrect: { type: Number, default: 0 },
  mastered: { type: Boolean, default: false, index: true },
  lastWrongAt: { type: Date, default: Date.now },
  lastSeenAt: { type: Date, default: Date.now },
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

studyWeakQuestionSchema.index({ userId: 1, subjectId: 1, questionHash: 1 }, { unique: true });
module.exports = mongoose.model('StudyWeakQuestion', studyWeakQuestionSchema);
```

### 3.7. `StudyUserStreak.js`
```javascript
const mongoose = require('mongoose');

const studyUserStreakSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  clientId: { type: String, required: true },
  currentStreak: { type: Number, default: 0 },
  longestStreak: { type: Number, default: 0 },
  lastActiveDate: { type: String }, // 'YYYY-MM-DD'
  totalQuizzesCompleted: { type: Number, default: 0 },
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('StudyUserStreak', studyUserStreakSchema);
```

### 3.8. `StudyDailyQuizConfig.js`
```javascript
const mongoose = require('mongoose');

const studyDailyQuizConfigSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  clientId: { type: String, required: true },
  enabled: { type: Boolean, default: true },
  scheduleTime: { type: String, default: '12:00:00' },
  timezone: { type: String, default: 'Asia/Kolkata' },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard', 'mixed'], default: 'mixed' },
  includePyq: { type: Boolean, default: true },
  numQuestions: { type: Number, default: 10 },
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('StudyDailyQuizConfig', studyDailyQuizConfigSchema);
```

