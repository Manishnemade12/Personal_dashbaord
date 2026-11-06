import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StudyDao } from '../../db/dao/StudyDao';

export default function WeakTopicsScreen({
  subjects = [],
  onStartQuiz,
  onBackToHub,
}) {
  const [tab, setTab] = useState('active'); // 'active' | 'mastered'
  const [loading, setLoading] = useState(true);
  const [weakQuestions, setWeakQuestions] = useState([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const items = await StudyDao.getWeakQuestions({ tab, limit: 200 });
      setWeakQuestions(items || []);
    } catch (e) {
      console.warn('[WeakTopicsScreen] Error loading data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [tab]);

  // Group by Subject
  const grouped = useMemo(() => {
    const map = new Map();
    for (const w of weakQuestions) {
      const sId = w.subject_id || w.subjectId;
      const list = map.get(sId) || [];
      list.push(w);
      map.set(sId, list);
    }
    return Array.from(map.entries()).map(([subjId, items]) => ({
      subjectId: subjId,
      subjectName: subjects.find((s) => s.id === subjId)?.name || 'Subject',
      items,
    }));
  }, [weakQuestions, subjects]);

  const handleStartDrill = async (subjectId, items) => {
    const questions = items.slice(0, 20).map((w) => ({
      question: w.question,
      type: 'mcq',
      options: Array.isArray(w.options) ? w.options : [],
      answer: w.answer,
      explanation: w.explanation || 'Previously missed topic.',
    })).filter((q) => q.options.length === 4);

    if (questions.length === 0) {
      Alert.alert('Notice', 'Not enough valid 4-option questions to drill.');
      return;
    }

    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const createdQuiz = await StudyDao.saveDailyQuiz({
        subjectId,
        quizDate: todayStr,
        questions,
        difficulty: 'medium',
        source: 'manual',
      });
      onStartQuiz(subjectId, createdQuiz.id);
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  const handleMarkMastered = async (weakId) => {
    await StudyDao.markWeakMastered(weakId);
    loadData();
  };

  const handleDeleteWeak = async (weakId) => {
    await StudyDao.deleteWeakQuestion(weakId);
    loadData();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentWrap}>
      {/* Top Breadcrumb Back */}
      <TouchableOpacity style={styles.backBtn} onPress={onBackToHub}>
        <Ionicons name="arrow-back" size={16} color="#94a3b8" />
        <Text style={styles.backBtnText}>Back to Quiz Hub</Text>
      </TouchableOpacity>

      {/* Hero Card */}
      <View style={styles.heroBanner}>
        <View style={styles.heroIconWrap}>
          <Ionicons name="flame" size={26} color="#f59e0b" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.heroTitle}>Weak Topic Drill</Text>
          <Text style={styles.heroSub}>
            Questions you've missed before. Drill them now — answer correctly twice and they'll be marked as mastered!
          </Text>
        </View>
      </View>

      {/* Tabs: Active vs Mastered */}
      <View style={styles.tabToggleRow}>
        <TouchableOpacity
          style={[styles.toggleBtn, tab === 'active' && styles.toggleBtnActive]}
          onPress={() => setTab('active')}
        >
          <Ionicons
            name="target-outline"
            size={16}
            color={tab === 'active' ? '#ffffff' : '#94a3b8'}
          />
          <Text style={[styles.toggleBtnText, tab === 'active' && styles.toggleBtnTextActive]}>
            Active Questions
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.toggleBtn, tab === 'mastered' && styles.toggleBtnActive]}
          onPress={() => setTab('mastered')}
        >
          <Ionicons
            name="checkmark-circle-outline"
            size={16}
            color={tab === 'mastered' ? '#ffffff' : '#94a3b8'}
          />
          <Text style={[styles.toggleBtnText, tab === 'mastered' && styles.toggleBtnTextActive]}>
            Mastered Questions
          </Text>
        </TouchableOpacity>
      </View>

      {/* Body */}
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      ) : grouped.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="hardware-chip-outline" size={36} color="#64748b" />
          <Text style={styles.emptyTitle}>
            {tab === 'active' ? 'No weak questions yet! Keep practicing.' : 'No mastered questions yet.'}
          </Text>
        </View>
      ) : (
        <View style={{ gap: 16 }}>
          {grouped.map((g) => (
            <View key={g.subjectId} style={styles.subjectGroupCard}>
              <View style={styles.groupHeader}>
                <View>
                  <Text style={styles.groupTitle}>{g.subjectName}</Text>
                  <Text style={styles.groupSub}>
                    {g.items.length} question{g.items.length === 1 ? '' : 's'} to drill
                  </Text>
                </View>

                {tab === 'active' && (
                  <TouchableOpacity
                    style={styles.drillBtn}
                    onPress={() => handleStartDrill(g.subjectId, g.items)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="flash" size={14} color="#ffffff" />
                    <Text style={styles.drillBtnText}>Drill now</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Question list */}
              <View style={{ gap: 10, marginTop: 12 }}>
                {g.items.map((w) => (
                  <View key={w.id} style={styles.itemRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemPrompt}>{w.question}</Text>
                      <View style={styles.badgeRow}>
                        <View style={styles.wrongBadge}>
                          <Text style={styles.wrongBadgeText}>Wrong × {w.times_wrong || 1}</Text>
                        </View>
                        {(w.times_correct || 0) > 0 && (
                          <View style={styles.rightBadge}>
                            <Text style={styles.rightBadgeText}>Right × {w.times_correct}</Text>
                          </View>
                        )}
                        {w.last_wrong_at && (
                          <Text style={styles.dateMeta}>
                            Missed: {new Date(w.last_wrong_at).toLocaleDateString()}
                          </Text>
                        )}
                      </View>
                    </View>

                    {/* Actions */}
                    <View style={styles.itemActions}>
                      {tab === 'active' && (
                        <TouchableOpacity
                          style={styles.actionIconBtn}
                          onPress={() => handleMarkMastered(w.id)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="checkmark-circle-outline" size={18} color="#10b981" />
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={styles.actionIconBtn}
                        onPress={() => handleDeleteWeak(w.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="trash-outline" size={16} color="#64748b" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0f19',
  },
  contentWrap: {
    padding: 20,
    maxWidth: 900,
    width: '100%',
    alignSelf: 'center',
    paddingBottom: 60,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  backBtnText: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '500',
  },
  heroBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#111827',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    padding: 18,
    marginBottom: 16,
  },
  heroIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#f8fafc',
  },
  heroSub: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
    lineHeight: 18,
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
  centerBox: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyCard: {
    padding: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1f2937',
    alignItems: 'center',
    gap: 10,
  },
  emptyTitle: {
    fontSize: 14,
    color: '#94a3b8',
  },
  subjectGroupCard: {
    backgroundColor: '#111827',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1f2937',
    padding: 16,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f8fafc',
  },
  groupSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  drillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#6366f1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  drillBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1f2937',
    padding: 12,
    gap: 10,
  },
  itemPrompt: {
    fontSize: 13,
    color: '#e2e8f0',
    lineHeight: 19,
    marginBottom: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  wrongBadge: {
    backgroundColor: 'rgba(244, 63, 94, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.3)',
  },
  wrongBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#f43f5e',
  },
  rightBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  rightBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10b981',
  },
  dateMeta: {
    fontSize: 11,
    color: '#64748b',
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionIconBtn: {
    padding: 6,
  },
});

