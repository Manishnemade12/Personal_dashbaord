const ProjectApi = require('../models/portfolio/ProjectApi');

function getUniversalQuizPrompt(fieldOrContext = 'Academic & Professional Studies', customInstruction = '') {
  return `You are an expert quiz generator specialized in ${fieldOrContext}. Generate high-yield Multiple Choice Questions (MCQs) strictly grounded in the provided study notes.

${customInstruction ? `USER CUSTOM INSTRUCTIONS:\n${customInstruction}\n` : ''}

Rules:
- All questions MUST be type "mcq" with exactly 4 options.
- Mix conceptual + factual questions appropriate for ${fieldOrContext}.
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
 * Fallback generator if LLM is unavailable or key is unconfigured.
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
      explanation: 'The notes provide foundational facts and clear definitions.',
    });
  }

  return questions;
}

/**
 * Main quiz generation method.
 */
async function generateQuizFromNotes(notes, options = {}) {
  const { difficulty = 'medium', count = 10, fieldName = 'General Studies', customPrompt = '', apiKey: userKey = null } = options;

  if (!notes || notes.trim().length < 20) {
    return heuristicGenerateQuiz(notes || '', count);
  }

  const apiKey = await getApiKey(userKey);
  if (!apiKey) {
    console.warn('[studyAiQuizService] No API key found. Using heuristic generator.');
    return heuristicGenerateQuiz(notes, count);
  }

  let modelName = 'llama-3.3-70b-versatile';
  if (process.env.GROK_MODEL && !process.env.GROK_MODEL.includes('gpt-oss')) {
    modelName = process.env.GROK_MODEL;
  }

  const systemPrompt = getUniversalQuizPrompt(fieldName, customPrompt);

  try {
    const userPrompt = `GENERATE EXACTLY ${count} MCQs FROM THE FOLLOWING STUDY NOTES (Difficulty: ${difficulty.toUpperCase()}, Domain: ${fieldName}).\n\nNOTES:\n${notes.slice(0, 40000)}`;

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
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      console.warn(`[studyAiQuizService] AI response error ${response.status}. Using heuristic fallback.`);
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
      return parsed.questions;
    }

    return heuristicGenerateQuiz(notes, count);
  } catch (err) {
    console.error('[studyAiQuizService] Exception in quiz generator:', err.message);
    return heuristicGenerateQuiz(notes, count);
  }
}

module.exports = {
  getUniversalQuizPrompt,
  generateQuizFromNotes,
  heuristicGenerateQuiz,
};
