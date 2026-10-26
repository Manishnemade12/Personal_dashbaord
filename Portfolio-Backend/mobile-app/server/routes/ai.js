const express = require('express');
const router = express.Router();
const Prof = require('../models/portfolio/Prof');
const Project = require('../models/portfolio/Project');
const Skills = require('../models/portfolio/Skills');
const Education = require('../models/portfolio/Education');
const ProjectApi = require('../models/portfolio/ProjectApi');
const AiColdEmailConversation = require('../models/AiColdEmailConversation');

const GROQ_MODEL = process.env.GROK_MODEL || 'openai/gpt-oss-120b';

/**
 * Helper: Retrieve API key dynamically from environment or ProjectApi vault
 */
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
 * Fallback: Call OCR.space API
 */
async function performOcrSpace(imageSource, fileType = '') {
  try {
    const apiUrl = 'https://api.ocr.space/parse/image';
    const formData = new URLSearchParams();
    const apiKey = process.env.OCR_SPACE_API_KEY || 'helloworld';
    formData.append('apikey', apiKey);
    formData.append('language', 'eng');
    formData.append('isOverlayRequired', 'false');
    formData.append('detectOrientation', 'true');
    formData.append('scale', 'true');

    const isPdf =
      fileType?.toLowerCase() === 'pdf' ||
      (typeof imageSource === 'string' && /\.pdf(\?|$)/i.test(imageSource));

    if (isPdf) {
      formData.append('filetype', 'PDF');
    }

    if (typeof imageSource === 'string' && (imageSource.startsWith('http://') || imageSource.startsWith('https://'))) {
      formData.append('url', imageSource);
    } else {
      let base64Clean = imageSource;
      if (!base64Clean.startsWith('data:')) {
        const mime = isPdf ? 'application/pdf' : 'image/jpeg';
        base64Clean = `data:${mime};base64,${base64Clean}`;
      }
      formData.append('base64Image', base64Clean);
    }

    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    });

    const data = await res.json();
    let parsedText = '';
    if (Array.isArray(data?.ParsedResults) && data.ParsedResults.length > 0) {
      parsedText = data.ParsedResults.map((p) => p.ParsedText || '')
        .filter(Boolean)
        .join('\n\n')
        .trim();
    }
    return parsedText;
  } catch (err) {
    console.warn('[OCR.space Warning]', err.message);
    return '';
  }
}

/**
 * High-Performance Local Text Extraction (pdf-parse for digital PDFs, Tesseract for images)
 */
async function extractTextFromFile(imageSource, fileType = '', fileName = '') {
  if (!imageSource) return '';

  let buffer = null;
  const isPdf =
    fileType?.toLowerCase() === 'pdf' ||
    fileName?.toLowerCase().endsWith('.pdf') ||
    (typeof imageSource === 'string' && /\.pdf(\?|$)/i.test(imageSource)) ||
    (typeof imageSource === 'string' && imageSource.startsWith('data:application/pdf'));

  // 1. Convert source to Buffer
  if (Buffer.isBuffer(imageSource)) {
    buffer = imageSource;
  } else if (typeof imageSource === 'string') {
    if (imageSource.startsWith('http://') || imageSource.startsWith('https://')) {
      try {
        const res = await fetch(imageSource);
        if (res.ok) {
          const arrBuf = await res.arrayBuffer();
          buffer = Buffer.from(arrBuf);
        }
      } catch (e) {
        console.warn('[Fetch Source Error]', e.message);
      }
    } else {
      let cleanBase64 = imageSource;
      if (cleanBase64.includes(',')) {
        cleanBase64 = cleanBase64.split(',')[1];
      }
      try {
        buffer = Buffer.from(cleanBase64, 'base64');
      } catch (e) {}
    }
  }

  // Check magic bytes for PDF (%PDF)
  const isBufferPdf = buffer && buffer.length > 4 && buffer.toString('utf8', 0, 4) === '%PDF';

  // 2. If PDF, run local pdf-parse (Instant digital extraction)
  if ((isPdf || isBufferPdf) && buffer) {
    try {
      console.log(`[OCR/PDF] Running local pdf-parse on ${buffer.length} bytes...`);
      const pdfLib = require('pdf-parse');
      let extracted = '';
      if (typeof pdfLib === 'function') {
        const data = await pdfLib(buffer);
        extracted = data?.text || '';
      } else if (pdfLib.PDFParse) {
        const parser = new pdfLib.PDFParse({ data: buffer });
        const res = await parser.getText();
        extracted = typeof res === 'string' ? res : (res?.text || '');
      }
      extracted = (extracted || '').replace(/--\s*\d+\s+of\s+\d+\s*--/gi, '').trim();
      if (extracted.length > 20) {
        console.log(`[OCR/PDF] Extracted ${extracted.split(/\s+/).length} words via pdf-parse.`);
        return extracted;
      }
    } catch (err) {
      console.warn('[OCR/PDF Extract Warning]', err.message);
    }
  }

  // 3. If Image, run local Tesseract OCR
  if (buffer) {
    try {
      console.log(`[OCR/Tesseract] Running local Tesseract OCR on ${buffer.length} bytes...`);
      const { createWorker } = require('tesseract.js');
      const worker = await createWorker('eng');
      const ret = await worker.recognize(buffer);
      await worker.terminate();
      const ocrText = (ret?.data?.text || '').trim();
      if (ocrText.length > 15) {
        console.log(`[OCR/Tesseract] Extracted ${ocrText.split(/\s+/).length} words via Tesseract.`);
        return ocrText;
      }
    } catch (tessErr) {
      console.warn('[OCR/Tesseract Warning]', tessErr.message);
    }
  }

  // 4. Fallback to OCR.space API
  const fallbackText = await performOcrSpace(imageSource, isPdf ? 'pdf' : 'image');
  return fallbackText;
}

/**
 * Helper: Call Groq / Grok LLM with retry / fallback
 */
async function callGrokLlm(prompt, model = GROQ_MODEL) {
  const apiKey = await getApiKey();
  if (!apiKey) {
    throw new Error('No Grok/LLM API key found in .env or ProjectApi vault.');
  }

  const payload = {
    model: model,
    messages: [
      {
        role: 'system',
        content:
          'You are an elite, modern tech professional writing authentic, high-impact cold emails. You write like a genuine human software engineer communicating with engineering managers, founders, and technical recruiters. You NEVER use generic AI buzzwords or robotic clichés.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.35,
  };

  let res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey.trim()}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok && model !== 'llama-3.3-70b-versatile') {
    payload.model = 'llama-3.3-70b-versatile';
    res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify(payload),
    });
  }

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`LLM API returned ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const rawContent = data?.choices?.[0]?.message?.content || '';

  let cleanJson = rawContent.trim();
  if (cleanJson.startsWith('```json')) {
    cleanJson = cleanJson.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
  } else if (cleanJson.startsWith('```')) {
    cleanJson = cleanJson.replace(/^```\s*/, '').replace(/```\s*$/, '').trim();
  }

  return JSON.parse(cleanJson);
}

/**
 * Candidate Real Data Aggregator:
 * Loads portfolio DB models + active conversation resume or master resume.
 */
async function getCandidateFullContext(conversationResume = '') {
  let candidate = {
    name: 'Manish Nemade',
    profession: 'FullStack Developer',
    description: 'Software Developer building scalable web applications with React, Next.js, Node.js & modern databases.',
    email: 'manishnemade7@gmail.com',
    phone: '+91 9284308812',
    portfolio: 'https://manish-portfolio-6mbj.vercel.app/',
    github: 'https://github.com/Manishnemade12',
    linkedin: 'https://linkedin.com/in/Manish-Nemade',
    projects: [],
    skills: [],
    education: '',
    resumeText: (conversationResume || '').trim(),
  };

  try {
    const prof = await Prof.findOne().sort({ updatedAt: -1 });
    if (prof) {
      candidate.name = prof.name || candidate.name;
      candidate.email = prof.email || candidate.email;
      candidate.profession = prof.profession?.trim() || candidate.profession;
      candidate.description = prof.description || candidate.description;
    }
  } catch (e) {}

  try {
    const dbProjects = await Project.find().sort({ updatedAt: -1 });
    if (Array.isArray(dbProjects) && dbProjects.length > 0) {
      candidate.projects = dbProjects.map((p) => ({
        title: p.title || p.name,
        description: p.description || '',
        tech: Array.isArray(p.tech) ? p.tech.join(', ') : '',
        liveUrl: p.liveUrl || p.link || '',
      }));
    }
  } catch (e) {}

  try {
    const dbSkills = await Skills.find();
    if (Array.isArray(dbSkills) && dbSkills.length > 0) {
      candidate.skills = dbSkills.map((s) => s.title?.trim()).filter(Boolean);
    }
  } catch (e) {}

  try {
    const eduDoc = await Education.findOne().sort({ updatedAt: -1 });
    if (eduDoc?.education?.length > 0) {
      candidate.education = eduDoc.education
        .filter((e) => e.school)
        .map((e) => `${e.school} (${e.year || ''}) - ${e.educationDescription || ''}`)
        .join('; ');
    }
  } catch (e) {}

  // If no resume in active conversation, check if another conversation has a master resume
  if (!candidate.resumeText || candidate.resumeText.length < 50) {
    try {
      const masterConvo = await AiColdEmailConversation.findOne({
        userId: 'admin',
        resumeWordCount: { $gt: 50 },
      }).sort({ updatedAt: -1 });
      if (masterConvo?.resumeText) {
        candidate.resumeText = masterConvo.resumeText.trim();
        console.log(`[AI Candidate] Linked master resume from "${masterConvo.resumeFileName || masterConvo.title}" (${masterConvo.resumeWordCount} words)`);
      }
    } catch (e) {}
  }

  return candidate;
}

/**
 * Intelligent Dynamic Non-AI Cold Email Generator:
 * Generates human, punchy, un-flagged emails directly from candidate's authentic resume!
 */
function generateDynamicHumanColdEmail({ candidate, targetCompany, targetRole, targetRecipient, finalJdText, tone }) {
  const companyName = targetCompany || 'your team';
  const roleName = targetRole || 'Software Engineer';
  const resume = candidate.resumeText || '';
  const jdLower = (finalJdText + ' ' + roleName + ' ' + companyName).toLowerCase();

  // 1. Detect matching technologies & projects from candidate's authentic background
  const proofBullets = [];
  const highlights = [];

  // Melsta Studio Work Experience
  if (/melsta/i.test(resume) || /react|next|frontend|typescript|fullstack|sde/i.test(jdLower)) {
    proofBullets.push(
      'Software Developer Intern at Melsta Studio: Built scalable admin services and config-driven form validation with React, TypeScript & Next.js, contributing 26% of codebase updates across core platform workflows.'
    );
    highlights.push('Ex-SDE Intern @ Melsta Studio (React, Next.js, TypeScript)');
  }

  // Lumen AI (RAG / AI / Vector Retrieval)
  if (/lumen|rag|ai|llm|grok|vector|retrieval|python|search/i.test(jdLower) || /lumen/i.test(resume)) {
    proofBullets.push(
      'Lumen AI (RAG Knowledge Engine): Built an end-to-end PDF ingestion pipeline with overlap-based window chunking, cosine-similarity vector retrieval, and LLM grounding for hallucination-free querying.'
    );
    highlights.push('Built Lumen AI – RAG pipeline with vector retrieval & Grok LLM');
  }

  // FinanceAI (PostgreSQL, APIs, Security)
  if (/finance|tax|sql|postgres|backend|database|security|jwt/i.test(jdLower) || /financeai/i.test(resume)) {
    proofBullets.push(
      'FinanceAI (Tax & Document Engine): Engineered high-throughput financial data parsing pipelines in PostgreSQL and secured 15+ REST endpoints with JWT role-based access control.'
    );
    highlights.push('Built FinanceAI – Document processing & secure PostgreSQL services');
  }

  // Open Source (CHT Core / Medic / Meshery)
  if (/open source|medic|cht|meshery|layer5|git|collaboration/i.test(jdLower) || /cht core/i.test(resume)) {
    proofBullets.push(
      'Open-Source Contributor (CHT Core / Medic): Resolved critical production crashes in healthcare messaging microservices by implementing defensive data validations backed by regression unit tests.'
    );
    highlights.push('Open-source contributor with production bug fixes');
  }

  // Problem Solving / DSA / Codeforces
  if (/dsa|algorithm|problem solving|competitive|codeforces/i.test(jdLower) || proofBullets.length < 2) {
    proofBullets.push(
      'Core Problem Solving: 300+ DSA problems solved across LeetCode & Codeforces (Div 3 rank 518, 1348 rating), with clean system design and optimized time/space complexity.'
    );
    highlights.push('Strong algorithmic foundation: 300+ DSA problems solved');
  }

  // Fallback to DB projects if proof bullets are still short
  if (proofBullets.length < 2 && candidate.projects.length > 0) {
    const p1 = candidate.projects[0];
    proofBullets.push(
      `${p1.title}: Built responsive full-stack service with dynamic database control and clean RESTful API integration.`
    );
    highlights.push(`Built ${p1.title} with database integration`);
  }

  // 2. Select top 2-3 bullets
  const selectedBullets = proofBullets.slice(0, 3);

  // 3. Craft Human Email Body (Natural formatting, non-AI structure, dashes)
  let openingHook = '';
  if (tone === 'concise') {
    openingHook = `Saw the ${roleName} opening at ${companyName} and wanted to reach out directly. Given your stack, thought my background shipping production web features would be relevant.`;
  } else if (tone === 'referral') {
    openingHook = `Reaching out as a fellow builder following ${companyName}'s engineering work. I noticed you're looking for a ${roleName} and wanted to share a quick overview of what I've been shipping.`;
  } else {
    openingHook = `I came across the ${roleName} opening at ${companyName} and wanted to reach out directly. Given your engineering focus, I thought my background shipping high-performance full-stack services would be a strong match.`;
  }

  const bulletText = selectedBullets.map((b) => `-- ${b}`).join('\n\n');

  const emailBody = `Hi ${targetCompany ? targetCompany + ' team' : 'Hiring Team'},

${openingHook}

A quick snapshot of my recent work:

${bulletText}

Live projects & portfolio:
${candidate.portfolio}
GitHub: ${candidate.github}

Would you be open to a quick 10-minute sync this week? Happy to walk through any live demos or code repositories.

-- 
${candidate.name}
${candidate.profession}
${candidate.phone} | ${candidate.email}
${candidate.portfolio}`;

  // Subject line (crisp, professional, direct)
  const subject = `${roleName} – ${candidate.name} | FullStack & System Experience`;

  return {
    subject,
    recipient: targetRecipient || '',
    company: targetCompany || '',
    role: targetRole || '',
    emailBody,
    keyHighlights: highlights.slice(0, 3),
  };
}

// =========================================================================
// CONVERSATION MANAGEMENT ROUTES (/api/ai/conversations)
// =========================================================================

// 1. GET /api/ai/conversations - List all conversations for the user
router.get('/conversations', async (req, res) => {
  try {
    const conversations = await AiColdEmailConversation.find({ userId: 'admin' })
      .sort({ updatedAt: -1 })
      .select('-resumeText -emails.emailBody -emails.jdText')
      .lean();

    const result = conversations.map((c) => ({
      _id: c._id,
      title: c.title || 'New Application',
      hasResume: !!(c.resumeWordCount > 0 || c.resumeFileName),
      resumeFileName: c.resumeFileName || '',
      resumeWordCount: c.resumeWordCount || 0,
      resumeUploadedAt: c.resumeUploadedAt,
      emailCount: Array.isArray(c.emails) ? c.emails.length : 0,
      targetCompany: c.targetCompany || '',
      targetRole: c.targetRole || '',
      recipient: c.recipient || '',
      preferredTone: c.preferredTone || 'pitch',
      updatedAt: c.updatedAt,
      createdAt: c.createdAt,
    }));

    res.json({ success: true, conversations: result });
  } catch (err) {
    console.error('[Get Conversations Error]', err);
    res.status(500).json({ error: err.message || 'Failed to fetch conversations.' });
  }
});

// 2. POST /api/ai/conversations - Create a new conversation session
router.post('/conversations', async (req, res) => {
  try {
    const {
      title,
      resumeText = '',
      resumeFileName = '',
      resumeFileUrl = '',
      targetCompany = '',
      targetRole = '',
      recipient = '',
      preferredTone = 'pitch',
    } = req.body;

    const count = await AiColdEmailConversation.countDocuments({ userId: 'admin' });
    const defaultTitle = title && title.trim() ? title.trim() : `Application #${count + 1}`;

    const wordCount = resumeText
      ? resumeText.trim().split(/\s+/).filter(Boolean).length
      : 0;

    const conversation = new AiColdEmailConversation({
      userId: 'admin',
      title: defaultTitle,
      resumeText: resumeText.trim(),
      resumeFileName: resumeFileName.trim(),
      resumeFileUrl: resumeFileUrl.trim(),
      resumeWordCount: wordCount,
      resumeUploadedAt: resumeText ? new Date() : undefined,
      targetCompany: targetCompany.trim(),
      targetRole: targetRole.trim(),
      recipient: recipient.trim(),
      preferredTone,
      emails: [],
    });

    await conversation.save();
    res.status(201).json({ success: true, conversation });
  } catch (err) {
    console.error('[Create Conversation Error]', err);
    res.status(500).json({ error: err.message || 'Failed to create conversation.' });
  }
});

// 3. GET /api/ai/conversations/:id - Get full conversation with resume text & emails
router.get('/conversations/:id', async (req, res) => {
  try {
    const conversation = await AiColdEmailConversation.findById(req.params.id);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found.' });
    }
    res.json({ success: true, conversation });
  } catch (err) {
    console.error('[Get Conversation Detail Error]', err);
    res.status(500).json({ error: err.message || 'Failed to retrieve conversation.' });
  }
});

// 4. PUT /api/ai/conversations/:id - Update conversation metadata
router.put('/conversations/:id', async (req, res) => {
  try {
    const { title, targetCompany, targetRole, recipient, preferredTone, jdText, jdImageUrl } =
      req.body;

    const conversation = await AiColdEmailConversation.findById(req.params.id);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found.' });
    }

    if (title !== undefined) conversation.title = title.trim();
    if (targetCompany !== undefined) conversation.targetCompany = targetCompany.trim();
    if (targetRole !== undefined) conversation.targetRole = targetRole.trim();
    if (recipient !== undefined) conversation.recipient = recipient.trim();
    if (preferredTone !== undefined) conversation.preferredTone = preferredTone;
    if (jdText !== undefined) conversation.jdText = jdText;
    if (jdImageUrl !== undefined) conversation.jdImageUrl = jdImageUrl;

    await conversation.save();
    res.json({ success: true, conversation });
  } catch (err) {
    console.error('[Update Conversation Error]', err);
    res.status(500).json({ error: err.message || 'Failed to update conversation.' });
  }
});

// 5. PUT /api/ai/conversations/:id/resume - Upload/Update resume text for this conversation
router.put('/conversations/:id/resume', async (req, res) => {
  try {
    const { resumeText = '', resumeFileName = '', resumeFileUrl = '' } = req.body;

    const conversation = await AiColdEmailConversation.findById(req.params.id);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found.' });
    }

    const cleanText = (resumeText || '').trim();
    const wordCount = cleanText ? cleanText.split(/\s+/).filter(Boolean).length : 0;

    conversation.resumeText = cleanText;
    conversation.resumeFileName = (resumeFileName || '').trim();
    conversation.resumeFileUrl = (resumeFileUrl || '').trim();
    conversation.resumeWordCount = wordCount;
    conversation.resumeUploadedAt = cleanText ? new Date() : null;

    await conversation.save();
    res.json({
      success: true,
      message: 'Resume saved to conversation successfully.',
      conversation,
    });
  } catch (err) {
    console.error('[Save Resume Error]', err);
    res.status(500).json({ error: err.message || 'Failed to save resume.' });
  }
});

// 6. DELETE /api/ai/conversations/:id - Delete a conversation session
router.delete('/conversations/:id', async (req, res) => {
  try {
    const conversation = await AiColdEmailConversation.findByIdAndDelete(req.params.id);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found.' });
    }
    res.json({ success: true, message: 'Conversation deleted.' });
  } catch (err) {
    console.error('[Delete Conversation Error]', err);
    res.status(500).json({ error: err.message || 'Failed to delete conversation.' });
  }
});

// 7. DELETE /api/ai/conversations/:id/emails/:emailId - Delete a specific generated email draft
router.delete('/conversations/:id/emails/:emailId', async (req, res) => {
  try {
    const { id, emailId } = req.params;
    const conversation = await AiColdEmailConversation.findById(id);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found.' });
    }

    const initialLength = conversation.emails.length;
    conversation.emails = conversation.emails.filter(
      (e) => e._id.toString() !== emailId && String(e._id) !== emailId
    );

    if (conversation.emails.length === initialLength) {
      return res.status(404).json({ error: 'Draft not found in this conversation.' });
    }

    await conversation.save();
    res.json({
      success: true,
      message: 'Email draft deleted successfully.',
      conversation,
    });
  } catch (err) {
    console.error('[Delete Draft Error]', err);
    res.status(500).json({ error: err.message || 'Failed to delete draft.' });
  }
});

// 8. POST /api/ai/conversations/:id/generate - Generate cold email from resume context!
router.post('/conversations/:id/generate', async (req, res) => {
  try {
    const conversation = await AiColdEmailConversation.findById(req.params.id);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found.' });
    }

    const {
      jobDescription = '',
      image = '',
      company = '',
      role = '',
      recipient = '',
      tone = 'pitch',
    } = req.body;

    let finalJdText = (jobDescription || '').trim();

    // If an image screenshot is provided, extract its text via OCR
    if (image && (!finalJdText || finalJdText.length < 20)) {
      const ocrText = await extractTextFromFile(image, 'image');
      if (ocrText) {
        finalJdText = ocrText;
      }
    }

    if (!finalJdText && !role && !company) {
      return res.status(400).json({
        error: 'Please provide either a job description, job screenshot, or role name.',
      });
    }

    // Load full candidate context (active resume + DB portfolio data)
    const candidate = await getCandidateFullContext(conversation.resumeText);

    const targetCompany = company.trim() || conversation.targetCompany || '';
    const targetRole = role.trim() || conversation.targetRole || '';
    const targetRecipient = recipient.trim() || conversation.recipient || '';
    const chosenTone = tone || conversation.preferredTone || 'pitch';

    // Tone style instructions
    const toneInstructions = {
      pitch: 'Direct, punchy, high-impact pitch focusing on shipping fast and engineering execution.',
      professional: 'Polite, structured corporate application highlighting engineering excellence and teamwork.',
      concise: 'Short & snappy (strictly under 120 words). Fast read for busy founders and CTOs.',
      referral: 'Warm, conversational, network outreach as a fellow builder reaching out to a peer.',
    };

    const toneGuide = toneInstructions[chosenTone] || toneInstructions.pitch;

    // Strict Anti-AI Flagging Prompt
    const prompt = `You are a real human software developer drafting an authentic cold outreach email for a job opening.

CANDIDATE AUTHENTIC RESUME / PORTFOLIO:
- Full Name: ${candidate.name}
- Current Profession: ${candidate.profession}
- Email: ${candidate.email}
- Phone: ${candidate.phone}
- Portfolio: ${candidate.portfolio}
- GitHub: ${candidate.github}

EXACT CANDIDATE RESUME TEXT (USE SPECIFIC FACTS, METRICS & TOOLS FROM HERE ONLY):
"""
${
  candidate.resumeText
    ? candidate.resumeText
    : `Candidate Skills: ${candidate.skills.join(', ') || 'React, Next.js, Node.js, Express, MongoDB, PostgreSQL, TypeScript, Docker, CI/CD'}.
Projects: ${candidate.projects.map((p) => `${p.title}: ${p.description}`).join(' | ') || 'Lumen AI, FinanceAI, Melsta Studio intern'}.
Education: ${candidate.education || 'B.Tech CSE, G H Raisoni College'}.`
}
"""

TARGET APPLICATION:
- Target Company: "${targetCompany || 'Target Company'}"
- Target Role: "${targetRole || 'Software Engineer'}"
- Recruiter Email: "${targetRecipient}"
- Job Description / Requirements:
"""
${finalJdText || `Role: ${targetRole || 'Full Stack Developer'} at ${targetCompany || 'your company'}`}
"""

TONE: ${toneGuide}

CRITICAL ANTI-AI DETECTION & HUMAN WRITING RULES:
1. NEVER use AI clichés like:
   - "I hope this email finds you well"
   - "I am writing to express my enthusiastic interest in..."
   - "In today's fast-paced digital world..."
   - "My unique blend of skills makes me the ideal candidate..."
   - "Please find my resume attached for your kind perusal"
2. Start directly with a natural human salutation (e.g. "Hi [Company] team," or "Hi [Hiring Manager],").
3. Use a clear, direct hook explaining why you are reaching out for this specific position.
4. Highlight 2-3 specific bullet points formatted with "-- " dashes citing candidate's REAL achievements, numbers, and tools from their resume (e.g. Lumen AI, Melsta Studio, FinanceAI, Codeforces rating, open-source fixes).
5. Include the candidate portfolio URL (${candidate.portfolio}).
6. Propose a brief, low-friction call (e.g. "Would you be open to a quick 10-minute sync this week?").
7. End with a human signature separator "-- " followed by candidate name, contact, and links.

Return ONLY pure JSON matching this exact structure:
{
  "subject": "string",
  "recipient": "string",
  "company": "string",
  "role": "string",
  "emailBody": "string",
  "keyHighlights": ["string", "string"]
}
Do not wrap in markdown fences. Output raw JSON only.`;

    let generated;
    try {
      generated = await callGrokLlm(prompt);
      // Validate generated structure
      if (!generated?.emailBody || generated.emailBody.length < 50) {
        throw new Error('LLM output lacked valid body');
      }
    } catch (llmErr) {
      console.warn('Grok LLM call unavailable or failed, generating dynamic contextual match:', llmErr.message);
      // Dynamic Contextual Generator using authentic resume & DB facts!
      generated = generateDynamicHumanColdEmail({
        candidate,
        targetCompany,
        targetRole,
        targetRecipient,
        finalJdText,
        tone: chosenTone,
      });
    }

    const emailDraft = {
      company: generated.company || targetCompany || '',
      role: generated.role || targetRole || '',
      recipient: generated.recipient || targetRecipient || '',
      tone: chosenTone,
      jdText: finalJdText,
      jdImageUrl: image || '',
      subject: generated.subject || `${targetRole || 'Full Stack Developer'} Application – ${candidate.name}`,
      emailBody: generated.emailBody || '',
      keyHighlights: Array.isArray(generated.keyHighlights) ? generated.keyHighlights : [],
      createdAt: new Date(),
    };

    conversation.emails.unshift(emailDraft);
    if (targetCompany) conversation.targetCompany = targetCompany;
    if (targetRole) conversation.targetRole = targetRole;
    if (targetRecipient) conversation.recipient = targetRecipient;
    conversation.preferredTone = chosenTone;
    if (finalJdText) conversation.jdText = finalJdText;
    if (image) conversation.jdImageUrl = image;

    if (
      (!conversation.title || conversation.title.startsWith('Application #') || conversation.title === 'New Application') &&
      (targetCompany || targetRole)
    ) {
      conversation.title = `${targetCompany || 'Job'} - ${targetRole || 'Application'}`.slice(0, 40);
    }

    await conversation.save();

    res.json({
      success: true,
      email: emailDraft,
      conversation,
    });
  } catch (err) {
    console.error('Conversation Cold Email Generation Error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate email.' });
  }
});

// =========================================================================
// GENERAL OCR & LEGACY GENERATE ENDPOINTS
// =========================================================================

// POST /api/ai/ocr - Extract text from job description screenshot or resume image/PDF
router.post('/ocr', async (req, res) => {
  try {
    const { image, fileType, fileName } = req.body;
    if (!image) {
      return res.status(400).json({ error: 'File data or URL is required for OCR/Text extraction.' });
    }

    const text = await extractTextFromFile(image, fileType, fileName);
    if (!text || text.trim().length === 0) {
      return res.status(422).json({
        error: 'Could not extract text from this file. Please paste the text directly.',
      });
    }

    const wordCount = text.split(/\s+/).filter(Boolean).length;
    res.json({ success: true, text, wordCount });
  } catch (err) {
    console.error('OCR Endpoint Error:', err);
    res.status(500).json({ error: err.message || 'Failed to extract text from file.' });
  }
});

// POST /api/ai/cold-email - Standalone / Legacy generation
router.post('/cold-email', async (req, res) => {
  try {
    const {
      jobDescription = '',
      image = '',
      company = '',
      role = '',
      recipient = '',
      tone = 'pitch',
      resumeText = '',
    } = req.body;

    let finalJdText = jobDescription.trim();

    if (image && (!finalJdText || finalJdText.length < 20)) {
      const ocrText = await extractTextFromFile(image, 'image');
      if (ocrText) {
        finalJdText = ocrText;
      }
    }

    if (!finalJdText && !role) {
      return res.status(400).json({
        error: 'Please provide either a job description, job screenshot, or role name.',
      });
    }

    const candidate = await getCandidateFullContext(resumeText);
    const generated = generateDynamicHumanColdEmail({
      candidate,
      targetCompany: company,
      targetRole: role,
      targetRecipient: recipient,
      finalJdText,
      tone,
    });

    res.json({
      success: true,
      subject: generated.subject || '',
      recipient: generated.recipient || recipient || '',
      company: generated.company || company || '',
      role: generated.role || role || '',
      emailBody: generated.emailBody || '',
      keyHighlights: generated.keyHighlights || [],
      extractedJdText: finalJdText,
    });
  } catch (err) {
    console.error('Cold Email Generation Error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate email.' });
  }
});

module.exports = router;
