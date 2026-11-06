# Backend APIs and AI Services Specification: Smart Study Flow

## 1. Overview

The backend services for Smart Study Flow run inside the existing Express server (`mobile-app/server/index.js`), using the project's authenticated session middleware and MongoDB Atlas database. In addition, the AI chunking and quiz generation engines utilize the configured Grok / xAI model integration (or OpenAI-compatible client via `GROK_API_KEY`).

---

## 2. REST API Specification (`/api/study`)

All routes require user authentication via `authMiddleware` (`req.user.id`).

### 2.1. Study Tree Operations
- **`GET /api/study/bootstrap`**
  - **Purpose**: Fetches the complete study state for the user upon initial sync or cache rebuild.
  - **Response `200 OK`**:
    ```json
    {
      "subjects": [{ "id": "uuid-1", "name": "Modern History", "description": "", "orderIndex": 0 }],
      "chunks": [{
        "id": "uuid-c1",
        "subjectId": "uuid-1",
        "parentChunkId": null,
        "title": "1857 Revolt",
        "orderIndex": 0,
        "summary": "...",
        "notes": "### The Causes...",
        "keyPoints": ["Immediate cause: greased cartridges"],
        "terms": [{ "term": "Sepoy", "meaning": "Indian soldier in British service" }],
        "revised": false,
        "updatedAt": 1715000000000
      }],
      "quizQuestions": [{
        "id": "uuid-q1",
        "chunkId": "uuid-c1",
        "question": "Where did the revolt begin?",
        "options": ["Meerut", "Delhi", "Kanpur", "Barrackpore"],
        "answer": "Meerut",
        "explanation": "Started on May 10, 1857 in Meerut."
      }]
    }
    ```

- **`POST /api/study/import-tree`**
  - **Purpose**: Persists a newly created or AI-chunked hierarchical tree into the database.
  - **Request Body**:
    ```json
    {
      "target": { "subjectId": "optional-uuid", "parentChunkId": "optional-uuid" },
      "tree": {
        "subjects": [{
          "name": "Indian Geography",
          "description": "",
          "chunks": [{
            "title": "Himalayan Rivers",
            "summary": "...",
            "notes": "...",
            "keyPoints": [...],
            "terms": [...],
            "quiz": [...],
            "children": [...]
          }]
        }]
      }
    }
    ```
  - **Response `201 Created`**: Returns created IDs and sync timestamps.

---

### 2.2. AI Processing Endpoints

- **`POST /api/study/ai/chunk-content`**
  - **Purpose**: Organizes raw pasted text or ChatGPT dumps into a structured study hierarchy preserving 95%+ verbatim content.
  - **Request Body**:
    ```json
    {
      "content": "Raw text or ChatGPT transcript here..."
    }
    ```
  - **Response `200 OK`**:
    ```json
    {
      "subjects": [
        {
          "name": "General Science - Biology",
          "description": "Cell biology and genetics",
          "chunks": [
            {
              "title": "Cell Structure & Organelles",
              "summary": "Overview of plant and animal cell components.",
              "notes": "# Cell Structure & Organelles\n\n### Mitochondria\nThe powerhouse of the cell...",
              "keyPoints": [
                "Mitochondria produce ATP via cellular respiration",
                "Ribosomes are responsible for protein synthesis"
              ],
              "terms": [
                { "term": "Cristae", "meaning": "Folds of the inner mitochondrial membrane" }
              ],
              "quiz": [
                {
                  "question": "Which organelle is known as the powerhouse of the cell?",
                  "type": "mcq",
                  "options": ["Mitochondria", "Ribosome", "Nucleus", "Golgi apparatus"],
                  "answer": "Mitochondria",
                  "explanation": "Mitochondria generate ATP."
                }
              ],
              "children": []
            }
          ]
        }
      ]
    }
    ```

- **`POST /api/study/ai/generate-quiz`**
  - **Purpose**: Generates high-quality SSC MCQs grounded in specific chunk notes or subject notes.
  - **Request Body**:
    ```json
    {
      "subjectId": "uuid",
      "chunkIds": ["uuid-1", "uuid-2"],
      "difficulty": "medium",
      "count": 10
    }
    ```
  - **Response `200 OK`**:
    ```json
    {
      "questions": [
        {
          "question": "Which layer of the atmosphere contains the ozone layer?",
          "type": "mcq",
          "options": ["Troposphere", "Stratosphere", "Mesosphere", "Thermosphere"],
          "answer": "Stratosphere",
          "explanation": "The ozone layer is concentrated in the stratosphere."
        }
      ]
    }
    ```

---

### 2.3. Daily Quiz & Attempt Endpoints

- **`GET /api/study/daily-quiz/today`**
  - **Purpose**: Returns today's active quizzes for the user across subjects.
  - **Query Params**: `date=YYYY-MM-DD` (defaults to today).
  - **Response `200 OK`**: Array of daily quiz objects with question count and completion status.

- **`POST /api/study/daily-quiz/attempt`**
  - **Purpose**: Records a completed quiz attempt, calculates score/percentage, updates streaks, and records weak questions.
  - **Request Body**:
    ```json
    {
      "dailyQuizId": "uuid",
      "subjectId": "uuid",
      "quizDate": "2026-11-06",
      "answers": [
        { "questionIdx": 0, "selectedAnswer": "B", "isCorrect": true },
        { "questionIdx": 1, "selectedAnswer": "A", "isCorrect": false }
      ],
      "score": 1,
      "totalQuestions": 2,
      "percentage": 50,
      "timeTaken": 42
    }
    ```
  - **Internal Side Effects**:
    1. Upserts wrong questions into `study_weak_questions` (increments `timesWrong`, resets `mastered = false`).
    2. Increments `timesCorrect` on right answers that were previously weak (marks `mastered = true` if `timesCorrect >= 2`).
    3. Bumps streak in `study_user_streaks` if this is the first quiz completed today.
  - **Response `201 Created`**: Returns created attempt object and updated streak data.

- **`GET /api/study/weak-questions`**
  - **Query Params**: `subjectId` (optional), `tab` (`active` or `mastered`).
  - **Response `200 OK`**: List of weak question items sorted by `timesWrong` descending.

- **`POST /api/study/weak-questions/drill`**
  - **Purpose**: Instantly creates a 20-question drill quiz from unmastered weak questions.
  - **Request Body**: `{ "subjectId": "uuid" }`
  - **Response `200 OK`**: Returns the generated daily quiz object ready for immediate solving.

- **`GET /api/study/revision-report`**
  - **Purpose**: Returns aggregated revision analytics: subject accuracy, active weak counts, mastered counts, and attempt history.

---

## 3. AI Service Implementation (`studyAiChunkerService.js`)

### 3.1. Engine & Model Configuration
- **Model**: `grok-beta` or `gpt-4o-mini` configured via `process.env.GROK_API_KEY`.
- **System Prompt**: Enforces the 95%+ verbatim content preservation rule from `smart-study-flow`:
  ```text
  You are an expert SSC exam study organizer. The user pastes a long ChatGPT conversation, syllabus dump, or raw notes. Your job is to ORGANIZE and RE-FORMAT — NOT to summarize, condense, or trim.

  ABSOLUTE CONTENT-PRESERVATION RULES (most important):
  - Keep ~95% of the original text. If the user gives 100 lines, ~95 lines must still be present in the output (across "notes" fields). You are a FORMATTER, not a summarizer.
  - The ONLY things you may drop: greetings ("sure!", "here you go"), pure conversational filler, exact duplicate sentences, and the literal quiz/MCQ Q&A blocks (those move to the quiz array). NOTHING else.
  - DO NOT shorten facts, examples, dates, names, lists, tables, formulas, explanations, definitions, side notes, or "extra" context. If in doubt, KEEP IT.
  - DO NOT replace sentences with shorter paraphrases. Use the user's wording verbatim where possible; you may only re-flow it into markdown.
  - NEVER invent facts that are not in the source.
  ```

### 3.2. Structured Tool-Calling Schema
The engine invokes the model using Function / Tool calling with the schema `emit_study_tree`:
- Properties:
  - `subjects`: Array of subjects (name, description, chunks).
  - `chunks`: Array of chunk objects (title, summary, notes, keyPoints, terms, quiz, children).
- Quiz extraction rule: Questions written in the source are stripped from the markdown notes and placed directly into `quiz`.

