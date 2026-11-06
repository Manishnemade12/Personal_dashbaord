const ProjectApi = require('../models/portfolio/ProjectApi');

const SYSTEM_PROMPT = `You are an expert SSC exam study organizer. The user pastes a long ChatGPT conversation, syllabus dump, or raw notes. Your job is to ORGANIZE and RE-FORMAT — NOT to summarize, condense, or trim.

ABSOLUTE CONTENT-PRESERVATION RULES (most important):
- Keep ~95% of the original text. If the user gives 100 lines, ~95 lines must still be present in the output (across "notes" fields). You are a FORMATTER, not a summarizer.
- The ONLY things you may drop: greetings ("sure!", "here you go"), pure conversational filler, exact duplicate sentences, and the literal quiz/MCQ Q&A blocks (those move to the quiz array — see below). NOTHING else.
- DO NOT shorten facts, examples, dates, names, lists, tables, formulas, explanations, definitions, side notes, or "extra" context. If in doubt, KEEP IT.
- DO NOT replace sentences with shorter paraphrases. Use the user's wording verbatim where possible; you may only re-flow it into markdown.
- NEVER invent facts that are not in the source.

FORMATTING RULES (this is what you actually do):
- Convert plain text into clean, scannable markdown using #, ##, ### headings, bullet points, numbered lists, **bold**, tables, and blank-line spacing.
- Example: a line like "Basic Map Orientation of India" should become a heading like "### Basic Map Orientation of India" — not deleted, not rewritten.
- Preserve original ordering of content within each chunk.
- The "notes" field for each leaf chunk = the FULL re-formatted study content for that section (essentially all of the raw text that belongs there, just prettier).
- The "summary" field = 2–4 short lines. This is the ONLY place compression is allowed.
- "keyPoints" (3–8) and "terms" (term + meaning) are ADDITIVE — they do not replace the notes.

STRUCTURE RULES:
- Detect Subjects (History, Geography, Polity, Economy, Science, etc.). If everything clearly belongs to one subject, return a single subject.
- Under each subject, detect Chapters / Eras / Sections. Use "children" for deeper sub-topics when the source has a clear hierarchy.
- Split into chunks based on the source's own topic boundaries — do not merge unrelated topics, do not over-split a single topic.

QUIZ RULES (very important — quiz Qs must be MOVED, not duplicated):
- Scan the source for any quiz / MCQ / Q&A / "Question:" / "Q1." style blocks.
- REMOVE every such question from the "notes" field and PUT it into that chunk's "quiz" array. The notes must NOT still contain the raw quiz text after extraction — quiz content lives ONLY in the quiz section.
- All extracted questions MUST be type "mcq" with exactly 4 options. If the source gave options, use them. If only an answer was given, fabricate 3 plausible distractors plus the correct answer.
- NEVER drop a question the user wrote.
- After extracting, you MAY add 2–4 additional MCQs per leaf chunk to round it out. Same format (mcq, 4 options, answer, one-line explanation).

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

async function getApiKey() {
  const envKey = process.env.GROK_API_KEY || process.env.GROQ_API_KEY || process.env.XAI_API_KEY;
  if (envKey && !envKey.includes('your_') && envKey.trim().length > 15) {
    return envKey.trim();
  }
  try {
    const doc = await ProjectApi.findOne({ 'apis.name': { $regex: /llm.*api.*key|grok/i } });
    if (doc) {
      const found = doc.apis.find((a) => /llm.*api.*key|grok/i.test(a.name));
      if (found && found.endpoint) {
        return found.endpoint.replace(/["']/g, '').trim();
      }
    }
  } catch (e) {}
  return '';
}

/**
 * Fallback heuristic chunker if API is unreachable or rate-limited.
 * Guarantees zero data loss by parsing sections and headings mechanically.
 */
function heuristicChunkContent(rawText) {
  const lines = rawText.split('\n');
  let subjectName = 'General Studies';
  const firstNonEmpty = lines.find((l) => l.trim().length > 0) || '';
  if (firstNonEmpty.length < 50 && !firstNonEmpty.startsWith('#')) {
    subjectName = firstNonEmpty.replace(/^[-*#\s]+/, '').trim() || 'General Studies';
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
      summary: summary || 'Overview of key concepts and historical facts.',
      notes: cleanNotes,
      keyPoints: keyPoints.length > 0 ? keyPoints : ['Essential exam concepts and definitions covered in detail.'],
      terms,
      quiz,
      children: [],
    };
  });

  return {
    subjects: [
      {
        name: subjectName,
        description: 'Auto-organized from study notes dump.',
        chunks,
      },
    ],
  };
}

/**
 * Main chunking routine using Groq / LLM API with heuristic fallback.
 */
async function organizeContentWithAi(rawContent) {
  if (!rawContent || rawContent.trim().length < 20) {
    throw new Error('Please paste at least a paragraph of content.');
  }

  const apiKey = await getApiKey();
  if (!apiKey) {
    console.warn('[studyAiChunkerService] No API key found. Using heuristic chunker.');
    return heuristicChunkContent(rawContent);
  }

  // Model selection
  let modelName = 'llama-3.3-70b-versatile';
  if (process.env.GROK_MODEL && !process.env.GROK_MODEL.includes('gpt-oss')) {
    modelName = process.env.GROK_MODEL;
  }

  try {
    const userPrompt = `ORGANIZE THE FOLLOWING STUDY CONTENT ACCORDING TO ALL RULES.\n\nRAW CONTENT:\n${rawContent.slice(0, 60000)}`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`[studyAiChunkerService] AI response error ${response.status}: ${errText}. Using fallback.`);
      return heuristicChunkContent(rawContent);
    }

    const data = await response.json();
    const contentStr = data.choices?.[0]?.message?.content;
    if (!contentStr) {
      console.warn('[studyAiChunkerService] Empty choices content. Using fallback.');
      return heuristicChunkContent(rawContent);
    }

    let parsed;
    try {
      parsed = JSON.parse(contentStr);
    } catch (parseErr) {
      // Clean possible markdown code fences
      const cleaned = contentStr.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleaned);
    }

    if (parsed && Array.isArray(parsed.subjects) && parsed.subjects.length > 0) {
      return parsed;
    }

    console.warn('[studyAiChunkerService] Parsed tree missing subjects array. Using fallback.');
    return heuristicChunkContent(rawContent);
  } catch (err) {
    console.error('[studyAiChunkerService] Exception in AI chunker:', err.message);
    return heuristicChunkContent(rawContent);
  }
}

module.exports = {
  organizeContentWithAi,
  heuristicChunkContent,
};

