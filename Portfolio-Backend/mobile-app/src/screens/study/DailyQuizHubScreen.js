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

export default function DailyQuizHubScreen({
  subjects = [],
  onStartQuiz,
  onViewResult,
  onNavigateWeakTopics,
  onNavigateRevisionReport,
  onOpenQuickQuiz,
}) {
  const { width } = useWindowDimensions();
  const isSmall = width < 500;

  const [activeTab, setActiveTab] = useState('today'); // 'today' | 'history'
  const [loading, setLoading] = useState(true);
  const [todayQuizzes, setTodayQuizzes] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [streak, setStreak] = useState({ currentStreak: 0, longestStreak: 0, totalQuizzesCompleted: 0 });
  const [weakCount, setWeakCount] = useState({ active: 0, mastered: 0 });

  const loadData = async () => {
    setLoading(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const [tQuizzes, atts, stk, activeWeak, masteredWeak] = await Promise.all([
        StudyDao.getTodayQuizzes(todayStr),
        StudyDao.getAttempts(50),
        StudyDao.getUserStreak(),
        StudyDao.getWeakQuestions({ tab: 'active', limit: 500 }),
        StudyDao.getWeakQuestions({ tab: 'mastered', limit: 500 }),
      ]);

      setTodayQuizzes(tQuizzes || []);
      setAttempts(atts || []);
      setStreak(stk || { currentStreak: 0, longestStreak: 0, totalQuizzesCompleted: 0 });
      setWeakCount({
        active: activeWeak?.length || 0,
        mastered: masteredWeak?.length || 0,
      });
    } catch (e) {
      console.warn('[DailyQuizHubScreen] Error loading data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalAttempts = attempts.length;
  const avgScore = totalAttempts > 0
    ? attempts.reduce((acc, a) => acc + Number(a.percentage || 0), 0) / totalAttempts
    : 0;
  const bestScore = totalAttempts > 0
    ? Math.max(...attempts.map((a) => Number(a.percentage || 0)))
    : 0;

  const attemptedQuizIds = useMemo(() => {
    return new Set(attempts.map((a) => a.dailyQuizId || a.daily_quiz_id));
  }, [attempts]);

  const unattemptedToday = useMemo(() => {
    return todayQuizzes.filter((q) => !attemptedQuizIds.has(q.id));
  }, [todayQuizzes, attemptedQuizIds]);

  const attemptedToday = useMemo(() => {
    return todayQuizzes.filter((q) => attemptedQuizIds.has(q.id));
  }, [todayQuizzes, attemptedQuizIds]);

  const getSubjectName = (subjId) => {
    return subjects.find((s) => s.id === subjId)?.name || 'Subject';
  };

  const formatSecs = (s) => {
    if (!s && s !== 0) return '—';
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}m ${sec}s`;
  };

  // Last 7 days streak dots
  const last7Days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });
  }, []);

  const activeDays = useMemo(() => {
    return new Set(attempts.map((a) => a.quizDate || a.quiz_date));
  }, [attempts]);

  const getDifficultyColor = (diff) => {
    switch (diff) {
      case 'easy':
        return '#10b981';
      case 'hard':
        return '#f43f5e';
      default:
        return '#f59e0b';
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentWrap}>
      {/* Hero Banner */}
      <View style={styles.heroBanner}>
        <View style={{ flex: 1 }}>
          <View style={styles.heroBadge}>
            <Ionicons name="sparkles" size={13} color="#ffffff" />
            <Text style={styles.heroBadgeText}>SSC Practice Engine</Text>
          </View>
          <Text style={styles.heroTitle}>SSC Quiz Hub</Text>
          <Text style={styles.heroSubtitle}>
            Generate SSC-style MCQs, drill weak spots, and build your daily streak.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.heroActionBtn}
          onPress={() => onOpenQuickQuiz()}
          activeOpacity={0.8}
        >
          <Ionicons name="sparkles" size={16} color="#0f172a" />
          <Text style={styles.heroActionBtnText}>Generate Quiz</Text>
        </TouchableOpacity>
      </View>

      {/* Streak + Weak Quick Row */}
      <View style={styles.twoCardRow}>
        {/* Card 1: Streak */}
        <View style={styles.streakCard}>
          <View style={styles.streakIconWrap}>
            <Ionicons name="flame" size={24} color="#f59e0b" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardSmallLabel}>Daily streak</Text>
            <Text style={styles.cardMainNum}>
              {streak.currentStreak}{' '}
              <Text style={{ fontSize: 13, color: '#94a3b8' }}>
                day{streak.currentStreak === 1 ? '' : 's'}
              </Text>
            </Text>
            <Text style={styles.cardTinySub}>
              Longest: {streak.longestStreak} · Total: {streak.totalQuizzesCompleted}
            </Text>
          </View>
          {/* 7-day mini dots (shown on wider screens) */}
          {!isSmall && (
            <View style={styles.dotStrip}>
              {last7Days.map((d) => {
                const isActive = activeDays.has(d);
                return (
                  <View
                    key={d}
                    style={[styles.streakDot, isActive && styles.streakDotActive]}
                  />
                );
              })}
            </View>
          )}
        </View>

        {/* Card 2: Weak Topics Shortcut */}
        <TouchableOpacity
          style={styles.weakCard}
          onPress={onNavigateWeakTopics}
          activeOpacity={0.8}
        >
          <View style={styles.weakIconWrap}>
            <Ionicons name="hardware-chip" size={22} color="#f43f5e" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardSmallLabel}>Weak topic drill</Text>
            <Text style={styles.cardMainNum}>
              {weakCount.active}{' '}
              <Text style={{ fontSize: 13, color: '#94a3b8' }}>to revise</Text>
            </Text>
            <Text style={styles.cardTinySub}>
              {weakCount.mastered} already mastered
            </Text>
          </View>
          <Ionicons name="arrow-forward" size={18} color="#f43f5e" />
        </TouchableOpacity>
      </View>

      {/* 4 Stat Cards Row */}
      <View style={styles.statsRow}>
        <View style={styles.miniStatCard}>
          <View style={styles.miniStatHeader}>
            <Ionicons name="time-outline" size={14} color="#94a3b8" />
            <Text style={styles.miniStatLabel}>Attempts</Text>
          </View>
          <Text style={styles.miniStatVal}>{totalAttempts}</Text>
        </View>

        <View style={styles.miniStatCard}>
          <View style={styles.miniStatHeader}>
            <Ionicons name="trophy-outline" size={14} color="#f59e0b" />
            <Text style={styles.miniStatLabel}>Best Score</Text>
          </View>
          <Text style={[styles.miniStatVal, { color: '#f59e0b' }]}>
            {bestScore.toFixed(0)}%
          </Text>
        </View>

        <View style={styles.miniStatCard}>
          <View style={styles.miniStatHeader}>
            <Ionicons name="trending-up" size={14} color="#10b981" />
            <Text style={styles.miniStatLabel}>Avg Score</Text>
          </View>
          <Text style={[styles.miniStatVal, { color: '#10b981' }]}>
            {avgScore.toFixed(0)}%
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.miniStatCard, { borderColor: '#6366f1' }]}
          onPress={onNavigateRevisionReport}
        >
          <View style={styles.miniStatHeader}>
            <Ionicons name="book-outline" size={14} color="#6366f1" />
            <Text style={styles.miniStatLabel}>Revision</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#6366f1' }}>
              Report
            </Text>
            <Ionicons name="chevron-forward" size={13} color="#6366f1" />
          </View>
        </TouchableOpacity>
      </View>

      {/* Tabs: Today vs History */}
      <View style={styles.tabToggleRow}>
        <TouchableOpacity
          style={[styles.toggleBtn, activeTab === 'today' && styles.toggleBtnActive]}
          onPress={() => setActiveTab('today')}
        >
          <Ionicons
            name="play-circle-outline"
            size={16}
            color={activeTab === 'today' ? '#ffffff' : '#94a3b8'}
          />
          <Text style={[styles.toggleBtnText, activeTab === 'today' && styles.toggleBtnTextActive]}>
            Today
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.toggleBtn, activeTab === 'history' && styles.toggleBtnActive]}
          onPress={() => setActiveTab('history')}
        >
          <Ionicons
            name="time-outline"
            size={16}
            color={activeTab === 'history' ? '#ffffff' : '#94a3b8'}
          />
          <Text
            style={[styles.toggleBtnText, activeTab === 'history' && styles.toggleBtnTextActive]}
          >
            History
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Body */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      ) : activeTab === 'today' ? (
        <View style={{ gap: 16 }}>
          {todayQuizzes.length === 0 ? (
            <View style={styles.emptyQuizBox}>
              <Ionicons name="locate-outline" size={36} color="#64748b" />
              <Text style={styles.emptyQuizTitle}>No quizzes generated today yet</Text>
              <TouchableOpacity
                style={styles.genQuizActionBtn}
                onPress={() => onOpenQuickQuiz()}
              >
                <Ionicons name="sparkles" size={15} color="#ffffff" />
                <Text style={styles.genQuizActionText}>Generate Your First Quiz</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Not Attempted Section */}
              {unattemptedToday.length > 0 && (
                <View>
                  <Text style={styles.groupHeading}>Not Attempted Today</Text>
                  <View style={styles.quizCardGrid}>
                    {unattemptedToday.map((q) => (
                      <View key={q.id} style={styles.quizCard}>
                        <View style={styles.quizCardHeader}>
                          <Text style={styles.quizSubjectName} numberOfLines={1}>
                            {getSubjectName(q.subjectId || q.subject_id)}
                          </Text>
                          <View
                            style={[
                              styles.diffBadge,
                              { borderColor: getDifficultyColor(q.difficulty) },
                            ]}
                          >
                            <Text
                              style={[
                                styles.diffBadgeText,
                                { color: getDifficultyColor(q.difficulty) },
                              ]}
                            >
                              {q.difficulty}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.quizCardMeta}>
                          {q.totalQuestions || q.total_questions || 10} questions · 10 min
                        </Text>
                        <TouchableOpacity
                          style={styles.startQuizBtn}
                          onPress={() => onStartQuiz(q.subjectId || q.subject_id, q.id)}
                        >
                          <Text style={styles.startQuizBtnText}>Start Quiz</Text>
                          <Ionicons name="arrow-forward" size={14} color="#ffffff" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Attempted Quizzes Section */}
              {attemptedToday.length > 0 && (
                <View style={{ marginTop: 8 }}>
                  <Text style={styles.groupHeading}>Completed Today</Text>
                  <View style={styles.quizCardGrid}>
                    {attemptedToday.map((q) => (
                      <View key={q.id} style={styles.quizCard}>
                        <View style={styles.quizCardHeader}>
                          <Text style={styles.quizSubjectName} numberOfLines={1}>
                            {getSubjectName(q.subjectId || q.subject_id)}
                          </Text>
                          <View
                            style={[
                              styles.diffBadge,
                              { borderColor: getDifficultyColor(q.difficulty) },
                            ]}
                          >
                            <Text
                              style={[
                                styles.diffBadgeText,
                                { color: getDifficultyColor(q.difficulty) },
                              ]}
                            >
                              {q.difficulty}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.quizCardMeta}>Completed today</Text>
                        <TouchableOpacity
                          style={[styles.startQuizBtn, { backgroundColor: '#1e293b' }]}
                          onPress={() => onStartQuiz(q.subjectId || q.subject_id, q.id)}
                        >
                          <Text style={[styles.startQuizBtnText, { color: '#cbd5e1' }]}>
                            Retry Quiz
                          </Text>
                          <Ionicons name="refresh" size={14} color="#cbd5e1" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </>
          )}
        </View>
      ) : (
        /* History Tab */
        <View style={{ gap: 10 }}>
          {attempts.length === 0 ? (
            <View style={styles.emptyQuizBox}>
              <Text style={styles.emptyQuizTitle}>No quiz attempts yet.</Text>
              <Text style={{ fontSize: 12, color: '#64748b' }}>
                Complete quizzes to build your track record.
              </Text>
            </View>
          ) : (
            attempts.map((a) => {
              const pct = Number(a.percentage || 0);
              const toneColor = pct >= 80 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#f43f5e';
              return (
                <TouchableOpacity
                  key={a.id}
                  style={styles.historyCard}
                  onPress={() => onViewResult(a.id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.scoreBox, { borderColor: toneColor }]}>
                    <Text style={[styles.scoreBoxText, { color: toneColor }]}>
                      {pct.toFixed(0)}%
                    </Text>
                  </View>

                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.historySubject} numberOfLines={1}>
                      {getSubjectName(a.subjectId || a.subject_id)}
                    </Text>
                    <View style={styles.historyMetaRow}>
                      <Text style={styles.historyMetaText}>
                        {a.score}/{a.totalQuestions || a.total_questions} correct
                      </Text>
                      <Text style={styles.historyMetaText}>·</Text>
                      <Text style={styles.historyMetaText}>
                        <Ionicons name="time-outline" size={11} color="#64748b" />{' '}
                        {formatSecs(a.timeTaken || a.time_taken)}
                      </Text>
                      <Text style={styles.historyMetaText}>·</Text>
                      <Text style={styles.historyMetaText}>{a.quizDate || a.quiz_date}</Text>
                    </View>
                  </View>

                  <Ionicons name="chevron-forward" size={16} color="#64748b" />
                </TouchableOpacity>
              );
            })
          )}
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
    maxWidth: 960,
    width: '100%',
    alignSelf: 'center',
    paddingBottom: 60,
  },
  heroBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#4f46e5',
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 12,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  heroBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
  },
  heroSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 4,
    maxWidth: 480,
  },
  heroActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
  },
  heroActionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  twoCardRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
    width: '100%',
    maxWidth: '100%',
  },
  streakCard: {
    width: '100%',
    maxWidth: '100%',
    backgroundColor: '#111827',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  streakIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardSmallLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
  cardMainNum: {
    fontSize: 20,
    fontWeight: '800',
    color: '#f8fafc',
    marginVertical: 2,
  },
  cardTinySub: {
    fontSize: 11,
    color: '#64748b',
  },
  dotStrip: {
    flexDirection: 'row',
    gap: 3,
  },
  streakDot: {
    width: 6,
    height: 24,
    borderRadius: 2,
    backgroundColor: '#1e293b',
  },
  streakDotActive: {
    backgroundColor: '#f59e0b',
  },
  weakCard: {
    width: '100%',
    maxWidth: '100%',
    backgroundColor: '#111827',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.2)',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  weakIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(244, 63, 94, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
    width: '100%',
    maxWidth: '100%',
  },
  miniStatCard: {
    flex: 1,
    flexBasis: '47%',
    minWidth: 0,
    backgroundColor: '#111827',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1f2937',
    padding: 12,
  },
  miniStatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 6,
  },
  miniStatLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
  miniStatVal: {
    fontSize: 17,
    fontWeight: '800',
    color: '#f8fafc',
  },
  tabToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#111827',
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 6,
  },
  toggleBtnActive: {
    backgroundColor: '#1e293b',
  },
  toggleBtnText: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '500',
  },
  toggleBtnTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  groupHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  quizCardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    width: '100%',
    maxWidth: '100%',
  },
  quizCard: {
    width: '100%',
    maxWidth: '100%',
    backgroundColor: '#111827',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1f2937',
    padding: 14,
  },
  quizCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  quizSubjectName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f8fafc',
    flex: 1,
    marginRight: 8,
  },
  diffBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  diffBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  quizCardMeta: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 14,
  },
  startQuizBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#6366f1',
    paddingVertical: 8,
    borderRadius: 8,
  },
  startQuizBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  emptyQuizBox: {
    padding: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1f2937',
    gap: 10,
  },
  emptyQuizTitle: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '500',
  },
  genQuizActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#6366f1',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
  },
  genQuizActionText: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '600',
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#111827',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1f2937',
    padding: 12,
  },
  scoreBox: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#0f172a',
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreBoxText: {
    fontSize: 14,
    fontWeight: '800',
  },
  historySubject: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 2,
  },
  historyMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  historyMetaText: {
    fontSize: 11,
    color: '#64748b',
  },
  loadingBox: {
    paddingVertical: 48,
    alignItems: 'center',
  },
});

