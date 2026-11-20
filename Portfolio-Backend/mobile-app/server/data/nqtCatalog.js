const PATTERN_PROFILE = {
  id: 'tcs_all_india_nqt_2026',
  totalMinutes: 190,
  sections: [
    { id: 'foundation', name: 'Foundation', minutes: 75 },
    { id: 'advanced', name: 'Advanced', minutes: 115 },
  ],
  sources: [
    'https://www.tcs.com/careers/india/tcs-all-india-nqt-hiring',
    'https://www.tcsion.com/hub/national-qualifier-test/',
  ],
  topicPriorityNote: 'Importance and frequency are preparation priorities, not official TCS percentages.',
  subjects: [
    { subjectId: 'nqt_numerical', name: 'Numerical Ability', section: 'Foundation', minutes: 25, examWeight: 1.25, orderIndex: 1 },
    { subjectId: 'nqt_verbal', name: 'Verbal Ability', section: 'Foundation', minutes: 25, examWeight: 1.1, orderIndex: 2 },
    { subjectId: 'nqt_reasoning', name: 'Reasoning Ability', section: 'Foundation', minutes: 25, examWeight: 1.2, orderIndex: 3 },
    { subjectId: 'nqt_advanced', name: 'Advanced Quantitative & Reasoning', section: 'Advanced', minutes: 25, examWeight: 1.15, orderIndex: 4 },
    { subjectId: 'nqt_coding', name: 'Advanced Coding Logic', section: 'Advanced', minutes: 90, examWeight: 0.85, orderIndex: 5 },
  ],
};

// Importance/frequency are curated preparation-priority signals, not official TCS question percentages.
const TOPICS = [
  { topicId: 'num_percent', subjectId: 'nqt_numerical', name: 'Percentages & Profit/Loss', importance: 5, frequency: 5, difficulty: 'medium' },
  { topicId: 'num_ratio', subjectId: 'nqt_numerical', name: 'Ratio, Proportion & Mixtures', importance: 4, frequency: 4, difficulty: 'medium' },
  { topicId: 'num_average', subjectId: 'nqt_numerical', name: 'Averages & Ages', importance: 4, frequency: 4, difficulty: 'easy' },
  { topicId: 'num_work', subjectId: 'nqt_numerical', name: 'Time & Work', importance: 5, frequency: 4, difficulty: 'hard' },
  { topicId: 'num_speed', subjectId: 'nqt_numerical', name: 'Time, Speed & Distance', importance: 4, frequency: 4, difficulty: 'medium' },
  { topicId: 'num_di', subjectId: 'nqt_numerical', name: 'Data Interpretation', importance: 5, frequency: 5, difficulty: 'hard' },
  { topicId: 'num_number', subjectId: 'nqt_numerical', name: 'Number System & Remainders', importance: 4, frequency: 4, difficulty: 'medium' },
  { topicId: 'num_interest', subjectId: 'nqt_numerical', name: 'Simple & Compound Interest', importance: 4, frequency: 3, difficulty: 'medium' },
  { topicId: 'num_mensuration', subjectId: 'nqt_numerical', name: 'Mensuration & Geometry', importance: 4, frequency: 3, difficulty: 'medium' },
  { topicId: 'reason_series', subjectId: 'nqt_reasoning', name: 'Number & Letter Series', importance: 4, frequency: 4, difficulty: 'medium' },
  { topicId: 'reason_arrange', subjectId: 'nqt_reasoning', name: 'Arrangements & Puzzles', importance: 5, frequency: 5, difficulty: 'hard' },
  { topicId: 'reason_syllogism', subjectId: 'nqt_reasoning', name: 'Syllogisms & Deductions', importance: 4, frequency: 4, difficulty: 'medium' },
  { topicId: 'reason_direction', subjectId: 'nqt_reasoning', name: 'Directions & Spatial Reasoning', importance: 3, frequency: 3, difficulty: 'easy' },
  { topicId: 'reason_coding', subjectId: 'nqt_reasoning', name: 'Coding-Decoding & Patterns', importance: 4, frequency: 4, difficulty: 'medium' },
  { topicId: 'reason_data', subjectId: 'nqt_reasoning', name: 'Data Sufficiency & Analysis', importance: 4, frequency: 4, difficulty: 'hard' },
  { topicId: 'verb_grammar', subjectId: 'nqt_verbal', name: 'Grammar & Sentence Correction', importance: 4, frequency: 4, difficulty: 'medium' },
  { topicId: 'verb_rc', subjectId: 'nqt_verbal', name: 'Reading Comprehension', importance: 5, frequency: 4, difficulty: 'medium' },
  { topicId: 'verb_para', subjectId: 'nqt_verbal', name: 'Para Jumbles & Coherence', importance: 4, frequency: 4, difficulty: 'medium' },
  { topicId: 'verb_vocab', subjectId: 'nqt_verbal', name: 'Vocabulary in Context', importance: 3, frequency: 3, difficulty: 'easy' },
  { topicId: 'verb_usage', subjectId: 'nqt_verbal', name: 'Usage, Connectors & Completion', importance: 4, frequency: 3, difficulty: 'medium' },
  { topicId: 'adv_probability', subjectId: 'nqt_advanced', name: 'Probability & Counting', importance: 5, frequency: 4, difficulty: 'hard' },
  { topicId: 'adv_algebra', subjectId: 'nqt_advanced', name: 'Algebra & Number Properties', importance: 5, frequency: 4, difficulty: 'hard' },
  { topicId: 'adv_data', subjectId: 'nqt_advanced', name: 'Advanced Data Reasoning', importance: 4, frequency: 4, difficulty: 'hard' },
  { topicId: 'adv_geometry', subjectId: 'nqt_advanced', name: 'Geometry & Mensuration', importance: 4, frequency: 3, difficulty: 'medium' },
  { topicId: 'code_trace', subjectId: 'nqt_coding', name: 'Code Tracing & Loops', importance: 4, frequency: 4, difficulty: 'medium' },
  { topicId: 'code_arrays', subjectId: 'nqt_coding', name: 'Arrays, Algorithms & Complexity', importance: 5, frequency: 4, difficulty: 'hard' },
  { topicId: 'code_logic', subjectId: 'nqt_coding', name: 'Programming Logic & Problem Solving', importance: 5, frequency: 4, difficulty: 'hard' },
];

module.exports = { PATTERN_PROFILE, TOPICS };
