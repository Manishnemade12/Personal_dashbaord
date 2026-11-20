const NqtSubject = require('../models/nqt/NqtSubject');
const NqtTopic = require('../models/nqt/NqtTopic');
const { PATTERN_PROFILE, TOPICS } = require('../data/nqtCatalog');

async function ensureNqtCatalog() {
  await Promise.all([
    NqtSubject.bulkWrite(PATTERN_PROFILE.subjects.map((subject) => ({
      updateOne: {
        filter: { subjectId: subject.subjectId },
        update: { $set: subject },
        upsert: true,
      },
    })), { ordered: false }),
    NqtTopic.bulkWrite(TOPICS.map((topic) => ({
      updateOne: {
        filter: { topicId: topic.topicId },
        update: { $set: topic },
        upsert: true,
      },
    })), { ordered: false }),
  ]);
}

function toClientCatalog(subjects, topics) {
  return {
    patternProfile: PATTERN_PROFILE,
    subjects: subjects.map((subject) => ({
      id: subject.subjectId,
      name: subject.name,
      section: subject.section,
      examWeight: subject.examWeight,
      order: subject.orderIndex,
    })),
    topics: topics.map((topic) => ({
      id: topic.topicId,
      subjectId: topic.subjectId,
      name: topic.name,
      importance: topic.importance,
      frequency: topic.frequency,
      difficulty: topic.difficulty,
    })),
  };
}

module.exports = { ensureNqtCatalog, toClientCatalog, PATTERN_PROFILE, TOPICS };
