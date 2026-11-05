const TIME_PATTERN = /\b(?:to|at|around|from|starting\s+(?:at|from))\s+([01]?\d|2[0-3])(?::([0-5]\d))?\s*(am|pm)?\b/i;

const parseTime = (text) => {
  const match = text.match(TIME_PATTERN);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2] || 0);
  if (match[3]?.toLowerCase() === 'pm' && hour < 12) hour += 12;
  if (match[3]?.toLowerCase() === 'am' && hour === 12) hour = 0;
  return { match, hour, minute };
};

const classifyDraftOperation = (message) => {
  const lower = String(message || '').trim().toLowerCase();
  const time = parseTime(lower);
  const planWords = /\b(?:draft\s+)?(?:plan|routine|schedule)\b/;
  const planStart = time && /\b(?:start|begin|shift|move)\b/.test(lower) && planWords.test(lower);
  const regenerate = time &&
    /\b(?:regenerate|recreate|rebuild|create\s+(?:a\s+)?new|make\s+(?:a\s+)?new|replace)\b/.test(lower) &&
    planWords.test(lower);
  const remove = /\b(?:remove|delete|drop|skip)\b/.test(lower);
  const all = /\b(?:all|everything|existing|things|events)\b/.test(lower);

  if (regenerate || (planStart && remove)) {
    return { type: 'replace-plan', ...time };
  }
  if (planStart) {
    return { type: 'shift-plan', ...time };
  }
  if (remove) {
    return { type: all ? 'remove-all' : 'remove-event', ...time };
  }
  if (time && /\b(?:move|shift|reschedule|schedule)\b/.test(lower)) {
    return { type: 'move-event', ...time };
  }
  if (/\b(?:why|explain|conflict|overlap|busy)\b/.test(lower)) return { type: 'explain' };
  if (/\b(?:what|which|show|list)\b/.test(lower)) return { type: 'list' };
  return { type: 'unknown' };
};

const extractEventTarget = (message, timeMatch) => String(message || '')
  .toLowerCase()
  .replace(timeMatch || '', '')
  .replace(/\b(move|shift|reschedule|schedule|start|begin|remove|delete|drop|skip|the|draft|plan|routine|from|to|at|around|please)\b/g, '')
  .replace(/\s+/g, ' ')
  .trim();

module.exports = { classifyDraftOperation, extractEventTarget };
