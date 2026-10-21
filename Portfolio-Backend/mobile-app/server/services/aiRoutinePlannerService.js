const Calendar = require('../models/Calendar');
const CalendarEvent = require('../models/CalendarEvent');
const ProjectApi = require('../models/portfolio/ProjectApi');

const GROQ_MODEL = process.env.GROK_MODEL || 'llama-3.3-70b-versatile';

/**
 * Retrieve API key dynamically from environment or ProjectApi vault
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
 * Detect whether an event is passive / co-occurring (e.g. diet shake, hydration, vitamins)
 * vs a hard exclusive conflict (e.g. meeting, deep work, gym, classroom).
 */
function isPassiveCoOccurringEvent(event) {
  const calName = (event.calendarId?.name || '').toLowerCase();
  const title = (event.title || '').toLowerCase();
  const desc = (event.description || '').toLowerCase();
  const combined = `${calName} ${title} ${desc}`;

  // Patterns for passive habits that can seamlessly overlap with study / work / other routines
  const PASSIVE_PATTERNS = [
    /\b(shake|protein|drink|water|hydrate|hydration|sip)\b/i,
    /\b(snack|fruit|almonds|nuts|supplement|vitamin|medicine|pill)\b/i,
    /\b(diet\s*reminder|meal\s*reminder|tea|coffee|green\s*tea)\b/i,
    /\b(background|laundry|passive|music|audio|podcast)\b/i,
  ];

  return PASSIVE_PATTERNS.some((pattern) => pattern.test(combined));
}

/**
 * Format a Date to HH:MM (24-hour string)
 */
function toTimeString(date) {
  const d = new Date(date);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

/**
 * Combine target date (YYYY-MM-DD) and time (HH:mm) into a local Date object
 */
function buildDateTime(dateStr, timeStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hour, min] = timeStr.split(':').map(Number);
  return new Date(year, month - 1, day, hour, min, 0, 0);
}

/**
 * Rule-Based Intelligent Routine Generator (Guaranteed Reliable Fallback Engine)
 * Generates structured routines that respect existing commitments from other calendars,
 * permitting parallel multi-tasking for compatible passive habits (e.g. shake/diet while studying).
 */
function generateHeuristicRoutine({
  targetDateStr,
  targetCalendar,
  userGoal,
  planCategory,
  existingEvents = [],
  intensity = 'moderate',
}) {
  const goalLower = (userGoal || '').toLowerCase();

  // Identify passive vs hard conflict existing events
  const passiveEvents = [];
  const hardConflicts = [];

  for (const ev of existingEvents) {
    const startStr = toTimeString(ev.startAt);
    const endStr = toTimeString(ev.endAt);
    const calName = ev.calendarId?.name || 'General';

    if (isPassiveCoOccurringEvent(ev)) {
      passiveEvents.push({
        title: ev.title,
        calendarName: calName,
        startStr,
        endStr,
      });
    } else {
      hardConflicts.push({
        title: ev.title,
        calendarName: calName,
        startStr,
        endStr,
        startMin: new Date(ev.startAt).getHours() * 60 + new Date(ev.startAt).getMinutes(),
        endMin: new Date(ev.endAt).getHours() * 60 + new Date(ev.endAt).getMinutes(),
      });
    }
  }

  // Sort hard conflicts chronologically
  hardConflicts.sort((a, b) => a.startMin - b.startMin);

  // Template generators based on category or goal keywords
  let slots = [];

  let effectiveCategory = planCategory;
  if (!effectiveCategory || effectiveCategory === 'general') {
    if (/\b(diet|meal|nutrition|calorie|fasting)\b/i.test(goalLower)) {
      effectiveCategory = 'diet';
    } else if (/\b(workout|gym|fitness|run|cardio|chest|legs|exercise)\b/i.test(goalLower)) {
      effectiveCategory = 'workout';
    } else if (/\b(study|learn|exam|revision|dsa|math|code|read|book|course)\b/i.test(goalLower)) {
      effectiveCategory = 'study';
    } else {
      effectiveCategory = 'general';
    }
  }

  if (effectiveCategory === 'study') {
    slots = [
      {
        title: userGoal ? `Deep Focus: ${userGoal.slice(0, 35)}` : 'Study Block 1: Core Concepts',
        description: 'Theory breakdown, lecture review & making structured notes without distractions',
        defaultStart: '09:00',
        defaultEnd: '10:30',
        priority: 'high',
      },
      {
        title: 'Active Recall & Practice Problems',
        description: 'Solve 3-5 curated challenge problems / exercises based on morning concepts',
        defaultStart: '11:00',
        defaultEnd: '12:30',
        priority: 'high',
      },
      {
        title: 'Study Sprint 2: Practical Coding / Application',
        description: 'Hands-on implementation, debugging & building real-world module',
        defaultStart: '15:00',
        defaultEnd: '16:45',
        priority: 'high',
      },
      {
        title: 'Flashcards, Spaced Repetition & Day Wrap-up',
        description: 'Quick revision of tricky edge cases, formulas & logging progress',
        defaultStart: '21:00',
        defaultEnd: '21:45',
        priority: 'medium',
      },
    ];
  } else if (effectiveCategory === 'diet') {
    slots = [
      {
        title: 'Morning Detox & Hydration',
        description: 'Warm lemon water + soaked chia seeds / almonds',
        defaultStart: '07:30',
        defaultEnd: '07:45',
        priority: 'high',
      },
      {
        title: 'Nutritious High-Protein Breakfast',
        description: 'Oats with whey / eggs & fruits according to target macros',
        defaultStart: '09:00',
        defaultEnd: '09:30',
        priority: 'high',
      },
      {
        title: 'Mid-Morning Hydration & Green Tea',
        description: 'Green tea + 500ml water to maintain focus',
        defaultStart: '11:30',
        defaultEnd: '11:45',
        priority: 'low',
      },
      {
        title: 'Balanced Clean Lunch',
        description: 'Brown rice/roti, lentils/paneer/chicken, fresh greens & curd',
        defaultStart: '13:30',
        defaultEnd: '14:15',
        priority: 'high',
      },
      {
        title: 'Pre-Workout / Evening Fuel',
        description: 'Black coffee / fruit + handful of roasted makhana or nuts',
        defaultStart: '17:00',
        defaultEnd: '17:20',
        priority: 'medium',
      },
      {
        title: 'Post-Workout Protein Shake',
        description: 'Whey protein isolate shake + 1 banana for glycogen refill',
        defaultStart: '19:00',
        defaultEnd: '19:15',
        priority: 'high',
      },
      {
        title: 'Light Wholesome Dinner',
        description: 'High protein, low carb stir-fry salad or clear soup',
        defaultStart: '20:30',
        defaultEnd: '21:15',
        priority: 'medium',
      },
    ];
  } else if (effectiveCategory === 'workout') {
    slots = [
      {
        title: 'Dynamic Warm-up & Mobility',
        description: 'Joint rotations, foam rolling, dynamic hip & shoulder openers',
        defaultStart: '07:00',
        defaultEnd: '07:20',
        priority: 'medium',
      },
      {
        title: userGoal ? `Main Workout: ${userGoal.slice(0, 40)}` : 'Strength Training Session',
        description: 'Core compound lifts: 4 sets of 8-10 reps with progressive overload',
        defaultStart: '07:20',
        defaultEnd: '08:20',
        priority: 'high',
      },
      {
        title: 'Cool-Down Stretches & Hydration',
        description: 'Static stretching for hamstring, glutes, chest & deep breathing',
        defaultStart: '08:20',
        defaultEnd: '08:35',
        priority: 'medium',
      },
      {
        title: 'Evening Active Recovery / Brisk Walk',
        description: '3,000 steps light brisk walk for active blood flow and recovery',
        defaultStart: '18:30',
        defaultEnd: '19:00',
        priority: 'low',
      },
    ];
  } else {
    // General Productive Daily Sprint
    slots = [
      {
        title: userGoal ? `Focus Sprint: ${userGoal.slice(0, 35)}` : 'Morning Priority Task',
        description: 'High-leverage focus block on the most critical objective of the day',
        defaultStart: '09:30',
        defaultEnd: '11:00',
        priority: 'high',
      },
      {
        title: 'Secondary Focus & Execution Block',
        description: 'Deep progress on pending milestones, reviews, and implementation',
        defaultStart: '14:30',
        defaultEnd: '16:00',
        priority: 'high',
      },
      {
        title: 'Review, Planning & Tomorrow Preparation',
        description: 'Document achievements, organize tasks, and set top 3 priorities for tomorrow',
        defaultStart: '20:30',
        defaultEnd: '21:15',
        priority: 'medium',
      },
    ];
  }

  // Adjust slots around hard conflicts, while PRESERVING parallel compatibility with passive habits
  const finalRoutine = [];

  for (const slot of slots) {
    let [sh, sm] = slot.defaultStart.split(':').map(Number);
    let [eh, em] = slot.defaultEnd.split(':').map(Number);
    let startMin = sh * 60 + sm;
    let endMin = eh * 60 + em;
    const durationMin = endMin - startMin;

    let adjustedStartMin = startMin;
    let adjustedEndMin = endMin;
    let conflictResolution = null;

    // Check collision with HARD conflicts (e.g. Work meeting, class)
    for (const hc of hardConflicts) {
      const hasCollision =
        (adjustedStartMin >= hc.startMin && adjustedStartMin < hc.endMin) ||
        (adjustedEndMin > hc.startMin && adjustedEndMin <= hc.endMin) ||
        (adjustedStartMin <= hc.startMin && adjustedEndMin >= hc.endMin);

      if (hasCollision) {
        // Shift slot immediately after the hard conflict ends (+15 min buffer)
        adjustedStartMin = hc.endMin + 15;
        adjustedEndMin = adjustedStartMin + durationMin;
        conflictResolution = `Scheduled around ${hc.title} (${hc.calendarName}: ${hc.startStr} - ${hc.endStr})`;
      }
    }

    // Check if any PASSIVE events co-occur with this slot
    // CRITICAL USER REQUIREMENT: Keep the slot intact! Do NOT delay or push the time!
    let coOccurrenceNote = null;
    for (const pe of passiveEvents) {
      const pStart = pe.startStr.split(':').map(Number);
      const pMin = pStart[0] * 60 + pStart[1];
      if (pMin >= adjustedStartMin && pMin <= adjustedEndMin) {
        coOccurrenceNote = `Co-occurs with ${pe.title} (${pe.calendarName} at ${pe.startStr}) — Perfectly compatible!`;
        break;
      }
    }

    const startH = String(Math.floor(adjustedStartMin / 60)).padStart(2, '0');
    const startM = String(adjustedStartMin % 60).padStart(2, '0');
    const endH = String(Math.floor(adjustedEndMin / 60)).padStart(2, '0');
    const endM = String(adjustedEndMin % 60).padStart(2, '0');

    const startAt = buildDateTime(targetDateStr, `${startH}:${startM}`);
    const endAt = buildDateTime(targetDateStr, `${endH}:${endM}`);

    finalRoutine.push({
      title: slot.title,
      description: slot.description,
      startAt,
      endAt,
      priority: slot.priority,
      coOccurrenceNote,
      conflictResolution,
      calendarId: targetCalendar._id,
      calendarName: targetCalendar.name,
      calendarColor: targetCalendar.color,
      isCompatibleParallel: !!coOccurrenceNote,
    });
  }

  return finalRoutine;
}

/**
 * Backend date matcher for checking if an event (one-time or recurring) occurs on targetDate
 */
function isBackendEventMatchingDate(ev, targetDate) {
  if (!ev || !ev.startAt || !targetDate) return false;
  const evDate = new Date(ev.startAt);
  const target = new Date(targetDate);

  if (
    evDate.getFullYear() === target.getFullYear() &&
    evDate.getMonth() === target.getMonth() &&
    evDate.getDate() === target.getDate()
  ) {
    return true;
  }

  const freq = ev.recurrenceRule?.frequency;
  if (!freq || freq === 'none') return false;

  const startMidnight = new Date(evDate.getFullYear(), evDate.getMonth(), evDate.getDate()).getTime();
  const targetMidnight = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  if (targetMidnight < startMidnight) return false;

  if (ev.recurrenceRule?.until) {
    const untilMidnight = new Date(new Date(ev.recurrenceRule.until).setHours(23, 59, 59, 999)).getTime();
    if (targetMidnight > untilMidnight) return false;
  }

  if (freq === 'daily') return true;
  if (freq === 'weekdays') {
    const day = target.getDay();
    return day >= 1 && day <= 5;
  }
  if (freq === 'weekly') {
    if (Array.isArray(ev.recurrenceRule?.daysOfWeek) && ev.recurrenceRule.daysOfWeek.length > 0) {
      return ev.recurrenceRule.daysOfWeek.includes(target.getDay());
    }
    return evDate.getDay() === target.getDay();
  }
  if (freq === 'monthly') return evDate.getDate() === target.getDate();

  return false;
}

/**
 * Main AI Routine Planner Service
 * Takes user instructions, analyzes ALL existing user calendars for that date,
 * and generates a smart, optimized routine without unnecessary rescheduling of co-occurring habits.
 */
async function generateAiRoutine({
  userId = 'admin',
  calendarId,
  targetDateStr,
  userGoal,
  planCategory = 'general',
  intensity = 'moderate',
  recurrenceRule = { frequency: 'none' },
}) {
  // 1. Resolve Target Calendar
  let targetCalendar = null;
  if (calendarId) {
    targetCalendar = await Calendar.findOne({ _id: calendarId, userId });
  }
  if (!targetCalendar) {
    targetCalendar =
      (await Calendar.findOne({ userId, isDefault: true })) ||
      (await Calendar.findOne({ userId }));
  }
  if (!targetCalendar) {
    targetCalendar = await Calendar.create({
      userId,
      name: 'Personal Routine',
      color: '#7e37d8',
      description: 'AI Generated Routines',
      isDefault: true,
      isVisible: true,
    });
  }

  // 2. Fetch ALL user events across ALL calendars for target date (including recurring habits & events)
  const cleanDateStr = targetDateStr || new Date().toISOString().split('T')[0];
  const [tYear, tMonth, tDay] = cleanDateStr.split('-').map(Number);
  const targetDateObj = new Date(tYear, tMonth - 1, tDay);

  const broadStart = new Date(targetDateObj.getTime() - 24 * 60 * 60 * 1000);
  const broadEnd = new Date(targetDateObj.getTime() + 48 * 60 * 60 * 1000);

  const rawEvents = await CalendarEvent.find({
    userId,
    $or: [
      { startAt: { $gte: broadStart, $lte: broadEnd } },
      {
        'recurrenceRule.frequency': { $in: ['daily', 'weekly', 'weekdays', 'monthly'] },
        startAt: { $lte: broadEnd },
      },
    ],
  })
    .populate('calendarId')
    .sort({ startAt: 1 });

  const existingEvents = rawEvents.filter((ev) => isBackendEventMatchingDate(ev, targetDateObj));

  console.log(
    `[AI Routine Planner] Found ${existingEvents.length} existing events across all calendars for ${cleanDateStr}`
  );

  // 3. Attempt LLM Generation if Key is Available
  const apiKey = await getApiKey();
  let routineResult = null;

  if (apiKey) {
    try {
      const existingEventsFormatted = existingEvents.map((ev) => {
        const cal = ev.calendarId?.name || 'General';
        const start = toTimeString(ev.startAt);
        const end = toTimeString(ev.endAt);
        const isPassive = isPassiveCoOccurringEvent(ev);
        return `- [${start} - ${end}] ${ev.title} (Calendar: "${cal}", Type: ${isPassive ? 'CO_OCCURRING_PASSIVE_CAN_OVERLAP' : 'HARD_CONFLICT_EXCLUSIVE'})`;
      });

      const prompt = `You are a brilliant AI Personal Executive & Daily Schedule Architect.
Your task is to create a realistic, high-impact routine for the user on date: ${cleanDateStr}.

TARGET CALENDAR: "${targetCalendar.name}"
USER GOAL / FOCUS: "${userGoal || 'Productive balanced schedule'}"
CATEGORY: "${planCategory}"
INTENSITY: "${intensity}"
RECURRENCE: "${recurrenceRule?.frequency || 'once'}"

EXISTING SCHEDULE ACROSS ALL OTHER CALENDARS (READ CAREFULLY):
${existingEventsFormatted.length > 0 ? existingEventsFormatted.join('\n') : 'No existing events scheduled for this day across other calendars.'}

CRITICAL SCHEDULING RULES (MULTI-CALENDAR AWARENESS):
1. Distinguish between HARD EXCLUSIVE CONFLICTS vs COMPATIBLE CO-OCCURRING TASKS:
   - "HARD_CONFLICT_EXCLUSIVE" (e.g. Work Meetings, Zoom Calls, Exams, Driving): DO NOT schedule new focus blocks over these. Schedule before or after.
   - "CO_OCCURRING_PASSIVE_CAN_OVERLAP" (e.g. Diet Shake reminder at 09:00, drinking water, vitamins, background habits): The user CAN do both simultaneously!
     * RULE: If a study block is 09:00 - 10:00 and a Diet shake is at 09:00, KEEP study at 09:00! DO NOT push study to 09:15! Attach a note that they can sip the shake while studying.
2. Structure output as realistic time blocks between 07:00 and 22:30.
3. Return ONLY a valid JSON array of objects with schema:
[
  {
    "title": "Data Structures: Trees & Graphs",
    "description": "Deep dive into binary search trees and practice 2 problems",
    "startTime": "09:00",
    "endTime": "10:30",
    "priority": "high",
    "coOccurrenceNote": "Co-occurs with 09:00 AM Shake (Diet) — Enjoy drink while studying",
    "conflictResolution": null
  }
]
Do not wrap in markdown fences. Output raw JSON only.`;

      const payload = {
        model: GROQ_MODEL,
        messages: [
          {
            role: 'system',
            content:
              'You are an expert calendar scheduler that balances deep work with existing multi-calendar commitments without unnecessarily rescheduling parallel habits.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
      };

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        const rawContent = data?.choices?.[0]?.message?.content || '';
        let cleanJson = rawContent.trim();
        if (cleanJson.startsWith('```json')) {
          cleanJson = cleanJson.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
        } else if (cleanJson.startsWith('```')) {
          cleanJson = cleanJson.replace(/^```\s*/, '').replace(/```\s*$/, '').trim();
        }

        const parsed = JSON.parse(cleanJson);
        if (Array.isArray(parsed) && parsed.length > 0) {
          routineResult = parsed.map((item) => ({
            title: item.title,
            description: item.description || '',
            startAt: buildDateTime(cleanDateStr, item.startTime),
            endAt: buildDateTime(cleanDateStr, item.endTime),
            priority: item.priority || 'medium',
            coOccurrenceNote: item.coOccurrenceNote || null,
            conflictResolution: item.conflictResolution || null,
            calendarId: targetCalendar._id,
            calendarName: targetCalendar.name,
            calendarColor: targetCalendar.color,
            isCompatibleParallel: !!item.coOccurrenceNote,
            recurrenceRule: recurrenceRule || { frequency: 'none' },
          }));
          console.log(`[AI Routine Planner] LLM generated ${routineResult.length} slots successfully`);
        }
      } else {
        console.warn(`[AI Routine Planner LLM Status] ${res.status}. Switching to Heuristic Engine.`);
      }
    } catch (llmErr) {
      console.warn(`[AI Routine Planner LLM Error] ${llmErr.message}. Using Heuristic Engine.`);
    }
  }

  // 4. Fallback to Dynamic Heuristic Engine if LLM did not produce results
  if (!routineResult || routineResult.length === 0) {
    console.log('[AI Routine Planner] Running Heuristic Cross-Calendar Routine Engine');
    const heuristicItems = generateHeuristicRoutine({
      targetDateStr: cleanDateStr,
      targetCalendar,
      userGoal,
      planCategory,
      existingEvents,
      intensity,
    });
    routineResult = heuristicItems.map((item) => ({
      ...item,
      recurrenceRule: recurrenceRule || { frequency: 'none' },
    }));
  }

  return {
    success: true,
    targetDate: cleanDateStr,
    recurrenceRule: recurrenceRule || { frequency: 'none' },
    targetCalendar: {
      id: targetCalendar._id,
      name: targetCalendar.name,
      color: targetCalendar.color,
    },
    existingEventsCount: existingEvents.length,
    existingEventsSummary: existingEvents.map((ev) => ({
      _id: ev._id,
      title: ev.title,
      calendarName: ev.calendarId?.name || 'General',
      calendarColor: ev.calendarId?.color || '#7e37d8',
      startAt: ev.startAt,
      endAt: ev.endAt,
      isPassive: isPassiveCoOccurringEvent(ev),
    })),
    routine: routineResult,
  };
}

module.exports = {
  generateAiRoutine,
  isPassiveCoOccurringEvent,
};
