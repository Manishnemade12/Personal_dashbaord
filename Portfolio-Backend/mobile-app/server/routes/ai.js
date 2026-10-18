const express = require('express');
const router = express.Router();
const Prof = require('../models/portfolio/Prof');

const ProjectApi = require('../models/portfolio/ProjectApi');

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
 * Helper: Extract text from image using OCR.space API
 */
async function performOcr(imageSource) {
  try {
    let apiUrl = 'https://api.ocr.space/parse/image';
    let formData = new URLSearchParams();
    formData.append('apikey', 'helloworld');
    formData.append('language', 'eng');
    formData.append('isOverlayRequired', 'false');

    if (imageSource.startsWith('http://') || imageSource.startsWith('https://')) {
      formData.append('url', imageSource);
    } else {
      // base64
      let base64Clean = imageSource;
      if (!base64Clean.startsWith('data:')) {
        base64Clean = `data:image/jpeg;base64,${base64Clean}`;
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
    const text = data?.ParsedResults?.[0]?.ParsedText || '';
    return text.trim();
  } catch (err) {
    console.error('[OCR Error]', err);
    return '';
  }
}

/**
 * Helper: Call Groq / Grok LLM with retry / fallback
 */
async function callGrokLlm(prompt) {
  const apiKey = await getApiKey();
  if (!apiKey) {
    throw new Error('No Grok/LLM API key found in .env or ProjectApi vault.');
  }

  const payload = {
    model: GROQ_MODEL,
    messages: [
      {
        role: 'system',
        content:
          'You are an expert tech recruiter and elite cold email outreach strategist. You write compelling, high-converting job application emails that sound authentic, confident, and perfectly tailored.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.3,
  };

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey.trim()}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.warn(`[Grok API Failed] ${res.status}: ${errText}`);
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

// 1. POST /api/ai/ocr - Extract text from job description screenshot
router.post('/ocr', async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ error: 'Image (URL or base64) is required for OCR.' });
    }

    const text = await performOcr(image);
    if (!text) {
      return res.status(422).json({
        error: 'Could not extract text from this image. Please paste the job description text.',
      });
    }

    res.json({ success: true, text });
  } catch (err) {
    console.error('OCR Endpoint Error:', err);
    res.status(500).json({ error: err.message || 'Failed to extract text from image.' });
  }
});

// 2. POST /api/ai/cold-email - Generate customized cold application email with Grok LLM
router.post('/cold-email', async (req, res) => {
  try {
    const {
      jobDescription = '',
      image = '',
      company = '',
      role = '',
      recipient = '',
      tone = 'pitch',
    } = req.body;

    let finalJdText = jobDescription.trim();

    // If an image screenshot is provided, extract its text
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

    // Retrieve real candidate profile from MongoDB
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
      console.warn('Could not fetch Prof from DB, using candidate default:', e.message);
    }

    // Tone instructions
    const toneInstructions = {
      pitch:
        'Direct, punchy, high-impact pitch. Highlight how the candidate can deliver immediate value and ship fast.',
      professional:
        'Polite, structured, highly professional corporate application highlighting engineering excellence and teamwork.',
      concise:
        'Short & snappy (under 120 words). Fast read for busy founders and CTOs.',
      referral:
        'Warm, conversational, network referral style as if reaching out to an engineering peer or founder.',
    };

    const toneGuide = toneInstructions[tone] || toneInstructions.pitch;

    const prompt = `
Candidate Profile:
- Name: ${candidate.name}
- Title / Role: ${candidate.profession}
- Bio & Highlights: ${candidate.description}
- Contact Email: ${candidate.email}
- Portfolio Website: ${candidate.portfolio}

User Specified Company (if any): "${company}"
User Specified Target Role (if any): "${role}"
User Specified Recipient Email (if any): "${recipient}"

Target Job Description / Job Posting Text:
"""
${finalJdText || `Job Role: ${role || 'Full Stack Developer'} at ${company || 'your company'}`}
"""

Tone & Writing Style:
${toneGuide}

Instructions:
1. Extract or determine:
   - "company": target company name (from JD or user input)
   - "role": exact job title / position
   - "recipient": email address found in the JD (if none found, use "${recipient || ''}")
2. Create "subject": A compelling, specific email subject line (e.g. "Full Stack Developer Application - Manish Nemade | [Specific value or match]")
3. Create "emailBody":
   - Greeting (e.g. "Hi [Company] Hiring Team," or "Hi [Hiring Manager],")
   - Engaging opening hook explaining why Manish is applying and matches their specific tech stack
   - 2-3 specific bullet points or achievements connecting Manish's background (Melsta Studio, Next.js, MERN stack, Meshery/Layer5 open-source, Codeforces problem solving) directly to their requirements
   - Include portfolio link (${candidate.portfolio})
   - Clear, low-friction call to action for a 15-minute sync
   - Sign-off with Manish's name and contact email
4. Create "keyHighlights": Array of 2-3 short strings summarizing the strongest matching qualifications.

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
      console.warn('Grok LLM primary failed, creating smart fallback:', llmErr.message);
      // Smart fallback so user never gets broken screen
      const detectedCompany = company || 'Hiring Team';
      const detectedRole = role || 'Full Stack Developer';
      generated = {
        subject: `Application for ${detectedRole} – ${candidate.name}`,
        recipient: recipient || '',
        company: detectedCompany,
        role: detectedRole,
        emailBody: `Hi ${detectedCompany} Team,\n\nI'm ${candidate.name}, a ${candidate.profession} with hands-on experience building high-performance web applications using React, Next.js, Node.js, and MongoDB.\n\nI was excited to come across the ${detectedRole} opportunity. During my SDE internship at Melsta Studio and open-source contributions with Meshery (Layer5), I specialized in shipping robust APIs, optimizing frontend load times, and building automated CI/CD pipelines.\n\nHere is what I bring to ${detectedCompany}:\n• Full-Stack Expertise: Proven track record developing scalable MERN & Next.js architectures with clean REST/GraphQL APIs.\n• Performance & Problem Solving: Competitive programming background (1400 on Codeforces) ensuring optimized algorithms and clean system design.\n• Production Readiness: Experience with Docker, AWS cloud services, and Git workflows.\n\nYou can explore my projects and live demos here: ${candidate.portfolio}\n\nI would love the opportunity to discuss how my skill set aligns with ${detectedCompany}'s technical roadmap. Are you available for a brief call this week?\n\nBest regards,\n${candidate.name}\n${candidate.email}`,
        keyHighlights: [
          'Ex-SDE Intern @ Melsta Studio – Built high-scale Next.js & Node.js services',
          'Open-source contributor at Meshery/Layer5 with strong CI/CD & API experience',
        ],
      };
    }

    res.json({
      success: true,
      subject: generated.subject || `Application for ${role || 'Full Stack Developer'} – ${candidate.name}`,
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
