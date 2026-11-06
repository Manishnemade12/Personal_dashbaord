import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StudyDao } from '../../db/dao/StudyDao';

export default function DailyQuizResultScreen({
  attemptId,
  subjects = [],
  onRetryQuiz,
  onBackToHub,
}) {
  const { width } = useWindowDimensions();
  const isSmall = width < 480;

  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(null);

  useEffect(() => {
    async function loadAttempt() {
      setLoading(true);
      try {
        const att = await StudyDao.getAttemptById(attemptId);
        setAttempt(att);
      } catch (err) {
        console.warn('[DailyQuizResult] Error loading attempt:', err);
      } finally {
        setLoading(false);
      }
    }
    loadAttempt();
  }, [attemptId]);

  const quiz = attempt?.daily_quiz;
  const questions = quiz?.questions || [];
  const userAnswers = attempt?.answers || [];
  const subjectName = subjects.find((s) => s.id === attempt?.subjectId)?.name || 'SSC Quiz';

  const stats = useMemo(() => {
    if (!attempt) return { pct: 0, score: 0, total: 0, correct: 0, wrong: 0, skipped: 0 };
    const pct = Number(attempt.percentage || 0);
    const score = Number(attempt.score || 0);
    const total = Number(attempt.totalQuestions || attempt.total_questions || questions.length || 0);
    const correct = userAnswers.filter((a) => a.isCorrect).length;
    const wrong = userAnswers.filter((a) => a.selectedAnswer && !a.isCorrect).length;
    const skipped = total - correct - wrong;
    return { pct, score, total, correct, wrong: Math.max(0, wrong), skipped: Math.max(0, skipped) };
  }, [attempt, questions, userAnswers]);

  const grade = useMemo(() => {
    const p = stats.pct;
    if (p >= 90) return { g: 'A+', text: 'Excellent!', color: '#10b981' };
    if (p >= 75) return { g: 'A', text: 'Great job!', color: '#10b981' };
    if (p >= 60) return { g: 'B', text: 'Good effort', color: '#f59e0b' };
    if (p >= 40) return { g: 'C', text: 'Keep practicing', color: '#f59e0b' };
    return { g: 'D', text: 'More revision needed', color: '#f43f5e' };
  }, [stats.pct]);

  const fmtSecs = (s) => {
    if (!s && s !== 0) return '—';
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}m ${sec}s`;
  };

  if (loading || !attempt) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading Quiz Results...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentWrap}>
      {/* Score Hero Card */}
      <View style={styles.heroCard}>
        <View style={styles.heroTop}>
          <Ionicons name="trophy" size={32} color="#ffffff" />
          <Text style={styles.gradeSubtitle}>{grade.text}</Text>
          <Text style={styles.scorePercentageText}>{stats.pct.toFixed(0)}%</Text>
          <Text style={styles.subjectScoreSub}>
            {subjectName} · {stats.score}/{stats.total} correct
          </Text>
        </View>

        {/* 4 Quick Stat Tiles */}
        <View style={styles.statTilesRow}>
          <View style={styles.statTile}>
            <Text style={[styles.statTileVal, { color: '#10b981' }]}>{stats.correct}</Text>
            <Text style={styles.statTileLabel}>Correct</Text>
          </View>
          <View style={styles.statTile}>
            <Text style={[styles.statTileVal, { color: '#f43f5e' }]}>{stats.wrong}</Text>
            <Text style={styles.statTileLabel}>Wrong</Text>
          </View>
          <View style={styles.statTile}>
            <Text style={[styles.statTileVal, { color: '#94a3b8' }]}>{stats.skipped}</Text>
            <Text style={styles.statTileLabel}>Skipped</Text>
          </View>
          <View style={styles.statTile}>
            <Text style={styles.statTileVal}>{fmtSecs(attempt.timeTaken || attempt.time_taken)}</Text>
            <Text style={styles.statTileLabel}>Time</Text>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionBtnRow}>
        <TouchableOpacity
          style={styles.retryBtn}
          onPress={() => onRetryQuiz(attempt.subjectId || attempt.subject_id, attempt.dailyQuizId || attempt.daily_quiz_id)}
          activeOpacity={0.8}
        >
          <Ionicons name="refresh" size={16} color="#ffffff" />
          <Text style={styles.retryBtnText}>Retry Quiz</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.hubBtn} onPress={onBackToHub} activeOpacity={0.8}>
          <Ionicons name="home-outline" size={16} color="#cbd5e1" />
          <Text style={styles.hubBtnText}>Quiz Hub</Text>
        </TouchableOpacity>
      </View>

      {/* Focus Recommendation (if mistakes made) */}
      {stats.wrong > 0 && (
        <View style={styles.focusTipCard}>
          <Ionicons name="bulb-outline" size={22} color="#f59e0b" />
          <View style={{ flex: 1 }}>
            <Text style={styles.focusTipHeading}>Focus Area</Text>
            <Text style={styles.focusTipBody}>
              You missed {stats.wrong} question{stats.wrong === 1 ? '' : 's'} in{' '}
              <Text style={{ color: '#f8fafc', fontWeight: '700' }}>{subjectName}</Text>. These questions have been added to your Weak Topics list.
              Review the detailed explanations below to lock in the concepts.
            </Text>
          </View>
        </View>
      )}

      {/* Question by Question Review */}
      {questions.length > 0 && (
        <View style={styles.reviewSection}>
          <Text style={styles.reviewSectionHeading}>Review Answers</Text>

          <View style={{ gap: 14 }}>
            {questions.map((q, idx) => {
              const ua = userAnswers.find((a) => a.questionIdx === idx);
              const selected = ua?.selectedAnswer || '';
              const correct = q.answer;
              const isRight = selected === correct;
              const isSkipped = !selected;

              return (
                <View
                  key={idx}
                  style={[
                    styles.qReviewCard,
                    isRight ? styles.qReviewCardRight : isSkipped ? styles.qReviewCardNeutral : styles.qReviewCardWrong,
                  ]}
                >
                  <View style={styles.qReviewHeader}>
                    <View style={styles.qReviewBadge}>
                      <Text style={styles.qReviewBadgeText}>Q{idx + 1}</Text>
                    </View>
                    <Text style={styles.qReviewPrompt}>{q.question}</Text>
                    <Ionicons
                      name={isRight ? 'checkmark-circle' : isSkipped ? 'ellipse-outline' : 'close-circle'}
                      size={20}
                      color={isRight ? '#10b981' : isSkipped ? '#94a3b8' : '#f43f5e'}
                    />
                  </View>

                  {/* Options */}
                  <View style={{ gap: 6, marginTop: 10 }}>
                    {q.options?.map((opt, oi) => {
                      const isOptCorrect = opt === correct;
                      const isOptChosen = opt === selected;

                      let optBoxStyle = styles.qReviewOption;
                      if (isOptCorrect) {
                        optBoxStyle = [styles.qReviewOption, styles.qReviewOptionCorrect];
                      } else if (isOptChosen && !isOptCorrect) {
                        optBoxStyle = [styles.qReviewOption, styles.qReviewOptionWrong];
                      }

                      return (
                        <View key={oi} style={optBoxStyle}>
                          <View style={styles.optLetterBubble}>
                            <Text style={styles.optLetterBubbleText}>
                              {String.fromCharCode(65 + oi)}
                            </Text>
                          </View>
                          <Text style={styles.qReviewOptionText}>{opt}</Text>
                          {isOptCorrect && (
                            <Ionicons name="checkmark" size={16} color="#10b981" />
                          )}
                          {isOptChosen && !isOptCorrect && (
                            <Ionicons name="close" size={16} color="#f43f5e" />
                          )}
                        </View>
                      );
                    })}
                  </View>

                  {/* Explanation */}
                  {q.explanation ? (
                    <View style={styles.qReviewExplanation}>
                      <Text style={styles.explTitle}>Explanation: </Text>
                      <Text style={styles.explBody}>{q.explanation}</Text>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        </View>
      )}
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
  heroCard: {
    backgroundColor: '#111827',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1f2937',
    overflow: 'hidden',
    marginBottom: 16,
  },
  heroTop: {
    backgroundColor: '#4f46e5',
    padding: 20,
    alignItems: 'center',
  },
  gradeSubtitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 6,
  },
  scorePercentageText: {
    fontSize: 48,
    fontWeight: '900',
    color: '#ffffff',
    marginVertical: 4,
  },
  subjectScoreSub: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  statTilesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    backgroundColor: '#111827',
    gap: 8,
  },
  statTile: {
    flex: 1,
    minWidth: 65,
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1f2937',
    paddingVertical: 10,
  },
  statTileVal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#f8fafc',
  },
  statTileLabel: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  actionBtnRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  retryBtn: {
    flex: 1,
    minWidth: 130,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#6366f1',
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  hubBtn: {
    flex: 1,
    minWidth: 130,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    paddingVertical: 12,
    borderRadius: 10,
  },
  hubBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#cbd5e1',
  },
  focusTipCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    padding: 16,
    marginBottom: 20,
  },
  focusTipHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f59e0b',
    marginBottom: 4,
  },
  focusTipBody: {
    fontSize: 12,
    color: '#cbd5e1',
    lineHeight: 18,
  },
  reviewSection: {
    marginTop: 4,
  },
  reviewSectionHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f1f5f9',
    marginBottom: 12,
  },
  qReviewCard: {
    backgroundColor: '#111827',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1f2937',
    padding: 16,
  },
  qReviewCardRight: {
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  qReviewCardWrong: {
    borderColor: 'rgba(244, 63, 94, 0.3)',
  },
  qReviewCardNeutral: {
    borderColor: '#1f2937',
  },
  qReviewHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  qReviewBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#1e293b',
  },
  qReviewBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
  },
  qReviewPrompt: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#f8fafc',
    lineHeight: 20,
  },
  qReviewOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#0f172a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1f2937',
    padding: 10,
  },
  qReviewOptionCorrect: {
    borderColor: 'rgba(16, 185, 129, 0.5)',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  qReviewOptionWrong: {
    borderColor: 'rgba(244, 63, 94, 0.5)',
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
  },
  optLetterBubble: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optLetterBubbleText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '700',
  },
  qReviewOptionText: {
    flex: 1,
    fontSize: 13,
    color: '#cbd5e1',
  },
  qReviewExplanation: {
    marginTop: 10,
    backgroundColor: '#0f172a',
    borderRadius: 6,
    padding: 10,
  },
  explTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#f59e0b',
  },
  explBody: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
    lineHeight: 17,
  },
});

