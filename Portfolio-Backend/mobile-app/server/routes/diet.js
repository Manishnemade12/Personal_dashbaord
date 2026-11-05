const express = require('express');
const router = express.Router();
const DietItem = require('../models/DietItem');
const Calendar = require('../models/Calendar');
const CalendarEvent = require('../models/CalendarEvent');
const ProjectApi = require('../models/portfolio/ProjectApi');
const { calculateDietItemBreakdown, calculateSingleIngredientNutrition } = require('../services/nutritionCalculator');

const GROQ_MODEL = process.env.GROK_MODEL || 'openai/gpt-oss-120b';
const DIET_PLANNER_RULES = [
  'Use the saved Diet Library items exactly; never invent meals.',
  'Place breakfast near 08:00, lunch near 13:00, snacks near 16:30, post-workout near 18:30, and dinner near 20:30.',
  'Flag meals above 1000 kcal or with an explicit user restriction as review/avoid, and explain the reason.',
  'Never schedule anything before the user explicitly accepts the reviewed plan.',
].join(' ');

/**
 * Helper: Retrieve Grok / Groq API key from environment or ProjectApi vault
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
 * Helper: Ensure "Diet" Calendar exists in database
 */
async function ensureDietCalendar() {
  let dietCal = await Calendar.findOne({
    $or: [
      { name: { $regex: /^diet/i } },
      { description: { $regex: /diet|nutrition/i } },
    ],
  });

  if (!dietCal) {
    dietCal = await Calendar.create({
      userId: 'admin',
      name: 'Diet',
      description: 'Daily meals, nutrition tracking & workout diet schedule',
      color: '#10b981', // Emerald green
      isDefault: false,
      isVisible: true,
      isArchived: false,
    });
  }
  return dietCal;
}

/**
 * GET /api/diet/ensure-calendar
 */
router.get('/ensure-calendar', async (req, res) => {
  try {
    const dietCal = await ensureDietCalendar();
    res.json({ success: true, calendar: dietCal });
  } catch (err) {
    console.error('Error ensuring diet calendar:', err);
    res.status(500).json({ error: err.message || 'Failed to ensure diet calendar.' });
  }
});

/**
 * POST /api/diet/calculate-macros
 * Uses Grok LLM to compute Calories, Protein, Carbs, Fats from ingredients + ingredient breakdown
 */
router.post('/calculate-macros', async (req, res) => {
  try {
    const { name, category, ingredients } = req.body;

    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return res.status(400).json({ error: 'Please provide at least one ingredient.' });
    }

    const calculatedBreakdown = calculateDietItemBreakdown(ingredients);
    const apiKey = await getApiKey();
    const formattedIngredients = ingredients
      .map((ing) => `- ${ing.quantity || 1} ${ing.unit || 'gram'} of ${ing.name || 'Ingredient'}`)
      .join('\n');

    const prompt = `You are a certified sports nutritionist and precision dietary analyst.
Calculate the exact nutritional macro-nutrients for the following meal recipe:

Meal Name: "${name || 'Custom Diet Item'}"
Category: "${category || 'General'}"
Ingredients:
${formattedIngredients}

Determine the accurate:
1. Total Calories (in kcal)
2. Total Protein (in grams)
3. Total Carbohydrates (in grams)
4. Total Fats (in grams)
5. A concise 1-2 sentence nutritional benefit summary.

CRITICAL INSTRUCTION: You MUST return ONLY a clean JSON object without any markdown code fences, backticks, or other text:
{
  "calories": 380,
  "protein": 28,
  "carbs": 42,
  "fats": 8,
  "analysis": "Rich in lean protein and complex carbs, ideal for muscle synthesis and sustained stamina."
}`;

    if (apiKey) {
      try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey.trim()}`,
          },
          body: JSON.stringify({
            model: GROQ_MODEL,
            messages: [
              {
                role: 'system',
                content:
                  'You are a professional nutrition calculation engine. Output only valid JSON without explanation.',
              },
              { role: 'user', content: prompt },
            ],
            temperature: 0.1,
          }),
        });

        if (response.ok) {
          const completion = await response.json();
          let rawText = completion.choices?.[0]?.message?.content || '';
          rawText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();

          const parsed = JSON.parse(rawText);
          return res.json({
            success: true,
            nutrients: {
              calories: Math.round(Number(parsed.calories) || calculatedBreakdown.totals.calories),
              protein: Math.round(Number(parsed.protein) || calculatedBreakdown.totals.protein),
              carbs: Math.round(Number(parsed.carbs) || calculatedBreakdown.totals.carbs),
              fats: Math.round(Number(parsed.fats) || calculatedBreakdown.totals.fats),
            },
            breakdown: calculatedBreakdown.breakdown,
            analysis: parsed.analysis || 'Nutritional calculation completed successfully.',
          });
        }
      } catch (llmErr) {
        console.warn('[Grok Nutrition LLM Fallback Warning]', llmErr.message);
      }
    }

    // Heuristic fallback calculation
    res.json({
      success: true,
      nutrients: calculatedBreakdown.totals,
      breakdown: calculatedBreakdown.breakdown,
      analysis: 'Calculated precision nutritional values based on ingredient quantities and standard dietary benchmarks.',
    });
  } catch (err) {
    console.error('Error calculating macros:', err);
    res.status(500).json({ error: err.message || 'Failed to calculate nutritional macros.' });
  }
});

/**
 * GET /api/diet/items
 * Get all saved diet items in library with enriched ingredientBreakdown
 */
router.get('/items', async (req, res) => {
  try {
    const items = await DietItem.find({ userId: 'admin' }).sort({ createdAt: -1 }).lean();
    const enriched = items.map((item) => {
      const calculation = calculateDietItemBreakdown(item.ingredients || []);
      return {
        ...item,
        ingredientBreakdown: calculation.breakdown,
        nutrients: (item.nutrients && item.nutrients.calories > 0) ? item.nutrients : calculation.totals,
      };
    });

    /**
     * POST /api/diet/ai-plan-review
     * Builds a review-only meal plan from the saved library. This endpoint never
     * creates calendar events; scheduling happens only after the user accepts.
     */
    router.post('/ai-plan-review', async (req, res) => {
      try {
        const { dateStr, prompt = '', dietItemIds = [] } = req.body;
        const targetDate = /^\d{4}-\d{2}-\d{2}$/.test(dateStr || '')
          ? dateStr
          : new Date().toISOString().slice(0, 10);
        const selectedIds = new Set(Array.isArray(dietItemIds) ? dietItemIds.map(String) : []);
        let items = await DietItem.find({ userId: 'admin' }).sort({ createdAt: -1 }).lean();
        if (selectedIds.size > 0) items = items.filter((item) => selectedIds.has(String(item._id)));

        const preferenceText = String(prompt).toLowerCase();
        const restrictions = [];
        if (/\b(no\s+milk|dairy[-\s]?free|vegan)\b/.test(preferenceText)) restrictions.push('dairy');
        if (/\b(no\s+banana|avoid\s+banana)\b/.test(preferenceText)) restrictions.push('banana');
        if (/\b(no\s+peanut|peanut[-\s]?free)\b/.test(preferenceText)) restrictions.push('peanut');
        const timeByCategory = {
          Breakfast: '08:00',
          Lunch: '13:00',
          Snack: '16:30',
          'Pre-Workout': '17:30',
          'Post-Workout': '18:30',
          Dinner: '20:30',
          Other: '11:00',
        };

        const recommendations = items.map((item, index) => {
          const ingredientsText = (item.ingredients || []).map((ingredient) => ingredient.name || '').join(' ').toLowerCase();
          const calories = Number(item.nutrients?.calories || 0);
          const matchedRestriction = restrictions.find((restriction) => ingredientsText.includes(restriction));
          const reasons = [];
          if (matchedRestriction) reasons.push(`Contains ${matchedRestriction}, which conflicts with your preference.`);
          if (calories > 1000) reasons.push(`${calories} kcal is a very large single meal; review portion size first.`);
          if (!reasons.length) reasons.push(`Fits the ${item.category || 'meal'} slot and uses a saved library recipe.`);
          const avoid = Boolean(matchedRestriction);
          return {
            id: item._id,
            name: item.name,
            category: item.category || 'Other',
            description: item.description || '',
            calories,
            protein: Number(item.nutrients?.protein || 0),
            dateStr: targetDate,
            timeStr: timeByCategory[item.category] || timeByCategory.Other,
            recommendation: avoid ? 'avoid' : 'recommended',
            defaultSelected: !avoid,
            reason: reasons.join(' '),
            plannerRules: DIET_PLANNER_RULES,
            order: index,
          };
        });

        res.json({
          success: true,
          dateStr: targetDate,
          prompt,
          rules: DIET_PLANNER_RULES,
          recommendations,
        });
      } catch (err) {
        console.error('Error creating AI diet plan review:', err);
        res.status(500).json({ error: err.message || 'Failed to prepare diet plan review.' });
      }
    });
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch diet items.' });
  }
});

/**
 * POST /api/diet/items
 * Create new diet item with per-ingredient nutrition breakdown saved
 */
router.post('/items', async (req, res) => {
  try {
    const { name, category, description, ingredients, nutrients, grokAnalysis } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Diet item name is required.' });
    }

    const rawIngredients = Array.isArray(ingredients) ? ingredients : [];
    const calculation = calculateDietItemBreakdown(rawIngredients);

    const savedIngredients = calculation.breakdown.map((b) => ({
      name: b.name,
      quantity: b.quantity,
      unit: b.unit,
      calories: b.calories,
      protein: b.protein,
      carbs: b.carbs,
      fats: b.fats,
    }));

    const finalNutrients = (nutrients && nutrients.calories > 0) ? nutrients : calculation.totals;

    const newItem = await DietItem.create({
      userId: 'admin',
      name: name.trim(),
      category: category || 'Breakfast',
      description: description ? description.trim() : '',
      ingredients: savedIngredients,
      nutrients: finalNutrients,
      grokAnalysis: grokAnalysis || '',
    });

    const itemObj = newItem.toObject();
    itemObj.ingredientBreakdown = calculation.breakdown;
    res.status(201).json(itemObj);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to save diet item.' });
  }
});

/**
 * PUT /api/diet/items/:id
 */
router.put('/items/:id', async (req, res) => {
  try {
    const updateData = { ...req.body };
    if (Array.isArray(updateData.ingredients)) {
      const calculation = calculateDietItemBreakdown(updateData.ingredients);
      updateData.ingredients = calculation.breakdown.map((b) => ({
        name: b.name,
        quantity: b.quantity,
        unit: b.unit,
        calories: b.calories,
        protein: b.protein,
        carbs: b.carbs,
        fats: b.fats,
      }));
      if (!updateData.nutrients || !updateData.nutrients.calories) {
        updateData.nutrients = calculation.totals;
      }
    }

    const updated = await DietItem.findByIdAndUpdate(req.params.id, updateData, { new: true }).lean();
    if (!updated) return res.status(404).json({ error: 'Diet item not found.' });

    const calculation = calculateDietItemBreakdown(updated.ingredients || []);
    updated.ingredientBreakdown = calculation.breakdown;
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to update diet item.' });
  }
});

/**
 * DELETE /api/diet/items/:id
 */
router.delete('/items/:id', async (req, res) => {
  try {
    const deleted = await DietItem.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Diet item not found.' });
    res.json({ success: true, message: 'Diet item deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete diet item.' });
  }
});

/**
 * GET /api/diet/daily-plan?date=YYYY-MM-DD
 * Get today's meals from Diet calendar, checklist status, and plan accuracy
 */
router.get('/daily-plan', async (req, res) => {
  try {
    const dietCal = await ensureDietCalendar();
    const dateQuery = req.query.date; // e.g. '2026-10-19'

    let targetDate = new Date();
    if (dateQuery && /^\d{4}-\d{2}-\d{2}$/.test(dateQuery)) {
      const [y, m, d] = dateQuery.split('-').map(Number);
      targetDate = new Date(y, m - 1, d);
    }

    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const events = await CalendarEvent.find({
      calendarId: dietCal._id,
      startAt: { $gte: startOfDay, $lte: endOfDay },
    }).sort({ startAt: 1 });

    let totalMeals = events.length;
    let completedMeals = 0;
    let totalPlannedCalories = 0;
    let totalCompletedCalories = 0;
    let totalPlannedProtein = 0;
    let totalCompletedProtein = 0;

    const formattedMeals = events.map((ev) => {
      const isCompleted = ev.status === 'completed';
      if (isCompleted) completedMeals++;

      // Extract calories and protein from description if present
      let calMatch = ev.description ? ev.description.match(/(\d+)\s*(?:kcal|calories)/i) : null;
      let proMatch = ev.description ? ev.description.match(/(\d+)\s*g?\s*(?:protein|pro)/i) : null;

      const calories = calMatch ? parseInt(calMatch[1], 10) : 0;
      const protein = proMatch ? parseInt(proMatch[1], 10) : 0;

      totalPlannedCalories += calories;
      totalPlannedProtein += protein;

      if (isCompleted) {
        totalCompletedCalories += calories;
        totalCompletedProtein += protein;
      }

      const s = new Date(ev.startAt);
      const hours = s.getHours();
      const minutes = s.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const formattedHours = hours % 12 || 12;
      const timeStr = `${String(formattedHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${ampm}`;

      return {
        _id: ev._id,
        title: ev.title,
        description: ev.description,
        startAt: ev.startAt,
        endAt: ev.endAt,
        timeStr,
        status: ev.status,
        isCompleted,
        calories,
        protein,
      };
    });

    const accuracyPercentage =
      totalMeals > 0 ? Math.round((completedMeals / totalMeals) * 100) : 0;

    res.json({
      success: true,
      calendarId: dietCal._id,
      date: dateQuery || targetDate.toISOString().slice(0, 10),
      stats: {
        totalMeals,
        completedMeals,
        pendingMeals: totalMeals - completedMeals,
        accuracyPercentage,
        totalPlannedCalories,
        totalCompletedCalories,
        totalPlannedProtein,
        totalCompletedProtein,
      },
      meals: formattedMeals,
    });
  } catch (err) {
    console.error('Error fetching daily plan:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch daily diet plan.' });
  }
});

/**
 * POST /api/diet/toggle-status/:eventId
 * Toggle meal completion status
 */
router.post('/toggle-status/:eventId', async (req, res) => {
  try {
    const event = await CalendarEvent.findById(req.params.eventId);
    if (!event) return res.status(404).json({ error: 'Meal event not found.' });

    const newStatus = event.status === 'completed' ? 'scheduled' : 'completed';
    event.status = newStatus;
    await event.save();

    res.json({
      success: true,
      eventId: event._id,
      status: event.status,
      isCompleted: event.status === 'completed',
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle meal status.' });
  }
});

/**
 * POST /api/diet/schedule-meal
 * Schedule a diet item on the Diet calendar
 */
router.post('/schedule-meal', async (req, res) => {
  try {
    const { title, dateStr, timeStr, description, calories, protein } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Meal title is required.' });
    }
    if (!dateStr || !timeStr) {
      return res.status(400).json({ error: 'Date and time are required.' });
    }

    const dietCal = await ensureDietCalendar();

    const [year, month, day] = dateStr.split('-').map(Number);
    const [hours, minutes] = timeStr.split(':').map(Number);

    const startAt = new Date(year, month - 1, day, hours, minutes, 0, 0);
    const endAt = new Date(startAt.getTime() + 30 * 60 * 1000); // 30 minutes duration

    let descCombined = description ? description.trim() : '';
    const macroParts = [];
    if (calories) macroParts.push(`${calories} kcal`);
    if (protein) macroParts.push(`${protein}g Protein`);
    if (macroParts.length > 0) {
      const macroLine = `Nutrition: ${macroParts.join(' | ')}`;
      descCombined = descCombined ? `${descCombined}\n${macroLine}` : macroLine;
    }

    const event = await CalendarEvent.create({
      calendarId: dietCal._id,
      userId: 'admin',
      title: title.trim(),
      description: descCombined,
      startAt,
      endAt,
      isAllDay: false,
      priority: 'medium',
      status: 'scheduled',
      reminders: [
        {
          offsetMinutes: 15,
          reminderType: 'notification',
          isEnabled: true,
        },
      ],
    });

    res.status(201).json({ success: true, event });
  } catch (err) {
    console.error('Error scheduling meal:', err);
    res.status(500).json({ error: err.message || 'Failed to schedule meal.' });
  }
});

/**
 * DELETE /api/diet/remove-meal/:eventId
 */
router.delete('/remove-meal/:eventId', async (req, res) => {
  try {
    await CalendarEvent.findByIdAndDelete(req.params.eventId);
    res.json({ success: true, message: 'Meal removed from schedule.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove meal.' });
  }
});

/**
 * GET /api/diet/calorie-history
 * Returns planned and completed calories per day from Diet calendar events.
 */
router.get('/calorie-history', async (req, res) => {
  try {
    const dietCal = await ensureDietCalendar();
    const end = req.query.end ? new Date(`${req.query.end}T23:59:59`) : new Date();
    const start = req.query.start
      ? new Date(`${req.query.start}T00:00:00`)
      : new Date(end.getTime() - 13 * 24 * 60 * 60 * 1000);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return res.status(400).json({ error: 'Invalid start or end date.' });
    }

    const events = await CalendarEvent.find({
      userId: 'admin',
      calendarId: dietCal._id,
      startAt: { $gte: start, $lte: end },
    }).sort({ startAt: 1 }).lean();

    const byDate = {};
    for (const event of events) {
      const eventDate = new Date(event.startAt);
      const date = `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, '0')}-${String(eventDate.getDate()).padStart(2, '0')}`;
      const match = String(event.description || '').match(/(\d+(?:\.\d+)?)\s*(?:kcal|calories)/i);
      const calories = match ? Math.round(Number(match[1])) : 0;
      if (!byDate[date]) byDate[date] = { date, plannedCalories: 0, completedCalories: 0, meals: 0, completedMeals: 0 };
      byDate[date].plannedCalories += calories;
      byDate[date].meals += 1;
      if (event.status === 'completed') {
        byDate[date].completedCalories += calories;
        byDate[date].completedMeals += 1;
      }
    }

    const history = [];
    for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
      const date = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
      history.push(byDate[date] || { date, plannedCalories: 0, completedCalories: 0, meals: 0, completedMeals: 0 });
    }
    res.json({ success: true, calendarId: dietCal._id, history });
  } catch (err) {
    console.error('Error fetching diet calorie history:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch calorie history.' });
  }
});

module.exports = router;
