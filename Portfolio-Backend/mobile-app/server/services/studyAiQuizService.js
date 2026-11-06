const ProjectApi = require('../models/portfolio/ProjectApi');

const SYSTEM_PROMPT = `You are an expert SSC exam quiz generator. Generate high-yield Multiple Choice Questions (MCQs) strictly grounded in the provided study notes.

Rules:
- All questions MUST be type "mcq" with exactly 4 options.
- Mix conceptual + factual questions appropriate for competitive SSC exams.
- Difficulty levels:
  - easy: direct recall from notes.
  - medium: requires understanding / mild inference.
  - hard: tricky distractors, multi-step reasoning, fine details.
- Always include an explanation (1-2 sentences explaining why the answer is correct).
- Never invent facts not grounded in notes.

OUTPUT FORMAT:
Respond ONLY with a valid JSON object matching this structure:
{
  "questions": [
    {
      "question": "Which of the following is correct?",
      "type": "mcq",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answer": "Option A",
      "explanation": "Explanation here."
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
 * Fallback generator if LLM is unavailable.
 */
function heuristicGenerateQuiz(notes, count = 5) {
  const lines = notes
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 25 && !l.startsWith('#') && !l.startsWith('http'));

  const questions = [];
  const selectedLines = lines.slice(0, Math.min(count * 2, lines.length));

  for (let i = 0; i < selectedLines.length && questions.length < count; i++) {
    const text = selectedLines[i].replace(/^[-*•\d.]+\s*/, '').trim();
    const words = text.split(' ');
    if (words.length < 5) continue;

    // Pick a key term/word to test
    const targetWord = words[Math.floor(words.length / 2)].replace(/[^a-zA-Z0-9]/g, '');
    if (targetWord.length < 4) continue;

    const blanked = text.replace(new RegExp(`\\b${targetWord}\\b`, 'i'), '_______');

    questions.push({
      question: `Complete the statement: "${blanked}"`,
      type: 'mcq',
      options: [
        targetWord,
        `${targetWord} (Alternative)`,
        `Not ${targetWord}`,
        `None of the above`,
      ],
      answer: targetWord,
      explanation: `According to the notes: "${text}"`,
    });
  }

  // If still empty, add default conceptual questions
  if (questions.length === 0) {
    questions.push({
      question: 'Which of the following best reflects the key principle covered in these study notes?',
      type: 'mcq',
      options: [
        'Detailed analysis and factual recall',
        'Hypothetical assumptions',
        'Contradictory findings',
        'Unverified theories',
      ],
      answer: 'Detailed analysis and factual recall',
      explanation: 'The notes provide foundational facts and exam-oriented definitions.',
    });
  }

  return questions;
}

/**
 * Generate MCQs from notes using AI.
 */
async function generateQuizFromNotes(notes, difficulty = 'medium', count = 10) {
  if (!notes || notes.trim().length < 20) {
    throw new Error('Not enough study notes to generate a quiz.');
  }

  const apiKey = await getApiKey();
  if (!apiKey) {
    return heuristicGenerateQuiz(notes, count);
  }

  let modelName = 'llama-3.3-70b-versatile';
  if (process.env.GROK_MODEL && !process.env.GROK_MODEL.includes('gpt-oss')) {
    modelName = process.env.GROK_MODEL;
  }

  try {
    const userPrompt = `Generate exactly ${count} SSC MCQ questions at ${difficulty} difficulty from the notes below.\n\nNOTES:\n${notes.slice(0, 45000)}`;

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
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      console.warn(`[studyAiQuizService] AI response status ${response.status}. Using fallback.`);
      return heuristicGenerateQuiz(notes, count);
    }

    const data = await response.json();
    const contentStr = data.choices?.[0]?.message?.content;
    if (!contentStr) {
      return heuristicGenerateQuiz(notes, count);
    }

    let parsed;
    try {
      parsed = JSON.parse(contentStr);
    } catch (parseErr) {
      const cleaned = contentStr.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleaned);
    }

    if (parsed && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
      // Validate each question has 4 options
      return parsed.questions.map((q) => {
        const opts = Array.isArray(q.options) ? [...q.options] : [];
        while (opts.length < 4) {
          opts.push(`Option ${String.fromCharCode(65 + opts.length)}`);
        }
        return {
          question: q.question,
          type: 'mcq',
          options: opts.slice(0, 4),
          answer: q.answer || opts[0],
          explanation: q.explanation || 'Verified from study notes.',
        };
      });
    }

    return heuristicGenerateQuiz(notes, count);
  } catch (err) {
    console.error('[studyAiQuizService] Exception in quiz generation:', err.message);
    return heuristicGenerateQuiz(notes, count);
  }
}

module.exports = {
  generateQuizFromNotes,
  heuristicGenerateQuiz,
};

