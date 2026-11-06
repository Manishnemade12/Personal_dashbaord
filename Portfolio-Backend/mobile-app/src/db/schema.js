/**
 * SQLite Relational Database DDL Schema for Portfolio Admin Offline-First Architecture.
 */

export const SCHEMA_VERSION = 1;

export const CREATE_TABLES_SQL = [
  // Versioning and migrations
  `CREATE TABLE IF NOT EXISTS _schema_migrations (
    version INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL
  );`,

  // Sync state & cursor tokens
  `CREATE TABLE IF NOT EXISTS sync_metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,

  // Transactional Outbox Queue for pending mutations
  `CREATE TABLE IF NOT EXISTS sync_outbox (
    mutation_id TEXT PRIMARY KEY,
    entity_name TEXT NOT NULL,
    action TEXT NOT NULL,
    client_id TEXT NOT NULL,
    payload TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    retry_count INTEGER DEFAULT 0,
    last_error TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,
  `CREATE INDEX IF NOT EXISTS idx_outbox_status ON sync_outbox(status, created_at);`,

  // Calendars
  `CREATE TABLE IF NOT EXISTS calendars (
    client_id TEXT PRIMARY KEY,
    server_id TEXT UNIQUE,
    user_id TEXT NOT NULL DEFAULT 'admin',
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#7e37d8',
    is_default INTEGER DEFAULT 0,
    is_visible INTEGER DEFAULT 1,
    is_archived INTEGER DEFAULT 0,
    sync_status TEXT DEFAULT 'SYNCED',
    is_deleted INTEGER DEFAULT 0,
    deleted_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,

  // Calendar Events
  `CREATE TABLE IF NOT EXISTS calendar_events (
    client_id TEXT PRIMARY KEY,
    server_id TEXT UNIQUE,
    calendar_client_id TEXT,
    calendar_server_id TEXT,
    user_id TEXT NOT NULL DEFAULT 'admin',
    title TEXT NOT NULL,
    description TEXT,
    start_at TEXT NOT NULL,
    end_at TEXT NOT NULL,
    is_all_day INTEGER DEFAULT 0,
    color TEXT,
    location TEXT,
    priority TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'scheduled',
    recurrence_rule TEXT,
    reminders_json TEXT,
    sync_status TEXT DEFAULT 'SYNCED',
    is_deleted INTEGER DEFAULT 0,
    deleted_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,
  `CREATE INDEX IF NOT EXISTS idx_events_start ON calendar_events(start_at, is_deleted);`,
  `CREATE INDEX IF NOT EXISTS idx_events_sync ON calendar_events(sync_status, is_deleted);`,

  // Local Event Reminders & Alarms (Offline trigger queue)
  `CREATE TABLE IF NOT EXISTS event_reminders (
    client_id TEXT PRIMARY KEY,
    server_id TEXT UNIQUE,
    event_client_id TEXT NOT NULL,
    offset_minutes INTEGER NOT NULL,
    reminder_type TEXT DEFAULT 'notification',
    is_enabled INTEGER DEFAULT 1,
    scheduled_trigger_time TEXT NOT NULL,
    native_notification_id TEXT,
    is_delivered INTEGER DEFAULT 0,
    delivered_at TEXT,
    is_deleted INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,
  `CREATE INDEX IF NOT EXISTS idx_reminders_trigger ON event_reminders(scheduled_trigger_time, is_delivered);`,

  // Diet Items / Library
  `CREATE TABLE IF NOT EXISTS diet_items (
    client_id TEXT PRIMARY KEY,
    server_id TEXT UNIQUE,
    name TEXT NOT NULL,
    calories REAL NOT NULL DEFAULT 0,
    protein REAL DEFAULT 0,
    carbs REAL DEFAULT 0,
    fats REAL DEFAULT 0,
    serving_size TEXT,
    category TEXT DEFAULT 'General',
    ingredients TEXT,
    is_deleted INTEGER DEFAULT 0,
    sync_status TEXT DEFAULT 'SYNCED',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,

  // Scheduled Meals & Daily Diet Logs
  `CREATE TABLE IF NOT EXISTS diet_meal_logs (
    client_id TEXT PRIMARY KEY,
    server_id TEXT UNIQUE,
    calendar_event_client_id TEXT,
    date TEXT NOT NULL,
    meal_type TEXT NOT NULL,
    diet_item_client_id TEXT,
    custom_title TEXT,
    calories REAL NOT NULL DEFAULT 0,
    protein REAL DEFAULT 0,
    carbs REAL DEFAULT 0,
    fats REAL DEFAULT 0,
    status TEXT DEFAULT 'pending',
    scheduled_time TEXT,
    is_deleted INTEGER DEFAULT 0,
    sync_status TEXT DEFAULT 'SYNCED',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,
  `CREATE INDEX IF NOT EXISTS idx_diet_date ON diet_meal_logs(date, is_deleted);`,

  // Finance Transactions
  `CREATE TABLE IF NOT EXISTS finance_transactions (
    client_id TEXT PRIMARY KEY,
    server_id TEXT UNIQUE,
    type TEXT NOT NULL,
    amount REAL NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    date TEXT NOT NULL,
    month TEXT NOT NULL,
    payment_method TEXT DEFAULT 'UPI',
    is_deleted INTEGER DEFAULT 0,
    sync_status TEXT DEFAULT 'SYNCED',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,
  `CREATE INDEX IF NOT EXISTS idx_finance_month ON finance_transactions(month, type, is_deleted);`,

  // Finance Budgets
  `CREATE TABLE IF NOT EXISTS finance_budgets (
    client_id TEXT PRIMARY KEY,
    server_id TEXT UNIQUE,
    month TEXT NOT NULL UNIQUE,
    total_budget REAL NOT NULL DEFAULT 0,
    category_budgets TEXT,
    is_deleted INTEGER DEFAULT 0,
    sync_status TEXT DEFAULT 'SYNCED',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,

  // Investment Holdings
  `CREATE TABLE IF NOT EXISTS investment_holdings (
    client_id TEXT PRIMARY KEY,
    server_id TEXT UNIQUE,
    symbol TEXT NOT NULL,
    name TEXT NOT NULL,
    asset_class TEXT NOT NULL,
    quantity REAL NOT NULL,
    avg_buy_price REAL NOT NULL,
    last_known_price REAL NOT NULL,
    currency TEXT DEFAULT 'INR',
    exchange TEXT DEFAULT 'NSE',
    notes TEXT,
    is_deleted INTEGER DEFAULT 0,
    sync_status TEXT DEFAULT 'SYNCED',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,

  // Investment Transactions
  `CREATE TABLE IF NOT EXISTS investment_transactions (
    client_id TEXT PRIMARY KEY,
    server_id TEXT UNIQUE,
    holding_client_id TEXT,
    symbol TEXT NOT NULL,
    type TEXT NOT NULL,
    quantity REAL NOT NULL,
    price REAL NOT NULL,
    fees REAL DEFAULT 0,
    date TEXT NOT NULL,
    is_deleted INTEGER DEFAULT 0,
    sync_status TEXT DEFAULT 'SYNCED',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,

  // Portfolio Blogs
  `CREATE TABLE IF NOT EXISTS portfolio_blogs (
    client_id TEXT PRIMARY KEY,
    server_id TEXT UNIQUE,
    title TEXT NOT NULL,
    slug TEXT,
    content TEXT NOT NULL,
    excerpt TEXT,
    tags TEXT,
    cover_image_uri TEXT,
    status TEXT DEFAULT 'draft',
    is_deleted INTEGER DEFAULT 0,
    sync_status TEXT DEFAULT 'SYNCED',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,

  // Portfolio Projects
  `CREATE TABLE IF NOT EXISTS portfolio_projects (
    client_id TEXT PRIMARY KEY,
    server_id TEXT UNIQUE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    tech_stack TEXT,
    github_url TEXT,
    live_url TEXT,
    image_uri TEXT,
    status TEXT DEFAULT 'publish',
    sort_order INTEGER DEFAULT 0,
    is_deleted INTEGER DEFAULT 0,
    sync_status TEXT DEFAULT 'SYNCED',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,

  // Portfolio Skills
  `CREATE TABLE IF NOT EXISTS portfolio_skills (
    client_id TEXT PRIMARY KEY,
    server_id TEXT UNIQUE,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    level INTEGER DEFAULT 80,
    icon TEXT,
    is_deleted INTEGER DEFAULT 0,
    sync_status TEXT DEFAULT 'SYNCED',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,

  // Portfolio Photos
  `CREATE TABLE IF NOT EXISTS portfolio_photos (
    client_id TEXT PRIMARY KEY,
    server_id TEXT UNIQUE,
    title TEXT,
    url TEXT NOT NULL,
    category TEXT,
    caption TEXT,
    is_deleted INTEGER DEFAULT 0,
    sync_status TEXT DEFAULT 'SYNCED',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,

  // Portfolio Contacts / Messages
  `CREATE TABLE IF NOT EXISTS portfolio_contacts (
    client_id TEXT PRIMARY KEY,
    server_id TEXT UNIQUE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'unread',
    created_at TEXT NOT NULL
  );`,

  // Education
  `CREATE TABLE IF NOT EXISTS portfolio_education (
    client_id TEXT PRIMARY KEY,
    server_id TEXT UNIQUE,
    institution TEXT NOT NULL,
    degree TEXT NOT NULL,
    field_of_study TEXT,
    start_date TEXT,
    end_date TEXT,
    grade TEXT,
    description TEXT,
    is_deleted INTEGER DEFAULT 0,
    sync_status TEXT DEFAULT 'SYNCED',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,

  // Social Links
  `CREATE TABLE IF NOT EXISTS portfolio_social_links (
    client_id TEXT PRIMARY KEY,
    server_id TEXT UNIQUE,
    platform TEXT NOT NULL,
    url TEXT NOT NULL,
    icon TEXT,
    is_deleted INTEGER DEFAULT 0,
    sync_status TEXT DEFAULT 'SYNCED',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,

  // AI Conversations & Sessions (Offline reading)
  `CREATE TABLE IF NOT EXISTS ai_conversations (
    client_id TEXT PRIMARY KEY,
    server_id TEXT UNIQUE,
    type TEXT NOT NULL, -- 'cold_email', 'stock_analyzer', 'routine'
    title TEXT NOT NULL,
    messages TEXT NOT NULL, -- JSON array of chat messages
    metadata TEXT,
    is_deleted INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,

  // Notes & Ideas (Offline-First Single Source of Truth)
  `CREATE TABLE IF NOT EXISTS notes (
    client_id TEXT PRIMARY KEY,
    server_id TEXT UNIQUE,
    user_id TEXT NOT NULL DEFAULT 'admin',
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT 'General',
    color TEXT NOT NULL DEFAULT '#7e37d8',
    is_pinned INTEGER DEFAULT 0,
    tags TEXT DEFAULT '[]',
    sync_status TEXT DEFAULT 'SYNCED',
    is_deleted INTEGER DEFAULT 0,
    deleted_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,
  `CREATE INDEX IF NOT EXISTS idx_notes_cat ON notes(category, is_deleted);`,
  `CREATE INDEX IF NOT EXISTS idx_notes_pinned ON notes(is_pinned, updated_at);`,

  // Note Categories (Offline-First dynamic user categories)
  `CREATE TABLE IF NOT EXISTS note_categories (
    client_id TEXT PRIMARY KEY,
    server_id TEXT UNIQUE,
    user_id TEXT NOT NULL DEFAULT 'admin',
    name TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL DEFAULT '#7e37d8',
    icon TEXT NOT NULL DEFAULT 'folder-outline',
    sync_status TEXT DEFAULT 'SYNCED',
    is_deleted INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,

  // ================= SMART STUDY FLOW SCHEMAS =================
  // Study Subjects
  `CREATE TABLE IF NOT EXISTS study_subjects (
    client_id TEXT PRIMARY KEY,
    server_id TEXT UNIQUE,
    user_id TEXT NOT NULL DEFAULT 'admin',
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    order_index INTEGER DEFAULT 0,
    sync_status TEXT DEFAULT 'SYNCED',
    is_deleted INTEGER DEFAULT 0,
    deleted_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,
  `CREATE INDEX IF NOT EXISTS idx_study_subjects_user ON study_subjects(user_id, is_deleted);`,
  `CREATE INDEX IF NOT EXISTS idx_study_subjects_order ON study_subjects(order_index);`,

  // Study Chunks (Chapters and Leaf sections)
  `CREATE TABLE IF NOT EXISTS study_chunks (
    client_id TEXT PRIMARY KEY,
    server_id TEXT UNIQUE,
    user_id TEXT NOT NULL DEFAULT 'admin',
    subject_id TEXT NOT NULL,
    parent_chunk_id TEXT,
    title TEXT NOT NULL,
    order_index INTEGER DEFAULT 0,
    summary TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    key_points TEXT DEFAULT '[]',
    terms TEXT DEFAULT '[]',
    revised INTEGER DEFAULT 0,
    sync_status TEXT DEFAULT 'SYNCED',
    is_deleted INTEGER DEFAULT 0,
    deleted_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,
  `CREATE INDEX IF NOT EXISTS idx_study_chunks_subj ON study_chunks(subject_id, is_deleted);`,
  `CREATE INDEX IF NOT EXISTS idx_study_chunks_parent ON study_chunks(parent_chunk_id, is_deleted);`,
  `CREATE INDEX IF NOT EXISTS idx_study_chunks_revised ON study_chunks(revised);`,

  // Study Quiz Questions (In-chunk quizzes)
  `CREATE TABLE IF NOT EXISTS study_quiz_questions (
    client_id TEXT PRIMARY KEY,
    server_id TEXT UNIQUE,
    user_id TEXT NOT NULL DEFAULT 'admin',
    chunk_id TEXT NOT NULL,
    question TEXT NOT NULL,
    type TEXT DEFAULT 'mcq',
    options TEXT DEFAULT '[]',
    answer TEXT NOT NULL,
    explanation TEXT DEFAULT '',
    order_index INTEGER DEFAULT 0,
    sync_status TEXT DEFAULT 'SYNCED',
    is_deleted INTEGER DEFAULT 0,
    deleted_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,
  `CREATE INDEX IF NOT EXISTS idx_study_quiz_chunk ON study_quiz_questions(chunk_id, is_deleted);`,

  // Study Daily Quizzes (Generated Daily or Drill Quizzes)
  `CREATE TABLE IF NOT EXISTS study_daily_quizzes (
    client_id TEXT PRIMARY KEY,
    server_id TEXT UNIQUE,
    user_id TEXT NOT NULL DEFAULT 'admin',
    subject_id TEXT NOT NULL,
    quiz_date TEXT NOT NULL,
    questions TEXT NOT NULL,
    total_questions INTEGER DEFAULT 0,
    difficulty TEXT DEFAULT 'medium',
    source TEXT DEFAULT 'ai',
    sync_status TEXT DEFAULT 'SYNCED',
    is_deleted INTEGER DEFAULT 0,
    deleted_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,
  `CREATE INDEX IF NOT EXISTS idx_study_dq_date ON study_daily_quizzes(quiz_date, user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_study_dq_subj ON study_daily_quizzes(subject_id);`,

  // Study Daily Quiz Attempts
  `CREATE TABLE IF NOT EXISTS study_daily_quiz_attempts (
    client_id TEXT PRIMARY KEY,
    server_id TEXT UNIQUE,
    user_id TEXT NOT NULL DEFAULT 'admin',
    daily_quiz_id TEXT NOT NULL,
    subject_id TEXT NOT NULL,
    quiz_date TEXT NOT NULL,
    answers TEXT NOT NULL,
    score INTEGER NOT NULL,
    total_questions INTEGER NOT NULL,
    percentage REAL NOT NULL,
    time_taken INTEGER DEFAULT 0,
    completed INTEGER DEFAULT 1,
    started_at TEXT NOT NULL,
    completed_at TEXT,
    sync_status TEXT DEFAULT 'SYNCED',
    is_deleted INTEGER DEFAULT 0,
    deleted_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,
  `CREATE INDEX IF NOT EXISTS idx_study_att_quiz ON study_daily_quiz_attempts(daily_quiz_id);`,
  `CREATE INDEX IF NOT EXISTS idx_study_att_date ON study_daily_quiz_attempts(quiz_date);`,

  // Study Daily Quiz Config
  `CREATE TABLE IF NOT EXISTS study_daily_quiz_config (
    client_id TEXT PRIMARY KEY,
    server_id TEXT UNIQUE,
    user_id TEXT NOT NULL DEFAULT 'admin',
    enabled INTEGER DEFAULT 1,
    schedule_time TEXT DEFAULT '12:00:00',
    timezone TEXT DEFAULT 'Asia/Kolkata',
    difficulty TEXT DEFAULT 'mixed',
    include_pyq INTEGER DEFAULT 1,
    num_questions INTEGER DEFAULT 10,
    sync_status TEXT DEFAULT 'SYNCED',
    is_deleted INTEGER DEFAULT 0,
    deleted_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,

  // Study Weak Questions
  `CREATE TABLE IF NOT EXISTS study_weak_questions (
    client_id TEXT PRIMARY KEY,
    server_id TEXT UNIQUE,
    user_id TEXT NOT NULL DEFAULT 'admin',
    subject_id TEXT NOT NULL,
    question_hash TEXT NOT NULL,
    question TEXT NOT NULL,
    options TEXT DEFAULT '[]',
    answer TEXT NOT NULL,
    explanation TEXT DEFAULT '',
    times_wrong INTEGER DEFAULT 1,
    times_correct INTEGER DEFAULT 0,
    mastered INTEGER DEFAULT 0,
    last_wrong_at TEXT,
    last_seen_at TEXT,
    sync_status TEXT DEFAULT 'SYNCED',
    is_deleted INTEGER DEFAULT 0,
    deleted_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,
  `CREATE INDEX IF NOT EXISTS idx_study_weak_subj ON study_weak_questions(subject_id, mastered, is_deleted);`,
  `CREATE INDEX IF NOT EXISTS idx_study_weak_hash ON study_weak_questions(subject_id, question_hash);`,

  // Study User Streaks
  `CREATE TABLE IF NOT EXISTS study_user_streaks (
    client_id TEXT PRIMARY KEY,
    server_id TEXT UNIQUE,
    user_id TEXT NOT NULL DEFAULT 'admin',
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_active_date TEXT,
    total_quizzes_completed INTEGER DEFAULT 0,
    sync_status TEXT DEFAULT 'SYNCED',
    is_deleted INTEGER DEFAULT 0,
    deleted_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`
];

