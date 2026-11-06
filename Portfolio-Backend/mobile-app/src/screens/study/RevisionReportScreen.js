import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StudyDao } from '../../db/dao/StudyDao';

export default function RevisionReportScreen({ onBackToHub }) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totals: { totalAttempts: 0, accuracy: 0, activeWeak: 0, mastered: 0 },
    subjectStats: [],
  });

  useEffect(() => {
    async function loadStats() {
      setLoading(true);
      try {
        const res = await StudyDao.getRevisionStats();
        setStats(res);
      } catch (err) {
        console.warn('[RevisionReport] Error loading stats:', err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  const { totals, subjectStats } = stats;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentWrap}>
      {/* Top Back Link */}
      <TouchableOpacity style={styles.backBtn} onPress={onBackToHub}>
        <Ionicons name="arrow-back" size={16} color="#94a3b8" />
        <Text style={styles.backBtnText}>Back to Quiz Hub</Text>
      </TouchableOpacity>

      {/* Hero Banner */}
      <View style={styles.heroBanner}>
        <View style={styles.heroIconWrap}>
          <Ionicons name="book" size={24} color="#6366f1" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.heroTitle}>Revision Report</Text>
          <Text style={styles.heroSub}>
            Subject-wise performance, retention accuracy, and active focus areas to guide your daily revision.
          </Text>
        </View>
      </View>

      {/* Top 4 Stats */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <View style={styles.statHeader}>
            <Ionicons name="trending-up" size={14} color="#10b981" />
            <Text style={styles.statLabel}>Overall Accuracy</Text>
          </View>
          <Text style={[styles.statValue, { color: '#10b981' }]}>
            {totals.accuracy.toFixed(0)}%
          </Text>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statHeader}>
            <Ionicons name="flame" size={14} color="#f59e0b" />
            <Text style={styles.statLabel}>Active Weak Qs</Text>
          </View>
          <Text style={[styles.statValue, { color: '#f59e0b' }]}>
            {totals.activeWeak}
          </Text>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statHeader}>
            <Ionicons name="documents-outline" size={14} color="#6366f1" />
            <Text style={styles.statLabel}>Quizzes Taken</Text>
          </View>
          <Text style={styles.statValue}>{totals.totalAttempts}</Text>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statHeader}>
            <Ionicons name="checkmark-done" size={14} color="#10b981" />
            <Text style={styles.statLabel}>Mastered</Text>
          </View>
          <Text style={[styles.statValue, { color: '#10b981' }]}>
            {totals.mastered}
          </Text>
        </View>
      </View>

      {/* Subject-Wise Performance Breakdown */}
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      ) : subjectStats.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="bar-chart-outline" size={36} color="#64748b" />
          <Text style={styles.emptyTitle}>No quiz data yet.</Text>
          <Text style={styles.emptySub}>Take a daily quiz to see your personalized revision report.</Text>
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          {subjectStats.map((s) => {
            const tone =
              s.avgPct >= 75 ? '#10b981' : s.avgPct >= 50 ? '#f59e0b' : '#f43f5e';

            return (
              <View key={s.subjectId} style={styles.subjectProgressCard}>
                <View style={styles.subjRowHeader}>
                  <Text style={styles.subjNameText}>{s.subjectName}</Text>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {s.activeWeak > 0 && (
                      <View style={styles.weakBadge}>
                        <Text style={styles.weakBadgeText}>{s.activeWeak} weak</Text>
                      </View>
                    )}
                    {s.mastered > 0 && (
                      <View style={styles.masteredBadge}>
                        <Text style={styles.masteredBadgeText}>{s.mastered} mastered</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Accuracy progress bar */}
                <View style={styles.progressRow}>
                  <Text style={[styles.bigAccuracyText, { color: tone }]}>
                    {s.avgPct.toFixed(0)}%
                  </Text>
                  <View style={{ flex: 1 }}>
                    <View style={styles.track}>
                      <View
                        style={[
                          styles.fill,
                          { width: `${Math.min(100, s.avgPct)}%`, backgroundColor: tone },
                        ]}
                      />
                    </View>
                    <View style={styles.metaSubRow}>
                      <Text style={styles.metaSubText}>
                        {s.attempts} attempt{s.attempts === 1 ? '' : 's'}
                      </Text>
                      {s.lastPct !== null && (
                        <Text style={styles.metaSubText}>· last {s.lastPct.toFixed(0)}%</Text>
                      )}
                      {s.totalWrongs > 0 && (
                        <Text style={styles.metaSubText}>· {s.totalWrongs} mistakes</Text>
                      )}
                    </View>
                  </View>
                </View>
              </View>
            );
          })}
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
    borderColor: 'rgba(99, 102, 241, 0.25)',
    padding: 18,
    marginBottom: 16,
  },
  heroIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    minWidth: 120,
    backgroundColor: '#111827',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1f2937',
    padding: 14,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#f8fafc',
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
    gap: 8,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#cbd5e1',
  },
  emptySub: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  subjectProgressCard: {
    backgroundColor: '#111827',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1f2937',
    padding: 16,
  },
  subjRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  subjNameText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f8fafc',
  },
  weakBadge: {
    backgroundColor: 'rgba(244, 63, 94, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.3)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  weakBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#f43f5e',
  },
  masteredBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  masteredBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10b981',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  bigAccuracyText: {
    fontSize: 24,
    fontWeight: '800',
    width: 65,
  },
  track: {
    height: 6,
    backgroundColor: '#1f2937',
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
  metaSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  metaSubText: {
    fontSize: 11,
    color: '#64748b',
  },
});

