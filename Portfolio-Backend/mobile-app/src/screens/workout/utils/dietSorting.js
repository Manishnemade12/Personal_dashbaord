const CATEGORY_START_MINUTES = {
  Breakfast: 8 * 60,
  'Pre-Workout': 17 * 60,
  'Post-Workout': 18 * 60 + 30,
  Lunch: 13 * 60 + 30,
  Snack: 16 * 60,
  Dinner: 20 * 60 + 30,
  Other: 23 * 60,
};

const getDateValue = (value) => {
  const timestamp = new Date(value || 0).getTime();
  return Number.isFinite(timestamp) ? timestamp : Number.MAX_SAFE_INTEGER;
};

export const sortScheduledMeals = (meals = []) =>
  [...meals].sort((a, b) => {
    const timeDifference = getDateValue(a.startAt) - getDateValue(b.startAt);
    if (timeDifference !== 0) return timeDifference;
    return String(a.title || '').localeCompare(String(b.title || ''));
  });

export const sortDietLibraryItems = (items = []) =>
  [...items].sort((a, b) => {
    const categoryDifference =
      (CATEGORY_START_MINUTES[a.category] ?? CATEGORY_START_MINUTES.Other) -
      (CATEGORY_START_MINUTES[b.category] ?? CATEGORY_START_MINUTES.Other);
    if (categoryDifference !== 0) return categoryDifference;

    const createdDifference = getDateValue(b.createdAt) - getDateValue(a.createdAt);
    if (createdDifference !== 0) return createdDifference;
    return String(a.name || '').localeCompare(String(b.name || ''));
  });
