function normalizeInstruction(instruction = '') {
  return String(instruction)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function classifyRoutineOperation(instruction = '') {
  const normalized = normalizeInstruction(instruction);
  const hasDeleteVerb =
    /\b(delete|delet|remove|remov|clear|erase|wipe|hata|hatana|nikal|nikalna)\b/.test(normalized);
  const hasNegation = /\b(don t|dont|do not|not|without|never)\s+(delete|delet|remove|remov|clear|erase|wipe)\b/.test(
    normalized
  );

  // The selected calendar is already the target. Treat a clear verb as destructive
  // even when the user gives a short command such as "delete" or "hata do".
  if (hasDeleteVerb && !hasNegation) {
    return 'clear-calendar';
  }
  return 'create-routine';
}

module.exports = {
  classifyRoutineOperation,
  normalizeInstruction,
};
