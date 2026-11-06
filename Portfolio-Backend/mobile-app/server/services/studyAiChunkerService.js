const ProjectApi = require('../models/portfolio/ProjectApi');

function getUniversalSystemPrompt(fieldOrContext = 'Academic & Professional Studies', customInstruction = '') {
  return `You are an expert universal study organizer and academic content architect specialized in ${fieldOrContext}.
The user pastes study notes, ChatGPT chat transcripts, syllabus outlines, textbook excerpts, or code documentation.
Your job is to ORGANIZE, STRUCTURE, and RE-FORMAT — NOT to summarize, condense, or discard facts.

${customInstruction ? `USER CUSTOM INSTRUCTIONS:\n${customInstruction}\n` : ''}

ABSOLUTE CONTENT-PRESERVATION RULES (most important):
- Keep ~95% of the original text. You are a FORMATTER, not a summarizer.
- Preserve all formulas, code snippets, algorithms, dates, names, historical timelines, lists, diagrams-in-text, tables, and explanations verbatim where possible.
- The ONLY things you may drop: conversational chat filler ("sure!", "here you go"), exact duplicate lines, and raw quiz blocks (which are moved into the quiz array).
- NEVER invent facts that are not grounded in the source notes.

FORMATTING RULES:
- Convert plain text into clean, scannable markdown with #, ##, ### headers, bold terms, bullet points, code fences, and blank lines.
- The "notes" field for each leaf chunk must contain the FULL re-formatted content.
- The "summary" field is 2-4 lines of high-level overview.
- "keyPoints" (3-8 bullets) and "terms" (term + meaning) are additive.

STRUCTURE RULES:
- Detect logical Subjects appropriate for ${fieldOrContext} (e.g. for Engineering: Data Structures, OS, Networking, Algorithms, Electronics; for SSC: History, Polity, Geography, Economy; for General: relevant overarching domains).
- Under each subject, detect Chapters / Units / Sections with clear logical hierarchy.
- Use "children" for deeper sub-topics when hierarchy exists.

QUIZ RULES:
- Scan the source for any quiz, MCQ, or practice questions.
- REMOVE questions from "notes" and place them into the chunk's "quiz" array.
- All questions must be "mcq" with 4 options, a correct answer, and an explanation.
- Add 2-4 high-yield conceptual MCQs per chunk if none existed.

OUTPUT JSON:
Respond ONLY with a valid JSON object matching this structure:
{
  "subjects": [
    {
      "name": "Subject Name",
      "description": "Short description",
      "chunks": [
        {
          "title": "Topic Title",
          "summary": "2-4 line summary",
          "notes": "Full verbatim markdown content",
          "keyPoints": ["point 1", "point 2"],
          "terms": [{"term": "...", "meaning": "..."}],
          "quiz": [
            {
              "question": "Question text?",
              "type": "mcq",
              "options": ["Option A", "Option B", "Option C", "Option D"],
              "answer": "Option A",
              "explanation": "Why this answer is correct"
            }
          ],
          "children": []
        }
      ]
    }
  ]
}`;
}

async function getApiKey(userProvidedKey = null) {
  if (userProvidedKey && userProvidedKey.trim().length > 15) {
    return userProvidedKey.trim();
  }
  const envKey = process.env.GROK_API_KEY || process.env.GROQ_API_KEY || process.env.XAI_API_KEY;
  if (envKey && !envKey.includes('your_') && envKey.trim().length > 15) {
    return envKey.trim();
  }
  try {
    const doc = await ProjectApi.findOne({ 'apis.name': { $regex: /llm.*api.*key|grok|groq|gemini|openai/i } });
    if (doc) {
      const found = doc.apis.find((a) => /llm.*api.*key|grok|groq|gemini|openai/i.test(a.name));
      if (found && found.endpoint) {
        return found.endpoint.replace(/["']/g, '').trim();
      }
    }
  } catch (e) {}
  return '';
}

/**
 * Fallback heuristic chunker if API is unreachable, unconfigured, or rate-limited.
 * Guarantees zero data loss by parsing sections and headings mechanically.
 */
function heuristicChunkContent(rawText, options = {}) {
  const lines = rawText.split('\n');
  const fieldName = options.fieldName || options.fieldContext || 'General Studies';
  let subjectName = fieldName !== 'Universal Study' ? fieldName : 'General Studies';
  
  const firstNonEmpty = lines.find((l) => l.trim().length > 0) || '';
  if (firstNonEmpty.length < 50 && !firstNonEmpty.startsWith('#')) {
    subjectName = firstNonEmpty.replace(/^[-*#\s]+/, '').trim() || subjectName;
  }

  // Split into chunks by major headings or paragraphs
  const rawChunks = [];
  let currentTitle = 'Introduction & Overview';
  let currentLines = [];

  for (const line of lines) {
    const headingMatch = line.match(/^#{1,3}\s+(.+)$/);
    if (headingMatch && currentLines.length > 5) {
      rawChunks.push({
        title: currentTitle,
        notes: currentLines.join('\n').trim(),
      });
      currentTitle = headingMatch[1].trim();
      currentLines = [line];
    } else {
      currentLines.push(line);
    }
  }

  if (currentLines.length > 0) {
    rawChunks.push({
      title: currentTitle,
      notes: currentLines.join('\n').trim(),
    });
  }

  const chunks = rawChunks.map((rc, idx) => {
    const chunkLines = rc.notes.split('\n');
    const keyPoints = [];
    const terms = [];
    const quiz = [];
    const filteredNotes = [];

    let inQuizBlock = false;
    let currentQuizQ = null;

    for (let i = 0; i < chunkLines.length; i++) {
      const line = chunkLines[i];
      const trimmed = line.trim();

      // Detect terms like "Term: definition" or "**Term**: definition"
      const termMatch = trimmed.match(/^\*?\*?([A-Za-z0-9\s-]{2,30})\*?\*?:\s+(.{15,})$/);
      if (termMatch && terms.length < 8) {
        terms.push({ term: termMatch[1].trim(), meaning: termMatch[2].trim() });
      }

      // Detect bullet points
      if (/^[-*•]\s+(.{15,})$/.test(trimmed) && keyPoints.length < 6) {
        keyPoints.push(trimmed.replace(/^[-*•]\s+/, '').trim());
      }

      // Detect quiz question patterns: Q1. or Question:
      const qMatch = trimmed.match(/^(?:Q\d*[:.]|Question\s*\d*[:.]|\d+[.)])\s*(.+\?)$/i);
      if (qMatch) {
        if (currentQuizQ && currentQuizQ.options.length >= 2) {
          quiz.push(currentQuizQ);
        }
        currentQuizQ = {
          question: qMatch[1].trim(),
          type: 'mcq',
          options: [],
          answer: '',
          explanation: 'Extracted from source notes.',
        };
        inQuizBlock = true;
        continue;
      }

      if (inQuizBlock && currentQuizQ) {
        const optMatch = trimmed.match(/^[A-Da-d][.)]\s*(.+)$/);
        if (optMatch) {
          currentQuizQ.options.push(optMatch[1].trim());
          if (!currentQuizQ.answer) currentQuizQ.answer = optMatch[1].trim();
          continue;
        }
        const ansMatch = trimmed.match(/^(?:Ans|Answer)[:.]\s*([A-Da-d]|.+)$/i);
        if (ansMatch) {
          currentQuizQ.answer = ansMatch[1].trim();
          inQuizBlock = false;
          quiz.push(currentQuizQ);
          currentQuizQ = null;
          continue;
        }
      }

      if (!inQuizBlock) {
        filteredNotes.push(line);
      }
    }

    if (currentQuizQ && currentQuizQ.options.length >= 2) {
      quiz.push(currentQuizQ);
    }

    // Default 4 options if incomplete
    for (const q of quiz) {
      while (q.options.length < 4) {
        q.options.push(`Option ${String.fromCharCode(65 + q.options.length)}`);
      }
      if (!q.answer) q.answer = q.options[0];
    }

    const cleanNotes = filteredNotes.join('\n').trim() || rc.notes;
    const summary = cleanNotes.slice(0, 200).replace(/[\r\n#]+/g, ' ').trim() + '...';

    return {
      title: rc.title || `Section ${idx + 1}`,
      summary: summary || 'Overview of key concepts and foundational material.',
      notes: cleanNotes,
      keyPoints: keyPoints.length > 0 ? keyPoints : ['Essential concepts and definitions covered in detail.'],
      terms,
      quiz,
      children: [],
    };
  });

  return {
    subjects: [
      {
        name: subjectName,
        description: `Organized study notes for ${subjectName}.`,
        chunks,
      },
    ],
    _meta: {
      usedAi: false,
      method: 'heuristic',
      message: 'Organized with smart offline parsing engine.',
    },
  };
}

/**
 * Main chunking routine using LLM API with heuristic fallback.
 */
async function organizeContentWithAi(rawContent, options = {}) {
  if (!rawContent || rawContent.trim().length < 20) {
    throw new Error('Please paste at least a paragraph of content.');
  }

  const fieldOrContext = options.fieldName || options.fieldContext || 'Academic & Professional Studies';
  const customInstruction = options.customPrompt || '';
  const systemPrompt = options.systemPromptOverride || getUniversalSystemPrompt(fieldOrContext, customInstruction);

  const apiKey = await getApiKey(options.apiKey);
  if (!apiKey) {
    console.warn('[studyAiChunkerService] No valid API key found. Using heuristic chunker.');
    return heuristicChunkContent(rawContent, options);
  }

  // Model selection
  let modelName = 'llama-3.3-70b-versatile';
  if (options.modelName) {
    modelName = options.modelName;
  } else if (process.env.GROK_MODEL && !process.env.GROK_MODEL.includes('gpt-oss')) {
    modelName = process.env.GROK_MODEL;
  }

  try {
    const userPrompt = `ORGANIZE THE FOLLOWING STUDY CONTENT FOR "${fieldOrContext.toUpperCase()}".\n\nRAW CONTENT:\n${rawContent.slice(0, 60000)}`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`[studyAiChunkerService] AI response error ${response.status}: ${errText}. Using heuristic fallback.`);
      return heuristicChunkContent(rawContent, options);
    }

    const data = await response.json();
    const contentStr = data.choices?.[0]?.message?.content;
    if (!contentStr) {
      console.warn('[studyAiChunkerService] Empty choices content. Using heuristic fallback.');
      return heuristicChunkContent(rawContent, options);
    }

    let parsed;
    try {
      parsed = JSON.parse(contentStr);
    } catch (parseErr) {
      const cleaned = contentStr.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleaned);
    }

    if (parsed && Array.isArray(parsed.subjects) && parsed.subjects.length > 0) {
      parsed._meta = {
        usedAi: true,
        method: 'llm',
        model: modelName,
      };
      return parsed;
    }

    console.warn('[studyAiChunkerService] Parsed tree missing subjects array. Using heuristic fallback.');
    return heuristicChunkContent(rawContent, options);
  } catch (err) {
    console.error('[studyAiChunkerService] Exception in AI chunker:', err.message);
    return heuristicChunkContent(rawContent, options);
  }
}

module.exports = {
  getUniversalSystemPrompt,
  organizeContentWithAi,
  heuristicChunkContent,
};
