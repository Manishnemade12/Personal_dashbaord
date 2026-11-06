# Component and Screen Mapping Specification: Smart Study Flow

## 1. Overview and Design System Alignment

This document provides a comprehensive mapping of every screen, view, dialog, and UI component from `smart-study-flow` into the target unified React Native / Expo application (`mobile-app`).

### Theme and Visual Treatment
- **Background & Card Surfaces**: Deep, premium dark palette matching the portfolio system (`#0b0f19` dark canvas, `#111827` secondary, `#1f2937` surface border).
- **Accents & Gradients**: Vibrant violet-to-indigo gradient (`linear-gradient(135deg, #6366f1 0%, #a855f7 100%)` or `LinearGradient` colors `['#6366f1', '#8b5cf6']`).
- **Semantic Badges**:
  - Easy / High score: Emerald green (`#10b981`, bg: `rgba(16, 185, 129, 0.15)`)
  - Medium / Moderate: Amber (`#f59e0b`, bg: `rgba(245, 158, 11, 0.15)`)
  - Hard / Low score: Rose red (`#f43f5e`, bg: `rgba(244, 63, 94, 0.15)`)

---

## 2. Master Screen Inventory

| # | Screen Name | Source Path | Target Component (`mobile-app`) | Primary Responsibility |
|---|-------------|-------------|---------------------------------|------------------------|
| 1 | **Study Root / Frame** | `src/components/AppLayout.tsx` | `src/screens/study/StudyWorkspaceScreen.js` | Top header with Exit button, nested collapsible drawer / sidebar, global modals. |
| 2 | **Study Dashboard** | `src/routes/dashboard.tsx` | `src/screens/study/StudyDashboardScreen.js` | Hero banner, 4 stats cards, recently updated chunk grid, quick action buttons. |
| 3 | **Study Sidebar Navigator** | `src/components/Sidebar.tsx` | `src/components/study/StudySidebarDrawer.js` | Hierarchical tree: Subjects → Parent Chunks → Leaf Sub-chunks, Add subject, Add content triggers. |
| 4 | **Chunk Detail Reader** | `src/routes/chunk.$chunkId.tsx` | `src/screens/study/StudyChunkReaderScreen.js` | Dynamic breadcrumbs, in-place editor, revision toggle, markdown notes viewer, key points, terms, chunk quiz. |
| 5 | **Add Content Dialog** | `src/components/AddContentDialog.tsx` | `src/components/study/AddContentModal.js` | Target selector (Auto, Subject, Chunk, Manual), AI chunker parser, structured tree preview, manual creator. |
| 6 | **Daily Quiz Hub** | `src/components/DailyQuizPage.tsx` | `src/screens/study/DailyQuizHubScreen.js` | Streak flame counter, 7-day activity dots, unattempted/attempted tabs, quiz history list. |
| 7 | **Interactive Quiz Runner** | `src/components/DailyQuizContainer.tsx` | `src/screens/study/DailyQuizRunnerScreen.js` | Question countdown timer, visual question palette, 4-option radio selector, auto & manual submit. |
| 8 | **Quiz Result Review** | `src/components/DailyQuizResultPage.tsx` | `src/screens/study/DailyQuizResultScreen.js` | Grade hero badge (A+, A, B, C, D), percentage circle, time taken, question-by-question review with explanations. |
| 9 | **Quiz Settings** | `src/components/DailyQuizSettingsPage.tsx` | `src/screens/study/DailyQuizSettingsScreen.js` | Daily quiz toggle, schedule time picker, difficulty selector, question count slider. |
| 10 | **Weak Topics Drill** | `src/components/WeakTopicsPage.tsx` | `src/screens/study/WeakTopicsScreen.js` | Active vs Mastered tabs, grouped by subject, "Drill now" instant 20-Q quiz, "Mark Mastered" toggle. |
| 11 | **Revision Analytics** | `src/components/RevisionReportPage.tsx` | `src/screens/study/RevisionReportScreen.js` | Accuracy metrics, subject progress bars, active weak items vs mastered breakdown. |
| 12 | **Study Global Search** | `src/routes/search.tsx` | `src/screens/study/StudySearchScreen.js` | Unified search across chunk notes, summaries, terms, key points, quiz questions, and subjects. |
| 13 | **Global / Quick Quiz Modal** | `src/components/GlobalQuizDialog.tsx` | `src/components/study/StudyQuickQuizModal.js` | Quick generation of quizzes across selected subjects or specific chunks. |

---

## 3. Detailed Component Specifications

### 3.1. Study Root Frame (`StudyWorkspaceScreen.js`)
- **Container**: Full-height flex container replacing the main application view when `currentScreen === 'Study'`.
- **Top Header**:
  - Left: `← Exit to Home` button (prominent icon + label) which sets `currentScreen = 'Dashboard'`.
  - Center: Title `SSC Smart Notes` with book icon and active subject/chunk breadcrumbs.
  - Right: Quick Search icon button (opens `StudySearchScreen`), and Mobile Drawer Hamburger icon (if screen width < 768px).
- **Split Layout (Desktop/Tablet vs Mobile)**:
  - Desktop (width >= 768px): Persistent left Study Navigator (w-72) + scrollable main content area.
  - Mobile (width < 768px): Full-width content area with slide-over drawer for the Study Navigator.

### 3.2. Study Dashboard (`StudyDashboardScreen.js`)
- **Hero Banner**:
  - Gradient banner (`#6366f1` to `#a855f7`).
  - AI badge: `Sparkles` icon with text *"AI-powered study organizer"*.
  - Headline: *"Turn long ChatGPT chats into perfectly organized SSC notes."*
  - Subtext: *"Paste any conversation. We detect subjects, chapters, key terms and quiz questions instantly."*
  - Action buttons:
    - Primary: `[+ Add new content]` (opens `AddContentModal`).
    - Secondary: `[🧠 Generate quiz]` (opens `StudyQuickQuizModal`).
- **Metric Cards (4-column grid on desktop, 2x2 on mobile)**:
  1. `Subjects`: Total subject count.
  2. `Chunks`: Total content chunks.
  3. `Revised`: Fraction of revised chunks over total chunks (e.g. `12/35`).
  4. `Quiz questions`: Total extracted/generated questions across all chunks.
- **Recently Updated Section**:
  - 3-column responsive card grid.
  - Card layout:
    - Subject tag (uppercase, primary color).
    - Chunk title (semi-bold, hover highlight).
    - Summary (clamped to 3 lines).
    - Metadata footer: count of key points, count of quiz questions.
  - Empty state: Clean dashed-border card with call to paste the first note.

### 3.3. Chunk Reader & Interactive Tabs (`StudyChunkReaderScreen.js`)
- **Breadcrumbs Bar**: `Home > Subject Name > Parent Chapter > Chunk Title`.
- **Header Actions**:
  - Title: Editable inline with title input or rendered as an H1 heading.
  - Toggle Button: `Mark as Revised` (circle turns to green `CheckCircle2` with "Revised").
  - `Edit` / `Save` / `Cancel` button group for inline editing of title, summary, and markdown notes.
  - `+ Add more notes`: Opens `AddContentModal` with `parentChunkId` pre-filled.
  - `Sparkles Generate Quiz`: Generates quiz questions directly from this chunk's notes.
  - `Trash Delete`: Deletes the chunk with confirmation dialog.
- **Content Tabs**:
  - Tab 1: **Notes**
    - Summary Callout: Highlighted card with left accent border displaying the 2-4 sentence summary.
    - Markdown Body: Rendered using React Native Markdown display or web equivalent supporting tables, bold text, headings, blockquotes, and lists.
  - Tab 2: **Key Points**
    - Ordered numbered cards highlighting essential recall points.
  - Tab 3: **Terms**
    - 2-column grid of vocabulary and definition cards (bold term in primary accent, clear meaning text).
  - Tab 4: **Quiz**
    - Embedded MCQ quiz card for the specific chunk.
- **Next Chunk Navigation**: Floating / bottom right button `Next →` linking directly to the subsequent sequential chunk.

### 3.4. AI Content Chunker Modal (`AddContentModal.js`)
- **3-Step Flow**:
  - **Step 1: Input & Mode Selection**:
    - Segmented Mode Switcher:
      - `Auto` (AI detects subjects and hierarchy).
      - `Existing Subject` (Dropdown picker of current subjects).
      - `Sub-chunk` (Dropdown picker of parent chunks).
      - `Manual` (Form to type title, notes, summary without AI).
    - Content Textarea: Large text input with placeholder for pasting raw text or ChatGPT dumps.
    - Submit Button: `[Sparkles Organize with AI]`.
  - **Step 2: Processing / Loading**:
    - Animated loader with status: *"Analyzing content, extracting chapters, generating MCQs..."*.
  - **Step 3: Tree Preview & Confirmation**:
    - Visual collapsible preview tree of the generated subjects, chapters, summaries, and questions.
    - `[Confirm & Save]` button: Commits data to SQLite + Outbox sync.

### 3.5. Daily Quiz Hub (`DailyQuizHubScreen.js`)
- **Hero Banner**:
  - Title: `SSC Quiz Hub` with sparkle icon.
  - Subtitle: *"Generate SSC-style MCQs, drill weak spots, and track your daily streak."*
  - Action: `[Generate Quiz]` button.
- **Streak & Weak Spots Quick Row (2 cards)**:
  - Card 1: `Daily Streak` — Flame icon, current streak count, longest streak, total completed quizzes, and 7-day activity dot graph.
  - Card 2: `Weak Topic Drill` — Brain icon, count of active unmastered questions, count of mastered questions, single-tap route to `WeakTopicsScreen`.
- **Stat Cards Row**:
  - `Total Attempts`, `Best Score %`, `Avg Score %`, and `Revision Report` shortcut.
- **Tabs: Today vs History**:
  - Tab `Today`:
    - Section `Not Attempted`: Cards for today's generated quizzes with difficulty badge and question count.
    - Section `Attempted Quizzes`: Cards showing prior attempts, best score %, and `Retry` action.
  - Tab `History`:
    - Chronological list of completed quiz attempts with percentage badge, time taken, date, and detail tap.

### 3.6. Interactive Quiz Runner (`DailyQuizRunnerScreen.js`)
- **Sticky Top Bar**:
  - Subject title & difficulty badge.
  - Question counter: `Question X of Y · Z answered`.
  - Countdown Timer: Digital clock badge with warning color when `< 60` seconds remaining.
  - Linear Progress bar indicating overall completion percentage.
- **Active Question Card**:
  - Question index pill + Question text.
  - 4 Radio Option Cards:
    - Tap to select answer.
    - Highlight border and background on selected item.
- **Navigation Controls**:
  - `[← Prev]` and `[Next →]` buttons.
  - `[Submit]` button (triggers confirmation modal showing answered vs unanswered questions).
- **Question Palette Grid**:
  - Compact scrollable grid of question numbers (1 to N).
  - Green indicator for answered, blue/primary for currently active, neutral for unvisited.

### 3.7. Quiz Result Review (`DailyQuizResultScreen.js`)
- **Score Hero Card**:
  - Grade badge (`A+`, `A`, `B`, `C`, `D`) based on percentage.
  - Big percentage display (e.g. `85%`).
  - Score summary: `17/20 correct`.
  - Stat grid: `Correct`, `Wrong`, `Skipped`, `Time Taken`.
- **Focus Recommendation**:
  - Dynamic advisory callout highlighting missed concepts.
- **Action Buttons**:
  - `[🔄 Retry Quiz]` (re-runs quiz with timer).
  - `[🏠 Quiz Hub]` (returns to hub).
- **Detailed Question Review List**:
  - Full breakdown of each question:
    - User's selected choice marked in red (if wrong) or green (if right).
    - Correct choice marked with green checkmark.
    - In-depth explanation callout box for learning.

### 3.8. Weak Topics & Drills (`WeakTopicsScreen.js`)
- **Tabs**: `Active (Unmastered)` vs `Mastered`.
- **Subject-wise Grouping**:
  - Each subject card shows active weak question count.
  - `[⚡ Drill now]` button: Automatically generates an instant quiz of up to 20 previously missed questions.
- **Question Item Cards**:
  - Question snippet.
  - Badges: `Wrong × N`, `Right × M`, `Last missed date`.
  - Action: Single-tap `Mark as Mastered` icon button, and `Delete / Dismiss` icon button.

### 3.9. Revision Analytics (`RevisionReportScreen.js`)
- **Top Metrics**:
  - Overall accuracy percentage across all subjects.
  - Total active weak questions.
  - Total quizzes completed.
  - Total mastered questions.
- **Subject Accuracy Breakdown**:
  - Horizontal progress bar for each subject.
  - Color coded: Green (`>= 75%`), Amber (`50-74%`), Red (`< 50%`).
  - Detailed stats: Attempts count, last attempt %, total mistakes count.

### 3.10. Global Search (`StudySearchScreen.js`)
- Search input with clear button.
- Real-time search query matching across:
  - Subject names
  - Chunk titles & summaries
  - Markdown notes text
  - Key points
  - Terms & definitions
  - Quiz questions & answers
- Clickable search result cards navigating directly to the matching chunk with query highlighting.

