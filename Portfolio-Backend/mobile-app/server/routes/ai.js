const express = require('express');
const router = express.Router();
const Prof = require('../models/portfolio/Prof');
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
 * Helper: Extract text from image or PDF using OCR.space API
 */
async function performOcr(imageSource, fileType = '') {
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

    if (imageSource.startsWith('http://') || imageSource.startsWith('https://')) {
      formData.append('url', imageSource);
    } else {
      // base64
      let base64Clean = imageSource;
      if (!base64Clean.startsWith('data:')) {
        const mime = isPdf ? 'application/pdf' : 'image/jpeg';
        base64Clean = `data:${mime};base64,${base64Clean}`;
      }
      formData.append('base64Image', base64Clean);
    }

    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const data = await res.json();

    if (data?.IsErroredOnProcessing) {
      console.warn('[OCR Warning]', data?.ErrorMessage || data?.ErrorDetails);
    }

    // Extract text across all pages (especially for multi-page resumes or documents)
    let parsedText = '';
    if (Array.isArray(data?.ParsedResults) && data.ParsedResults.length > 0) {
      parsedText = data.ParsedResults.map((p) => p.ParsedText || '')
        .filter(Boolean)
        .join('\n\n')
        .trim();
    } else if (data?.ParsedResults?.[0]?.ParsedText) {
      parsedText = data.ParsedResults[0].ParsedText.trim();
    }

    return parsedText;
  } catch (err) {
    console.error('[OCR Error]', err);
    return '';
  }
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
          'You are an expert tech recruiter, career strategist, and elite cold email outreach specialist. You write compelling, high-converting job application emails that highlight authentic project experience, quantify impact, and perfectly match candidate resumes with job postings.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.3,
  };

  let res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey.trim()}`,
    },
    body: JSON.stringify(payload),
  });

  // If primary model fails or times out, fallback to llama-3.3-70b-versatile
  if (!res.ok && model !== 'llama-3.3-70b-versatile') {
    console.warn(`[Grok API ${model} Failed: ${res.status}], retrying with llama-3.3-70b-versatile...`);
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
    console.warn(`[Grok API Final Failed] ${res.status}: ${errText}`);
    throw new Error(`LLM API returned ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const rawContent = data?.choices?.[0]?.message?.content || '';

  // Clean JSON response (strip markdown fences if present)
  let cleanJson = rawContent.trim();
  if (cleanJson.startsWith('```json')) {
    cleanJson = cleanJson.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
  } else if (cleanJson.startsWith('```')) {
    cleanJson = cleanJson.replace(/^```\s*/, '').replace(/```\s*$/, '').trim();
  }

  return JSON.parse(cleanJson);
}

// =========================================================================
// CONVERSATION MANAGEMENT ROUTES (/api/ai/conversations)
// =========================================================================

// 1. GET /api/ai/conversations - List all conversations for the user
router.get('/conversations', async (req, res) => {
  try {
    const conversations = await AiColdEmailConversation.find({ userId: 'admin' })
      .sort({ updatedAt: -1 })
      .select('-resumeText -emails.emailBody -emails.jdText') // Lightweight summary list
      .lean();

    // Map summary properties
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

// 7. POST /api/ai/conversations/:id/generate - Generate cold email using this conversation's resume!
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
      const ocrText = await performOcr(image);
      if (ocrText) {
        finalJdText = ocrText;
      }
    }

    if (!finalJdText && !role && !company) {
      return res.status(400).json({
        error: 'Please provide either a job description, job screenshot, or role name.',
      });
    }

    // Default candidate background from DB Prof
    let candidate = {
      name: 'Manish Nemade',
      profession: 'FullStack Developer',
      description:
        'Ex-SDE Intern@Melsta Studio | OpenSource Contributor | Meshery|Layer5 | Codeforces(1400 Rating) | CI & CD.',
      email: 'Mnemade140@gmail.com',
      portfolio: 'https://manish-portfolio-6mbj.vercel.app/',
    };

    try {
      const prof = await Prof.findOne().sort({ updatedAt: -1 });
      if (prof) {
        candidate.name = prof.name || candidate.name;
        candidate.email = prof.email || candidate.email;
        candidate.profession = prof.profession || candidate.profession;
        candidate.description = prof.description || candidate.description;
      }
    } catch (e) {
      console.warn('Could not fetch Prof from DB, using fallback candidate profile:', e.message);
    }

    // Use this conversation's stored resume text!
    const conversationResume = (conversation.resumeText || '').trim();

    const targetCompany = company.trim() || conversation.targetCompany || '';
    const targetRole = role.trim() || conversation.targetRole || '';
    const targetRecipient = recipient.trim() || conversation.recipient || '';
    const chosenTone = tone || conversation.preferredTone || 'pitch';

    // Tone style instructions
    const toneInstructions = {
      pitch:
        'Direct, punchy, high-impact pitch. Highlight how the candidate can deliver immediate value, solve their technical challenges, and ship fast.',
      professional:
        'Polite, structured, highly professional corporate application highlighting engineering excellence, clean code, and cross-functional teamwork.',
      concise:
        'Short & snappy (strictly under 120 words). Fast read for busy founders, CEOs, and CTOs.',
      referral:
        'Warm, conversational, network referral style as if reaching out to an engineering peer, tech lead, or fellow builder.',
    };

    const toneGuide = toneInstructions[chosenTone] || toneInstructions.pitch;

    // Prompt construction incorporating the conversation's exact resume
    const prompt = `
You are drafting a hyper-personalized, top-tier cold job application email.

CANDIDATE PROFILE:
- Name: ${candidate.name}
- Title / Role: ${candidate.profession}
- Bio & Highlights: ${candidate.description}
- Contact Email: ${candidate.email}
- Portfolio Website: ${candidate.portfolio}

CANDIDATE STORED RESUME FOR THIS APPLICATION SESSION:
"""
${
  conversationResume
    ? conversationResume
    : `(No full resume attached. Candidate skills: React, Next.js, Node.js, Express, MongoDB, Docker, CI/CD, competitive programming rating 1400 on Codeforces, SDE internship at Melsta Studio, open-source contributor at Meshery/Layer5).`
}
"""

TARGET APPLICATION DETAILS:
- Specified Company: "${targetCompany || 'Target Company'}"
- Specified Role / Position: "${targetRole || 'Software Engineer'}"
- Specified Recruiter Email: "${targetRecipient}"

TARGET JOB DESCRIPTION / POSTING REQUIREMENTS:
"""
${finalJdText || `Role: ${targetRole || 'Full Stack Developer'} at ${targetCompany || 'your company'}`}
"""

TONE & STYLE:
${toneGuide}

INSTRUCTIONS:
1. Deeply align the candidate's SPECIFIC RESUME accomplishments, tools, metrics, and experience with the target job's requirements.
2. If the resume mentions specific projects, numbers, or technologies that match the JD, explicitly cite them in the email body.
3. Extract or determine:
   - "company": target company name
   - "role": exact job title / position
   - "recipient": email address (use specified recipient "${targetRecipient}" if found or provided, else extract from JD)
4. Create "subject": An irresistible, click-worthy email subject line (e.g. "Full Stack Developer Application - Manish Nemade | [Specific value or match]")
5. Create "emailBody":
   - Greeting (e.g. "Hi [Company] Team," or "Hi [Hiring Manager],")
   - Engaging opening hook explaining why Manish is applying and matches their specific tech stack
   - 2-3 specific bullet points connecting Manish's actual resume experience (Melsta Studio, Next.js, MERN stack, Meshery/Layer5 open-source, Codeforces problem solving) directly to their requirements
   - Include portfolio link (${candidate.portfolio})
   - Clear, low-friction call to action for a 15-minute sync
   - Sign-off with Manish's name and contact email (${candidate.email})
6. Create "keyHighlights": Array of 2-3 short strings summarizing the strongest matching qualifications from the resume.

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
    } catch (llmErr) {
      console.warn('Grok LLM primary call failed, creating intelligent fallback:', llmErr.message);
      const detectedCompany = targetCompany || 'Hiring Team';
      const detectedRole = targetRole || 'Full Stack Developer';
      generated = {
        subject: `Application for ${detectedRole} – ${candidate.name}`,
        recipient: targetRecipient || '',
        company: detectedCompany,
        role: detectedRole,
        emailBody: `Hi ${detectedCompany} Team,\n\nI'm ${candidate.name}, a ${candidate.profession} with hands-on experience building high-performance web applications using React, Next.js, Node.js, and MongoDB.\n\nI was excited to come across the ${detectedRole} opportunity. During my SDE internship at Melsta Studio and open-source contributions with Meshery (Layer5), I specialized in shipping robust APIs, optimizing frontend load times, and building automated CI/CD pipelines.\n\nHere is what I bring to ${detectedCompany}:\n• Full-Stack Expertise: Proven track record developing scalable MERN & Next.js architectures with clean REST/GraphQL APIs.\n• Performance & Problem Solving: Competitive programming background (1400 on Codeforces) ensuring optimized algorithms and clean system design.\n• Production Readiness: Experience with Docker, AWS cloud services, and Git workflows.\n\nYou can explore my projects and live demos here: ${candidate.portfolio}\n\nI would love the opportunity to discuss how my skill set aligns with ${detectedCompany}'s technical roadmap. Are you available for a brief call this week?\n\nBest regards,\n${candidate.name}\n${candidate.email}`,
        keyHighlights: [
          'Ex-SDE Intern @ Melsta Studio – Built high-scale Next.js & Node.js services',
          'Open-source contributor at Meshery/Layer5 with strong CI/CD & API experience',
        ],
      };
    }

    const emailDraft = {
      company: generated.company || targetCompany || '',
      role: generated.role || targetRole || '',
      recipient: generated.recipient || targetRecipient || '',
      tone: chosenTone,
      jdText: finalJdText,
      jdImageUrl: image || '',
      subject: generated.subject || `Application for ${targetRole || 'Full Stack Developer'} – ${candidate.name}`,
      emailBody: generated.emailBody || '',
      keyHighlights: Array.isArray(generated.keyHighlights) ? generated.keyHighlights : [],
      createdAt: new Date(),
    };

    // Save generated email into conversation's emails list!
    conversation.emails.unshift(emailDraft);
    if (targetCompany) conversation.targetCompany = targetCompany;
    if (targetRole) conversation.targetRole = targetRole;
    if (targetRecipient) conversation.recipient = targetRecipient;
    conversation.preferredTone = chosenTone;
    if (finalJdText) conversation.jdText = finalJdText;
    if (image) conversation.jdImageUrl = image;

    // Auto-rename title if it was default
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
    const { image, fileType } = req.body;
    if (!image) {
      return res.status(400).json({ error: 'Image (URL or base64) is required for OCR.' });
    }

    const text = await performOcr(image, fileType);
    if (!text) {
      return res.status(422).json({
        error: 'Could not extract text from this file. Please paste the text directly.',
      });
    }

    const wordCount = text.split(/\s+/).filter(Boolean).length;
    res.json({ success: true, text, wordCount });
  } catch (err) {
    console.error('OCR Endpoint Error:', err);
    res.status(500).json({ error: err.message || 'Failed to extract text from image.' });
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
      const ocrText = await performOcr(image);
      if (ocrText) {
        finalJdText = ocrText;
      }
    }

    if (!finalJdText && !role) {
      return res.status(400).json({
        error: 'Please provide either a job description, job screenshot, or role name.',
      });
    }

    let candidate = {
      name: 'Manish Nemade',
      profession: 'FullStack Developer',
      description:
        'Ex-SDE Intern@Melsta Studio | OpenSource Contributor | Meshery|Layer5 | Codeforces(1400 Rating) | CI & CD.',
      email: 'Mnemade140@gmail.com',
      portfolio: 'https://manish-portfolio-6mbj.vercel.app/',
    };

    try {
      const prof = await Prof.findOne().sort({ updatedAt: -1 });
      if (prof) {
        candidate.name = prof.name || candidate.name;
        candidate.email = prof.email || candidate.email;
        candidate.profession = prof.profession || candidate.profession;
        candidate.description = prof.description || candidate.description;
      }
    } catch (e) {}

    const toneInstructions = {
      pitch: 'Direct, punchy, high-impact pitch.',
      professional: 'Polite, structured, highly professional corporate application.',
      concise: 'Short & snappy (under 120 words).',
      referral: 'Warm, conversational, network referral style.',
    };

    const toneGuide = toneInstructions[tone] || toneInstructions.pitch;

    const prompt = `
Candidate Profile:
- Name: ${candidate.name}
- Title / Role: ${candidate.profession}
- Bio & Highlights: ${candidate.description}
- Contact Email: ${candidate.email}
- Portfolio Website: ${candidate.portfolio}

${resumeText ? `Candidate Resume:\n"""\n${resumeText}\n"""\n` : ''}

Target Job:
- Company: "${company}"
- Role: "${role}"
- Recipient: "${recipient}"
- JD Text:
"""
${finalJdText || `Job Role: ${role || 'Full Stack Developer'} at ${company || 'your company'}`}
"""

Tone: ${toneGuide}

Create:
1. "subject"
2. "recipient"
3. "company"
4. "role"
5. "emailBody"
6. "keyHighlights" (array of 2-3 items)

Return ONLY pure JSON.`;

    let generated;
    try {
      generated = await callGrokLlm(prompt);
    } catch (llmErr) {
      generated = {
        subject: `Application for ${role || 'Full Stack Developer'} – ${candidate.name}`,
        recipient: recipient || '',
        company: company || 'Hiring Team',
        role: role || 'Full Stack Developer',
        emailBody: `Hi ${company || 'Team'},\n\nI'm ${candidate.name}, applying for ${role || 'Full Stack Developer'}.\n\nPortfolio: ${candidate.portfolio}\n\nBest,\n${candidate.name}`,
        keyHighlights: ['MERN Stack Developer', 'Open Source Contributor'],
      };
    }

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
