import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StudyDao } from '../../db/dao/StudyDao';

export default function DailyQuizRunnerScreen({
  subjectId,
  quizId,
  timerMin = 10,
  subjects = [],
  onQuizCompleted,
  onBackToHub,
}) {
  const { width } = useWindowDimensions();
  const isSmall = width < 500;

  const [loading, setLoading] = useState(true);
  const [quiz, setQuiz] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { [index]: selectedAnswer }
  const [secondsLeft, setSecondsLeft] = useState(timerMin * 60);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const startTimeRef = useRef(Date.now());
  const submittedRef = useRef(false);

  const subjectName = useMemoSubjectName(subjects, subjectId);

  function useMemoSubjectName(subs, sId) {
    const s = subs.find((sub) => sub.id === sId);
    return s?.name || 'SSC Quiz';
  }

  useEffect(() => {
    async function loadQuiz() {
      setLoading(true);
      try {
        let q = null;
        if (quizId) {
          q = await StudyDao.getDailyQuizById(quizId);
        } else {
          const todayStr = new Date().toISOString().split('T')[0];
          const todayQuizzes = await StudyDao.getTodayQuizzes(todayStr);
          q = todayQuizzes.find((tq) => (tq.subjectId || tq.subject_id) === subjectId) || todayQuizzes[0];
        }

        if (q && Array.isArray(q.questions) && q.questions.length > 0) {
          setQuiz(q);
        } else {
          Alert.alert('Quiz Not Found', 'Could not load questions for this quiz.', [
            { text: 'Back', onPress: onBackToHub },
          ]);
        }
      } catch (err) {
        console.warn('[DailyQuizRunner] Error loading quiz:', err);
      } finally {
        setLoading(false);
      }
    }
    loadQuiz();
  }, [quizId, subjectId]);

  // Countdown timer
  useEffect(() => {
    if (!quiz) return;
    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(interval);
          if (!submittedRef.current) {
            submittedRef.current = true;
            handleSubmit(true);
          }
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [quiz]);

  const handleSubmit = async (auto = false) => {
    if (isSubmitting || !quiz) return;
    setIsSubmitting(true);
    submittedRef.current = true;

    try {
      const questions = quiz.questions || [];
      const total = questions.length;

      const formattedAnswers = questions.map((q, idx) => {
        const selected = answers[idx] || '';
        return {
          questionIdx: idx,
          selectedAnswer: selected,
          isCorrect: selected === q.answer,
        };
      });

      const score = formattedAnswers.filter((a) => a.isCorrect).length;
      const percentage = total > 0 ? (score / total) * 100 : 0;
      const timeTaken = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const todayStr = quiz.quizDate || quiz.quiz_date || new Date().toISOString().split('T')[0];

      const attemptResult = await StudyDao.recordQuizAttempt({
        dailyQuizId: quiz.id,
        subjectId: quiz.subjectId || quiz.subject_id || subjectId,
        quizDate: todayStr,
        answers: formattedAnswers,
        score,
        totalQuestions: total,
        percentage,
        timeTaken,
        questions,
      });

      setIsSubmitting(false);
      onQuizCompleted?.(attemptResult.id || attemptResult._id);
    } catch (e) {
      setIsSubmitting(false);
      submittedRef.current = false;
      Alert.alert('Error Submitting Quiz', e.message);
    }
  };

  const handleConfirmSubmit = () => {
    const total = quiz?.questions?.length || 0;
    const answered = Object.values(answers).filter(Boolean).length;
    const unanswered = total - answered;

    if (unanswered > 0) {
      Alert.alert(
        'Submit Quiz?',
        `You have ${unanswered} unanswered question${unanswered === 1 ? '' : 's'}. Are you sure you want to submit?`,
        [
          { text: 'Keep Answering', style: 'cancel' },
          { text: 'Submit Now', style: 'default', onPress: () => handleSubmit(false) },
        ]
      );
    } else {
      handleSubmit(false);
    }
  };

  if (loading || !quiz) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading Quiz Questions...</Text>
      </View>
    );
  }

  const questions = quiz.questions || [];
  const total = questions.length;
  const currentQ = questions[currentIndex];
  const answeredCount = Object.values(answers).filter(Boolean).length;
  const progressPct = total > 0 ? ((currentIndex + 1) / total) * 100 : 0;
  const isTimeLow = secondsLeft <= 60;

  const fmtClock = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentWrap}>
      {/* Sticky Top Bar */}
      <View style={styles.topStickyBar}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.topSubjectTitle}>{subjectName}</Text>
            <View style={styles.diffBadge}>
              <Text style={styles.diffBadgeText}>{quiz.difficulty || 'MEDIUM'}</Text>
            </View>
          </View>
          <Text style={styles.topQuestionMeta}>
            Question {currentIndex + 1} of {total} · {answeredCount} answered
          </Text>
        </View>

        {/* Digital Countdown Timer */}
        <View style={[styles.timerBadge, isTimeLow && styles.timerBadgeWarning]}>
          <Ionicons
            name="time-outline"
            size={16}
            color={isTimeLow ? '#f43f5e' : '#f8fafc'}
          />
          <Text style={[styles.timerText, isTimeLow && styles.timerTextWarning]}>
            {fmtClock(secondsLeft)}
          </Text>
        </View>
      </View>

      {/* Progress Track */}
      <View style={styles.progressBarTrack}>
        <View style={[styles.progressBarFill, { width: `${progressPct}%` }]} />
      </View>

      {/* Active Question Card */}
      <View style={styles.questionCard}>
        <View style={styles.qNumRow}>
          <View style={styles.qIndexBubble}>
            <Text style={styles.qIndexBubbleText}>{currentIndex + 1}</Text>
          </View>
          <Text style={styles.questionPromptText}>{currentQ.question}</Text>
        </View>

        {/* 4 Radio Option Cards */}
        <View style={styles.optionsWrap}>
          {currentQ.options?.map((opt, i) => {
            const isSelected = answers[currentIndex] === opt;
            return (
              <TouchableOpacity
                key={i}
                style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                onPress={() => setAnswers({ ...answers, [currentIndex]: opt })}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.radioCircle,
                    isSelected && styles.radioCircleSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.radioLetter,
                      isSelected && styles.radioLetterSelected,
                    ]}
                  >
                    {String.fromCharCode(65 + i)}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.optionText,
                    isSelected && styles.optionTextSelected,
                  ]}
                >
                  {opt}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Navigation Buttons Row */}
      <View style={styles.navBtnRow}>
        <TouchableOpacity
          style={[styles.navBtn, currentIndex === 0 && styles.navBtnDisabled]}
          onPress={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
          disabled={currentIndex === 0}
        >
          <Ionicons name="chevron-back" size={16} color="#ffffff" />
          <Text style={styles.navBtnText}>Prev</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navBtn, currentIndex === total - 1 && styles.navBtnDisabled]}
          onPress={() => setCurrentIndex((prev) => Math.min(total - 1, prev + 1))}
          disabled={currentIndex === total - 1}
        >
          <Text style={styles.navBtnText}>Next</Text>
          <Ionicons name="chevron-forward" size={16} color="#ffffff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.submitBtn, isSmall && styles.submitBtnSmall]}
          onPress={handleConfirmSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Ionicons name="send" size={15} color="#ffffff" />
              <Text style={styles.submitBtnText}>Submit Quiz</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Question Palette Grid */}
      <View style={styles.paletteContainer}>
        <View style={styles.paletteHeader}>
          <Text style={styles.paletteTitle}>Question Palette</Text>
          <Text style={styles.paletteSub}>
            {answeredCount} of {total} completed
          </Text>
        </View>

        <View style={styles.paletteGrid}>
          {questions.map((_, i) => {
            const isDone = !!answers[i];
            const isActive = i === currentIndex;
            return (
              <TouchableOpacity
                key={i}
                style={[
                  styles.palettePill,
                  isDone && styles.palettePillDone,
                  isActive && styles.palettePillActive,
                ]}
                onPress={() => setCurrentIndex(i)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.palettePillText,
                    isDone && styles.palettePillTextDone,
                    isActive && styles.palettePillTextActive,
                  ]}
                >
                  {i + 1}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0f19',
    width: '100%',
    maxWidth: '100%',
  },
  contentWrap: {
    padding: 14,
    maxWidth: 780,
    width: '100%',
    alignSelf: 'center',
    paddingBottom: 60,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#0b0f19',
  },
  loadingText: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 12,
  },
  topStickyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    gap: 8,
  },
  topSubjectTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f8fafc',
    maxWidth: 160,
  },
  diffBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  diffBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6366f1',
    textTransform: 'uppercase',
  },
  topQuestionMeta: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1f2937',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  timerBadgeWarning: {
    backgroundColor: 'rgba(244, 63, 94, 0.15)',
    borderColor: '#f43f5e',
  },
  timerText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'monospace',
    color: '#f8fafc',
  },
  timerTextWarning: {
    color: '#f43f5e',
  },
  progressBarTrack: {
    height: 4,
    backgroundColor: '#1f2937',
    borderRadius: 2,
    marginBottom: 20,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#6366f1',
    borderRadius: 2,
  },
  questionCard: {
    backgroundColor: '#111827',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1f2937',
    padding: 20,
    marginBottom: 16,
  },
  qNumRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  qIndexBubble: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qIndexBubbleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6366f1',
  },
  questionPromptText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#f8fafc',
    lineHeight: 24,
  },
  optionsWrap: {
    gap: 10,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#0f172a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1f2937',
    padding: 14,
  },
  optionCardSelected: {
    borderColor: '#6366f1',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  radioCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    borderColor: '#6366f1',
    backgroundColor: '#6366f1',
  },
  radioLetter: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
  },
  radioLetterSelected: {
    color: '#ffffff',
  },
  optionText: {
    fontSize: 14,
    color: '#cbd5e1',
    flex: 1,
    lineHeight: 20,
  },
  optionTextSelected: {
    color: '#f8fafc',
    fontWeight: '600',
  },
  navBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1e293b',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  navBtnDisabled: {
    opacity: 0.4,
  },
  navBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#6366f1',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginLeft: 'auto',
  },
  submitBtnSmall: {
    width: '100%',
    marginLeft: 0,
    marginTop: 4,
  },
  submitBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  paletteContainer: {
    backgroundColor: '#111827',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1f2937',
    padding: 16,
  },
  paletteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  paletteTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#cbd5e1',
  },
  paletteSub: {
    fontSize: 11,
    color: '#64748b',
  },
  paletteGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  palettePill: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1f2937',
    alignItems: 'center',
    justifyContent: 'center',
  },
  palettePillDone: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10b981',
  },
  palettePillActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  palettePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  palettePillTextDone: {
    color: '#10b981',
  },
  palettePillTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
});

