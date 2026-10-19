const mongoose = require('mongoose');

const IngredientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, default: 1 },
    unit: {
      type: String,
      enum: ['tablespoon', 'teaspoon', 'gram', 'ml', 'scoop', 'cup', 'piece'],
      default: 'gram',
    },
  },
  { _id: false }
);

const DietItemSchema = new mongoose.Schema(
  {
    userId: { type: String, default: 'admin', index: true },
    name: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['Breakfast', 'Pre-Workout', 'Post-Workout', 'Lunch', 'Snack', 'Dinner', 'Other'],
      default: 'Breakfast',
    },
    description: { type: String, default: '' },
    ingredients: [IngredientSchema],
    nutrients: {
      calories: { type: Number, default: 0 }, // in kcal
      protein: { type: Number, default: 0 },  // in grams
      carbs: { type: Number, default: 0 },    // in grams
      fats: { type: Number, default: 0 },     // in grams
    },
    grokAnalysis: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.models.DietItem || mongoose.model('DietItem', DietItemSchema);
