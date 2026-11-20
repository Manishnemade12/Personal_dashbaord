const { randomUUID } = require('crypto');
const ProjectApi = require('../models/portfolio/ProjectApi');
const { NQT_PROMPT_VERSION, NQT_SYSTEM_PROMPT, buildNqtUserPrompt } = require('../prompts/nqtQuizPrompt');

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const XAI_URL = 'https://api.x.ai/v1/chat/completions';
const ALLOWED_LABELS = ['A', 'B', 'C', 'D'];

async function resolveCredential() {
  for (const [name, value] of [
    ['GROK_API_KEY', process.env.GROK_API_KEY],
    ['GROQ_API_KEY', process.env.GROQ_API_KEY],
    ['XAI_API_KEY', process.env.XAI_API_KEY],
  ]) {
    if (value && value.trim().length > 15 && !value.includes('your_')) {
      return { key: value.trim(), source: name };
    }
  }

  try {
    const doc = await ProjectApi.findOne({ 'apis.name': { $regex: /grok|groq|xai|llm.*api.*key/i } }).lean();
    const saved = doc?.apis?.find((item) => /grok|groq|xai|llm.*api.*key/i.test(item.name));
    if (saved?.endpoint && saved.endpoint.replace(/["']/g, '').trim().length > 15) {
      return { key: saved.endpoint.replace(/["']/g, '').trim(), source: 'project-api-vault' };
    }
  } catch (_error) {
    // A missing optional vault record does not prevent environment-based generation.
  }
  return null;
}

function getProvider(key, source) {
  if (key.startsWith('xai-') || (source === 'XAI_API_KEY' && !key.startsWith('gsk_'))) return 'xai';
  if (key.startsWith('gsk_')) return 'groq';
  // Existing project services use the Groq-compatible endpoint for GROK_API_KEY.
  return 'groq';
}

function getModel(provider) {
  const configured = (process.env.GROK_MODEL || '').trim();
  if (provider === 'xai') {
    return configured && !/^(openai\/|llama|meta-llama|qwen)/i.test(configured)
      ? configured
      : 'grok-4.7';
  }
  return configured || 'openai/gpt-oss-120b';
}

function cleanJson(text) {
  const trimmed = String(text || '').trim();
  return trimmed.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
}

function parseResponse(text) {
  const parsed = JSON.parse(cleanJson(text));
  if (Array.isArray(parsed)) return parsed;
  return parsed?.questions;
}

function normalizeQuestion(question, index, { subjectById, topicById, difficulty }) {
  if (!question || typeof question !== 'object') return null;
  const subject = subjectById.get(String(question.subjectId || ''));
  const topic = topicById.get(String(question.topicId || ''));
  if (!subject || !topic || topic.subjectId !== subject.id) return null;
  const sourceOptions = Array.isArray(question.options) ? question.options : [];
  const options = sourceOptions.map((option, optionIndex) => {
    if (typeof option === 'string') return { label: ALLOWED_LABELS[optionIndex], text: option.trim() };
    return {
      label: String(option?.label || '').trim().toUpperCase(),
      text: String(option?.text || '').trim(),
    };
  });
  const answer = String(question.answer || '').trim().toUpperCase();
  const solution = question.solution && typeof question.solution === 'object' ? question.solution : {};
  const optionAnalysis = solution.optionAnalysis && typeof solution.optionAnalysis === 'object'
    ? solution.optionAnalysis
    : {};
  const steps = Array.isArray(solution.steps)
    ? solution.steps.map((step) => String(step || '').trim()).filter(Boolean).slice(0, 7)
    : [];
  const alternatives = Array.isArray(solution.alternatives)
    ? solution.alternatives.map((step) => String(step || '').trim()).filter(Boolean).slice(0, 3)
    : [];

  if (options.length !== 4 || options.some((item) => !item.label || !item.text)) return null;
  if (options.map((item) => item.label).join(',') !== 'A,B,C,D') return null;
  if (new Set(options.map((item) => item.text.toLowerCase())).size !== 4) return null;
  if (!ALLOWED_LABELS.includes(answer)) return null;
  if (steps.length < 2) return null;
  if (ALLOWED_LABELS.some((label) => !String(optionAnalysis[label] || '').trim())) return null;
  if (!String(question.prompt || '').trim() || !String(solution.overview || '').trim()) return null;
  if (!String(solution.shortcut || '').trim() || !String(solution.formula || '').trim()) return null;
  if (!String(solution.commonMistakes || '').trim()) return null;

  return {
    id: randomUUID(),
    subjectId: subject.id,
    subjectName: subject.name,
    section: subject.section,
    topicId: topic.id,
    topicName: topic.name,
    prompt: String(question.prompt).trim().slice(0, 2400),
    options,
    answer,
    difficulty,
    pattern: String(question.pattern || 'Original NQT-style practice').trim().slice(0, 240),
    estimatedSeconds: Math.max(30, Math.min(600, Number(question.estimatedSeconds) || 90)),
    importance: topic.importance,
    orderIndex: index,
    solution: {
      overview: String(solution.overview).trim().slice(0, 1400),
      steps: steps.map((step) => step.slice(0, 1000)),
      shortcut: String(solution.shortcut).trim().slice(0, 1000),
      formula: String(solution.formula).trim().slice(0, 500),
      alternatives: alternatives.map((item) => item.slice(0, 1000)),
      optionAnalysis: Object.fromEntries(ALLOWED_LABELS.map((label) => [label, String(optionAnalysis[label]).trim().slice(0, 500)])),
      commonMistakes: String(solution.commonMistakes).trim().slice(0, 700),
    },
  };
}

function validateQuestions(questions, expectedCount, catalog, targetMix) {
  const errors = [];
  if (!Array.isArray(questions)) return { errors: ['Response must contain a questions array.'] };
  if (questions.length !== expectedCount) errors.push(`Return exactly ${expectedCount} questions; received ${questions.length}.`);
  const subjectById = new Map(catalog.subjects.map((subject) => [subject.id, subject]));
  const topicById = new Map(catalog.topics.map((topic) => [topic.id, topic]));
  const seen = new Set();
  const normalized = [];
  questions.forEach((question, index) => {
    const item = normalizeQuestion(question, index, { subjectById, topicById, difficulty: catalog.difficulty });
    if (!item) {
      errors.push(`Question ${index + 1} is missing a required field, uses an invalid classification, or has invalid choices/solution.`);
      return;
    }
    const fingerprint = item.prompt.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    if (seen.has(fingerprint)) errors.push(`Question ${index + 1} duplicates another question in this set.`);
    seen.add(fingerprint);
    normalized.push(item);
  });
  if (targetMix && normalized.length === expectedCount) {
    const actual = new Map();
    for (const question of normalized) actual.set(question.subjectId, (actual.get(question.subjectId) || 0) + 1);
    for (const [subjectId, target] of Object.entries(targetMix)) {
      if ((actual.get(subjectId) || 0) !== target) {
        errors.push(`Subject ${subjectId} must have exactly ${target} questions; received ${actual.get(subjectId) || 0}.`);
      }
    }
  }
  return errors.length ? { errors } : { questions: normalized };
}

async function callProvider({ provider, model, key, messages, maxTokens, userId }) {
  const endpoint = provider === 'xai' ? XAI_URL : GROQ_URL;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 85000);
  const payload = {
    model,
    messages,
    temperature: 0.3,
    response_format: { type: 'json_object' },
    user: String(userId || 'admin').slice(0, 64),
    ...(provider === 'groq'
      ? { max_completion_tokens: maxTokens, reasoning_effort: 'medium' }
      : { max_tokens: maxTokens }),
  };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = body?.error?.message || body?.error || `Provider returned ${response.status}`;
      const error = new Error(`Question generation provider error (${response.status}): ${String(message).slice(0, 400)}`);
      error.status = response.status;
      throw error;
    }
    const content = body?.choices?.[0]?.message?.content;
    if (!content) throw new Error('Question generation provider returned an empty response.');
    return { content, provider, model: body.model || model, usage: body.usage || null };
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('Question generation timed out. Please request a smaller quiz and retry.');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function generateNqtQuestions({ config, topics, subjects, adaptation, recentQuestions, patternProfile, targetMix, userId }) {
  const credential = await resolveCredential();
  if (!credential) {
    const error = new Error('No Groq/Grok API key is configured. Add GROK_API_KEY, GROQ_API_KEY or XAI_API_KEY on the backend.');
    error.status = 503;
    throw error;
  }
  const provider = getProvider(credential.key, credential.source);
  const model = getModel(provider);
  const userPrompt = buildNqtUserPrompt({ config, topics, adaptation, recentQuestions, patternProfile, targetMix });
  const maxTokens = config.questionCount >= 30 ? 24000 : config.questionCount >= 15 ? 15000 : 9000;
  const messages = [
    { role: 'system', content: NQT_SYSTEM_PROMPT },
    { role: 'user', content: userPrompt },
  ];

  let providerResult = await callProvider({ provider, model, key: credential.key, messages, maxTokens, userId });
  let rawQuestions;
  let parseIssue = null;
  try {
    rawQuestions = parseResponse(providerResult.content);
  } catch (_error) {
    parseIssue = 'The output was not valid JSON. Return one valid JSON object only.';
  }

  const catalog = { subjects, topics, difficulty: config.difficulty };
  let validation = parseIssue
    ? { errors: [parseIssue] }
    : validateQuestions(rawQuestions, config.questionCount, catalog, targetMix);

  if (!validation.errors) {
    return {
      questions: validation.questions,
      provider: providerResult.provider,
      model: providerResult.model,
      usage: providerResult.usage,
      promptVersion: NQT_PROMPT_VERSION,
    };
  }

  const repairMessages = [
    ...messages,
    { role: 'assistant', content: providerResult.content.slice(0, 30000) },
    {
      role: 'user',
      content: `Repair the previous response. Validation errors: ${validation.errors.join(' ')}. Return the complete corrected JSON object with exactly ${config.questionCount} valid questions. Recheck all arithmetic, options, classifications, and solution fields.`,
    },
  ];
  providerResult = await callProvider({ provider, model, key: credential.key, messages: repairMessages, maxTokens, userId });
  try {
    rawQuestions = parseResponse(providerResult.content);
  } catch (_error) {
    throw new Error('The AI returned invalid JSON twice. Please retry quiz generation.');
  }
  validation = validateQuestions(rawQuestions, config.questionCount, catalog, targetMix);
  if (validation.errors) {
    throw new Error(`The AI response did not meet the quiz format after repair: ${validation.errors.slice(0, 3).join(' ')}`);
  }

  return {
    questions: validation.questions,
    provider: providerResult.provider,
    model: providerResult.model,
    usage: providerResult.usage,
    promptVersion: NQT_PROMPT_VERSION,
  };
}

module.exports = { generateNqtQuestions };
