 /**
 * Precision Nutrition & Dietary Macro Breakdown Service
 * Provides ingredient-level calories, protein, carbs, and fats calculation.
 */

// Food database with nutritional density values (per 100g or per standard piece)
const NUTRITION_DATABASE = [
  // Fruits
  { match: /banana|kele/i, calPerPiece: 105, proPerPiece: 1.3, carbPerPiece: 27, fatPerPiece: 0.3, calPer100g: 89, proPer100g: 1.1, carbPer100g: 23, fatPer100g: 0.3 },
  { match: /apple|seb/i, calPerPiece: 95, proPerPiece: 0.5, carbPerPiece: 25, fatPerPiece: 0.3, calPer100g: 52, proPer100g: 0.3, carbPer100g: 14, fatPer100g: 0.2 },
  { match: /berry|berries|strawberry|blueberry/i, calPerPiece: 15, proPerPiece: 0.3, carbPerPiece: 3.5, fatPerPiece: 0.1, calPer100g: 45, proPer100g: 0.8, carbPer100g: 10, fatPer100g: 0.4 },
  { match: /mango|aam/i, calPerPiece: 150, proPerPiece: 1.5, carbPerPiece: 38, fatPerPiece: 0.6, calPer100g: 60, proPer100g: 0.8, carbPer100g: 15, fatPer100g: 0.4 },

  // Dairy & Alternatives
  { match: /toned milk|milk|doodh/i, calPer100ml: 60, proPer100ml: 3.2, carbPer100ml: 4.8, fatPer100ml: 3.1 },
  { match: /almond milk/i, calPer100ml: 25, proPer100ml: 1.0, carbPer100ml: 1.5, fatPer100ml: 1.8 },
  { match: /curd|yogurt|dahi/i, calPer100g: 65, proPer100g: 4.0, carbPer100g: 4.5, fatPer100g: 3.5 },
  { match: /paneer|cottage cheese/i, calPer100g: 265, proPer100g: 18.0, carbPer100g: 3.5, fatPer100g: 20.0 },
  { match: /tofu/i, calPer100g: 76, proPer100g: 8.0, carbPer100g: 1.9, fatPer100g: 4.8 },

  // Protein Powders & Supplements
  { match: /whey|protein powder|isolate/i, calPerScoop: 120, proPerScoop: 24.0, carbPerScoop: 2.5, fatPerScoop: 1.5, calPer100g: 380, proPer100g: 78.0, carbPer100g: 8.0, fatPer100g: 5.0 },
  { match: /creatine/i, calPerScoop: 0, proPerScoop: 0, carbPerScoop: 0, fatPerScoop: 0 },

  // Nuts, Seeds & Nut Butters
  { match: /peanut butter|almond butter/i, calPerTbsp: 95, proPerTbsp: 4.0, carbPerTbsp: 3.2, fatPerTbsp: 8.0, calPer100g: 590, proPer100g: 25.0, carbPer100g: 20.0, fatPer100g: 50.0 },
  { match: /peanut|moongfali/i, calPerTbsp: 80, proPerTbsp: 3.5, carbPerTbsp: 2.5, fatPerTbsp: 7.0, calPer100g: 567, proPer100g: 25.8, carbPer100g: 16.1, fatPer100g: 49.2 },
  { match: /almond|badam/i, calPerPiece: 7, proPerPiece: 0.25, carbPerPiece: 0.25, fatPerPiece: 0.6, calPerTbsp: 80, proPerTbsp: 3.0, carbPerTbsp: 3.0, fatPerTbsp: 7.0, calPer100g: 579, proPer100g: 21.2, carbPer100g: 21.6, fatPer100g: 49.9 },
  { match: /chia seed|chia/i, calPerTbsp: 60, proPerTbsp: 2.0, carbPerTbsp: 5.0, fatPerTbsp: 4.0, calPer100g: 486, proPer100g: 16.5, carbPer100g: 42.1, fatPer100g: 30.7 },
  { match: /flax seed|alsi/i, calPerTbsp: 55, proPerTbsp: 1.9, carbPerTbsp: 3.0, fatPerTbsp: 4.3, calPer100g: 534, proPer100g: 18.3, carbPer100g: 28.9, fatPer100g: 42.2 },

  // Grains & Oats
  { match: /oat|oats/i, calPerTbsp: 35, proPerTbsp: 1.3, carbPerTbsp: 6.0, fatPerTbsp: 0.6, calPerCup: 150, proPerCup: 5.0, carbPerCup: 27.0, fatPerCup: 2.5, calPer100g: 375, proPer100g: 13.5, carbPer100g: 68.0, fatPer100g: 6.5 },
  { match: /rice|chawal/i, calPerCup: 205, proPerCup: 4.2, carbPerCup: 45.0, fatPerCup: 0.4, calPer100g: 130, proPer100g: 2.7, carbPer100g: 28.0, fatPer100g: 0.3 },
  { match: /roti|chapati/i, calPerPiece: 85, proPerPiece: 3.0, carbPerPiece: 17.0, fatPerPiece: 0.8 },

  // Legumes & Pulses (Sabut Moong, Kala Chana, Dal)
  { match: /sabut moong|moong|green gram/i, calPerTbsp: 35, proPerTbsp: 2.4, carbPerTbsp: 6.0, fatPerTbsp: 0.1, calPerCup: 210, proPerCup: 14.0, carbPerCup: 38.0, fatPerCup: 0.8, calPer100g: 347, proPer100g: 24.0, carbPer100g: 60.0, fatPer100g: 1.2 },
  { match: /kala chana|chana|chickpea/i, calPerTbsp: 38, proPerTbsp: 2.1, carbPerTbsp: 6.5, fatPerTbsp: 0.5, calPerCup: 270, proPerCup: 14.5, carbPerCup: 45.0, fatPerCup: 4.0, calPer100g: 364, proPer100g: 19.3, carbPer100g: 60.9, fatPer100g: 6.0 },
  { match: /dal|lentil/i, calPerCup: 230, proPerCup: 18.0, carbPerCup: 40.0, fatPerCup: 0.8, calPer100g: 350, proPer100g: 24.0, carbPer100g: 60.0, fatPer100g: 1.5 },

  // Eggs & Meat
  { match: /egg white/i, calPerPiece: 17, proPerPiece: 3.6, carbPerPiece: 0.2, fatPerPiece: 0.1 },
  { match: /egg|anda/i, calPerPiece: 74, proPerPiece: 6.3, carbPerPiece: 0.4, fatPerPiece: 5.0 },
  { match: /chicken breast|chicken/i, calPer100g: 165, proPer100g: 31.0, carbPer100g: 0.0, fatPer100g: 3.6 },
  { match: /fish/i, calPer100g: 120, proPer100g: 22.0, carbPer100g: 0.0, fatPer100g: 3.0 },

  // Veggies & Potatoes
  { match: /aloo|potato|potatoes/i, calPerPiece: 130, proPerPiece: 3.0, carbPerPiece: 30.0, fatPerPiece: 0.2, calPer100g: 87, proPer100g: 1.9, carbPer100g: 20.1, fatPer100g: 0.1 },
  { match: /chaat masala|spices|masala|salt/i, calPerTsp: 4, proPerTsp: 0.1, carbPerTsp: 0.8, fatPerTsp: 0.1 },
  { match: /onion|pyaz/i, calPerPiece: 40, proPerPiece: 1.1, carbPerPiece: 9.3, fatPerPiece: 0.1, calPer100g: 40, proPer100g: 1.1, carbPer100g: 9.3, fatPer100g: 0.1 },
  { match: /tomato|tamatar/i, calPerPiece: 22, proPerPiece: 1.1, carbPerPiece: 4.8, fatPerPiece: 0.2, calPer100g: 18, proPer100g: 0.9, carbPer100g: 3.9, fatPer100g: 0.2 },

  // Fats & Oils
  { match: /ghee|butter/i, calPerTbsp: 112, proPerTbsp: 0.0, carbPerTbsp: 0.0, fatPerTbsp: 12.7, calPerTsp: 37, proPerTsp: 0.0, carbPerTsp: 0.0, fatPerTsp: 4.2 },
  { match: /olive oil|oil|tel/i, calPerTbsp: 120, proPerTbsp: 0.0, carbPerTbsp: 0.0, fatPerTbsp: 13.6, calPerTsp: 40, proPerTsp: 0.0, carbPerTsp: 0.0, fatPerTsp: 4.5 },
];

/**
 * Calculate nutrition for a single ingredient
 */
function calculateSingleIngredientNutrition(name, quantity = 1, unit = 'gram') {
  const cleanName = (name || '').trim();
  const q = Number(quantity) || 1;
  const u = (unit || 'gram').toLowerCase();

  // Find match in database
  const entry = NUTRITION_DATABASE.find((item) => item.match.test(cleanName));

  let calories = 0;
  let protein = 0;
  let carbs = 0;
  let fats = 0;

  if (entry) {
    if (u === 'piece' && entry.calPerPiece !== undefined) {
      calories = entry.calPerPiece * q;
      protein = (entry.proPerPiece || 0) * q;
      carbs = (entry.carbPerPiece || 0) * q;
      fats = (entry.fatPerPiece || 0) * q;
    } else if (u === 'scoop' && entry.calPerScoop !== undefined) {
      calories = entry.calPerScoop * q;
      protein = (entry.proPerScoop || 0) * q;
      carbs = (entry.carbPerScoop || 0) * q;
      fats = (entry.fatPerScoop || 0) * q;
    } else if (u === 'tablespoon' && entry.calPerTbsp !== undefined) {
      calories = entry.calPerTbsp * q;
      protein = (entry.proPerTbsp || 0) * q;
      carbs = (entry.carbPerTbsp || 0) * q;
      fats = (entry.fatPerTbsp || 0) * q;
    } else if (u === 'teaspoon' && (entry.calPerTsp !== undefined || entry.calPerTbsp !== undefined)) {
      const perTsp = entry.calPerTsp !== undefined ? entry.calPerTsp : (entry.calPerTbsp / 3);
      const proTsp = entry.proPerTsp !== undefined ? entry.proPerTsp : ((entry.proPerTbsp || 0) / 3);
      const carbTsp = entry.carbPerTsp !== undefined ? entry.carbPerTsp : ((entry.carbPerTbsp || 0) / 3);
      const fatTsp = entry.fatPerTsp !== undefined ? entry.fatPerTsp : ((entry.fatPerTbsp || 0) / 3);
      calories = perTsp * q;
      protein = proTsp * q;
      carbs = carbTsp * q;
      fats = fatTsp * q;
    } else if (u === 'cup' && entry.calPerCup !== undefined) {
      calories = entry.calPerCup * q;
      protein = (entry.proPerCup || 0) * q;
      carbs = (entry.carbPerCup || 0) * q;
      fats = (entry.fatPerCup || 0) * q;
    } else if (u === 'ml' && entry.calPer100ml !== undefined) {
      const f = q / 100;
      calories = entry.calPer100ml * f;
      protein = (entry.proPer100ml || 0) * f;
      carbs = (entry.carbPer100ml || 0) * f;
      fats = (entry.fatPer100ml || 0) * f;
    } else {
      // Default weight-based conversion (grams)
      let gramWeight = q;
      if (u === 'tablespoon') gramWeight = q * 15;
      else if (u === 'teaspoon') gramWeight = q * 5;
      else if (u === 'scoop') gramWeight = q * 30;
      else if (u === 'cup') gramWeight = q * 120;
      else if (u === 'piece') gramWeight = q * 60;
      else if (u === 'ml') gramWeight = q * 1;

      const f = gramWeight / 100;
      const cal100 = entry.calPer100g || entry.calPer100ml || 100;
      const pro100 = entry.proPer100g || entry.proPer100ml || 5;
      const carb100 = entry.carbPer100g || entry.carbPer100ml || 15;
      const fat100 = entry.fatPer100g || entry.fatPer100ml || 2;

      calories = cal100 * f;
      protein = pro100 * f;
      carbs = carb100 * f;
      fats = fat100 * f;
    }
  } else {
    // Generic heuristic based on unit
    let gramWeight = q;
    if (u === 'tablespoon') gramWeight = q * 15;
    else if (u === 'teaspoon') gramWeight = q * 5;
    else if (u === 'scoop') gramWeight = q * 30;
    else if (u === 'cup') gramWeight = q * 100;
    else if (u === 'piece') gramWeight = q * 50;

    calories = gramWeight * 1.5;
    protein = gramWeight * 0.05;
    carbs = gramWeight * 0.20;
    fats = gramWeight * 0.04;
  }

  return {
    name: cleanName,
    quantity: q,
    unit: u,
    calories: Math.round(calories),
    protein: Number(protein.toFixed(1)),
    carbs: Number(carbs.toFixed(1)),
    fats: Number(fats.toFixed(1)),
  };
}

/**
 * Calculate full ingredient breakdown & macro summary for a meal
 */
function calculateDietItemBreakdown(ingredients = []) {
  if (!Array.isArray(ingredients) || ingredients.length === 0) {
    return {
      breakdown: [],
      totals: { calories: 0, protein: 0, carbs: 0, fats: 0 },
    };
  }

  let totalCal = 0;
  let totalPro = 0;
  let totalCarb = 0;
  let totalFat = 0;

  const breakdown = ingredients.map((ing) => {
    // If ingredient already has pre-computed calories > 0, use them
    let itemNutr;
    if (ing.calories && ing.calories > 0) {
      itemNutr = {
        name: ing.name,
        quantity: ing.quantity,
        unit: ing.unit,
        calories: Math.round(Number(ing.calories)),
        protein: Number(Number(ing.protein || 0).toFixed(1)),
        carbs: Number(Number(ing.carbs || 0).toFixed(1)),
        fats: Number(Number(ing.fats || 0).toFixed(1)),
      };
    } else {
      itemNutr = calculateSingleIngredientNutrition(ing.name, ing.quantity, ing.unit);
    }

    totalCal += itemNutr.calories;
    totalPro += itemNutr.protein;
    totalCarb += itemNutr.carbs;
    totalFat += itemNutr.fats;

    return itemNutr;
  });

  // Calculate percentage share of each ingredient
  const enrichedBreakdown = breakdown.map((item) => {
    const pct = totalCal > 0 ? Math.round((item.calories / totalCal) * 100) : 0;
    return {
      ...item,
      percentOfTotal: pct,
    };
  });

  return {
    breakdown: enrichedBreakdown,
    totals: {
      calories: Math.round(totalCal),
      protein: Math.round(totalPro),
      carbs: Math.round(totalCarb),
      fats: Math.round(totalFat),
    },
  };
}

module.exports = {
  calculateSingleIngredientNutrition,
  calculateDietItemBreakdown,
};
