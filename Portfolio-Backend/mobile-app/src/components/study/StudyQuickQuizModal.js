import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { StudyDao } from '../../db/dao/StudyDao';

export default function StudyQuickQuizModal({
  visible,
  onClose,
  subjects = [],
  chunks = [],
  defaultSubjectId = null,
  onQuizReady,
}) {
  const [selectedSubjectId, setSelectedSubjectId] = useState(
    defaultSubjectId || subjects[0]?.id || ''
  );
  const [difficulty, setDifficulty] = useState('medium'); // 'easy' | 'medium' | 'hard' | 'mixed'
  const [questionCount, setQuestionCount] = useState(10);
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!selectedSubjectId) {
      Alert.alert('Notice', 'Please choose a subject for the quiz.');
      return;
    }

    setGenerating(true);
    try {
      // 1. Gather notes for subject
      const subjectChunks = chunks.filter((c) => c.subjectId === selectedSubjectId && !c.isDeleted);
      const notesCombined = subjectChunks.map((c) => `# ${c.title}\n${c.notes}`).join('\n\n');

      let questions = [];
      try {
        const res = await api.post('/study/ai/generate-quiz', {
          subjectId: selectedSubjectId,
          difficulty,
          count: questionCount,
          notes: notesCombined,
        });
        questions = res?.questions || [];
      } catch (apiErr) {
        console.warn('[QuizGenerateDialog] Cloud AI failed, checking local chunk quizzes...', apiErr);
      }

      // If AI produced questions, use them; otherwise pool questions from chunk quiz arrays
      if (!questions || questions.length === 0) {
        const pooled = subjectChunks.flatMap((c) => c.quiz || []).filter((q) => q.question);
        if (pooled.length > 0) {
          questions = pooled.slice(0, questionCount).map((q) => ({
            question: q.question,
            type: 'mcq',
            options: q.options || ['Option A', 'Option B', 'Option C', 'Option D'],
            answer: q.answer,
            explanation: q.explanation || 'From chapter quiz.',
          }));
        }
      }

      if (!questions || questions.length === 0) {
        // Generate fallback
        questions = [
          {
            question: 'Which of the following represents a primary focus of this subject?',
            type: 'mcq',
            options: [
              'Core principles and conceptual clarity',
              'Unverified assumptions',
              'Random estimates',
              'Irrelevant facts',
            ],
            answer: 'Core principles and conceptual clarity',
            explanation: 'Exam-focused preparation emphasizes verified facts and concepts.',
          },
        ];
      }

      // Save generated quiz to SQLite
      const todayStr = new Date().toISOString().split('T')[0];
      const savedQuiz = await StudyDao.saveDailyQuiz({
        subjectId: selectedSubjectId,
        quizDate: todayStr,
        questions,
        difficulty,
        source: 'ai',
      });

      setGenerating(false);
      onClose();
      onQuizReady?.(selectedSubjectId, savedQuiz.id);
    } catch (err) {
      setGenerating(false);
      Alert.alert('Error', err.message || 'Failed to generate quiz');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.dialogCard}>
          {/* Header */}
          <View style={styles.dialogHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={styles.iconWrap}>
                <Ionicons name="bulb-outline" size={18} color="#f59e0b" />
              </View>
              <View>
                <Text style={styles.dialogTitle}>Generate Quiz</Text>
                <Text style={styles.dialogSubtitle}>
                  Create custom SSC MCQs from your notes
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          {/* Form */}
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Subject Selector */}
            <View style={styles.section}>
              <Text style={styles.label}>Select Subject:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ gap: 6 }}>
                {subjects.map((s) => {
                  const isSel = selectedSubjectId === s.id;
                  return (
                    <TouchableOpacity
                      key={s.id}
                      style={[styles.chip, isSel && styles.chipActive]}
                      onPress={() => setSelectedSubjectId(s.id)}
                    >
                      <Text style={[styles.chipText, isSel && styles.chipTextActive]}>
                        {s.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Difficulty Selector */}
            <View style={styles.section}>
              <Text style={styles.label}>Difficulty Level:</Text>
              <View style={styles.btnRow}>
                {['easy', 'medium', 'hard', 'mixed'].map((lvl) => {
                  const isSel = difficulty === lvl;
                  return (
                    <TouchableOpacity
                      key={lvl}
                      style={[styles.segmentBtn, isSel && styles.segmentBtnActive]}
                      onPress={() => setDifficulty(lvl)}
                    >
                      <Text style={[styles.segmentText, isSel && styles.segmentTextActive]}>
                        {lvl.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Number of Questions */}
            <View style={styles.section}>
              <Text style={styles.label}>Question Count:</Text>
              <View style={styles.btnRow}>
                {[5, 10, 15, 20].map((num) => {
                  const isSel = questionCount === num;
                  return (
                    <TouchableOpacity
                      key={num}
                      style={[styles.segmentBtn, isSel && styles.segmentBtnActive]}
                      onPress={() => setQuestionCount(num)}
                    >
                      <Text style={[styles.segmentText, isSel && styles.segmentTextActive]}>
                        {num} Qs
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footerRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={generating}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={handleGenerate}
              disabled={generating}
            >
              {generating ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="play" size={16} color="#ffffff" />
                  <Text style={styles.confirmBtnText}>Start Quiz</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: '#0f172a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 20,
  },
  dialogHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    marginBottom: 14,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f8fafc',
  },
  dialogSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  section: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#cbd5e1',
    marginBottom: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#1e293b',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
    marginRight: 6,
  },
  chipActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  chipText: {
    fontSize: 12,
    color: '#cbd5e1',
  },
  chipTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  segmentBtnActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderColor: '#6366f1',
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#94a3b8',
  },
  segmentTextActive: {
    color: '#f8fafc',
    fontWeight: '700',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  cancelBtn: {
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cancelBtnText: {
    fontSize: 13,
    color: '#94a3b8',
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#6366f1',
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  confirmBtnText: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '600',
  },
});

