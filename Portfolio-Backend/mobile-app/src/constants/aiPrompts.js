/**
 * Editable AI prompt presets used by the Calendar AI Routine planner.
 *
 * These are user-facing starting prompts, not hidden system instructions.
 * The selected text is sent as the user's goal to the calendar AI service.
 * Keep them short and actionable so users can edit them without touching UI
 * layout or planner logic.
 */
export const AI_ROUTINE_CATEGORIES = [
  { id: 'study', label: 'Study & Exams', icon: 'book-outline', template: '4-hour deep study session: DSA, theory revision & challenge problems with short breaks' },
  { id: 'diet', label: 'Diet & Nutrition', icon: 'restaurant-outline', template: 'High-protein clean diet routine: hydration, pre/post workout nutrition & meal timings' },
  { id: 'workout', label: 'Workout & Fitness', icon: 'barbell-outline', template: 'Daily fitness schedule: mobility warm-up, heavy strength training, and recovery walk' },
  { id: 'work', label: 'Work & Projects', icon: 'briefcase-outline', template: 'Focused deep work sprint: priority tasks, code review, and goal execution' },
  { id: 'general', label: 'General Routine', icon: 'sparkles-outline', template: 'Balanced daily routine with prioritized focus blocks, hydration, and breaks' },
];

export const AI_ROUTINE_SUGGESTIONS = [
  { label: '📚 4h DSA + Coding Sprint', category: 'study', text: '4 hours DSA: Trees, Dynamic Programming & LeetCode problems with breaks' },
  { label: '🥗 High-Protein Diet & Hydration', category: 'diet', text: '5-meal high-protein diet routine with hydration and shake reminders' },
  { label: '🏋️ Morning Workout & Cardio', category: 'workout', text: 'Morning workout: dynamic warm-up, strength lifting & evening 5k walk' },
  { label: '💼 Full-Day Deep Work Sprint', category: 'work', text: 'Deep work sprint: finish priority roadmap milestones and review pull requests' },
];
