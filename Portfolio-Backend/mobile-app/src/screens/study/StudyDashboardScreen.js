import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function StudyDashboardScreen({
  subjects = [],
  chunks = [],
  onOpenAddContent,
  onOpenQuickQuiz,
  onSelectChunk,
}) {
  const stats = useMemo(() => {
    const total = chunks.length;
    const revised = chunks.filter((c) => c.revised).length;
    const totalQuiz = chunks.reduce((acc, c) => acc + (c.quiz?.length || 0), 0);
    return {
      total,
      revised,
      totalQuiz,
      subjects: subjects.length,
    };
  }, [subjects, chunks]);

  const recentChunks = useMemo(() => {
    return [...chunks]
      .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
      .slice(0, 6);
  }, [chunks]);

  const getSubjectName = (subjId) => {
    return subjects.find((s) => s.id === subjId)?.name || 'General';
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentWrap}>
      {/* Hero Banner */}
      <View style={styles.heroBanner}>
        <View style={styles.heroBadge}>
          <Ionicons name="sparkles" size={13} color="#ffffff" />
          <Text style={styles.heroBadgeText}>AI-powered study organizer</Text>
        </View>

        <Text style={styles.heroTitle}>
          Turn long ChatGPT chats into perfectly organized SSC notes.
        </Text>
        <Text style={styles.heroSubtitle}>
          Paste any conversation. We detect subjects, chapters, key terms and quiz questions instantly.
        </Text>

        <View style={styles.heroBtnRow}>
          <TouchableOpacity
            style={styles.heroPrimaryBtn}
            onPress={() => onOpenAddContent()}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={18} color="#0f172a" />
            <Text style={styles.heroPrimaryBtnText}>Add new content</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.heroSecondaryBtn}
            onPress={() => onOpenQuickQuiz()}
            activeOpacity={0.8}
            disabled={subjects.length === 0}
          >
            <Ionicons name="hardware-chip-outline" size={16} color="#ffffff" />
            <Text style={styles.heroSecondaryBtnText}>Generate quiz</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 4 Metric Stat Cards */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <View style={styles.statIconHeader}>
            <Ionicons name="book-outline" size={16} color="#94a3b8" />
            <Text style={styles.statLabel}>Subjects</Text>
          </View>
          <Text style={styles.statValue}>{stats.subjects}</Text>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statIconHeader}>
            <Ionicons name="documents-outline" size={16} color="#94a3b8" />
            <Text style={styles.statLabel}>Chunks</Text>
          </View>
          <Text style={styles.statValue}>{stats.total}</Text>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statIconHeader}>
            <Ionicons name="trending-up-outline" size={16} color="#10b981" />
            <Text style={styles.statLabel}>Revised</Text>
          </View>
          <Text style={styles.statValue}>{`${stats.revised}/${stats.total || 0}`}</Text>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statIconHeader}>
            <Ionicons name="sparkles-outline" size={16} color="#6366f1" />
            <Text style={styles.statLabel}>Quiz MCQs</Text>
          </View>
          <Text style={styles.statValue}>{stats.totalQuiz}</Text>
        </View>
      </View>

      {/* Recently Updated Chunks Section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recently updated</Text>
      </View>

      {recentChunks.length === 0 ? (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="sparkles" size={24} color="#6366f1" />
          </View>
          <Text style={styles.emptyTitle}>No notes yet</Text>
          <Text style={styles.emptySubtitle}>
            Paste your first ChatGPT conversation or notes dump to get started.
          </Text>
          <TouchableOpacity
            style={styles.emptyActionBtn}
            onPress={() => onOpenAddContent()}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={16} color="#ffffff" />
            <Text style={styles.emptyActionBtnText}>Add content</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.recentGrid}>
          {recentChunks.map((chunk) => (
            <TouchableOpacity
              key={chunk.id}
              style={styles.chunkCard}
              onPress={() => onSelectChunk(chunk.id)}
              activeOpacity={0.7}
            >
              <Text style={styles.chunkSubjTag}>{getSubjectName(chunk.subjectId)}</Text>
              <Text style={styles.chunkCardTitle} numberOfLines={1}>
                {chunk.title}
              </Text>
              <Text style={styles.chunkCardSummary} numberOfLines={3}>
                {chunk.summary || chunk.notes?.slice(0, 150) || 'No summary available.'}
              </Text>
              <View style={styles.chunkMetaRow}>
                <View style={styles.metaBadge}>
                  <Ionicons name="list" size={12} color="#64748b" />
                  <Text style={styles.metaBadgeText}>{chunk.keyPoints?.length || 0} key points</Text>
                </View>
                <View style={styles.metaBadge}>
                  <Ionicons name="help-circle-outline" size={12} color="#64748b" />
                  <Text style={styles.metaBadgeText}>{chunk.quiz?.length || 0} quiz</Text>
                </View>
                {chunk.revised && (
                  <View style={[styles.metaBadge, { marginLeft: 'auto' }]}>
                    <Ionicons name="checkmark-circle" size={13} color="#10b981" />
                    <Text style={[styles.metaBadgeText, { color: '#10b981' }]}>Revised</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
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
    maxWidth: 1100,
    width: '100%',
    alignSelf: 'center',
    paddingBottom: 40,
  },
  heroBanner: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    backgroundColor: '#4f46e5',
    overflow: 'hidden',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 14,
  },
  heroBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ffffff',
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
    lineHeight: 32,
    maxWidth: 600,
  },
  heroSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 8,
    lineHeight: 20,
    maxWidth: 640,
  },
  heroBtnRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 20,
  },
  heroPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  heroPrimaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  heroSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  heroSecondaryBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 28,
  },
  statCard: {
    flex: 1,
    minWidth: 140,
    backgroundColor: '#111827',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1f2937',
    padding: 16,
  },
  statIconHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#f8fafc',
  },
  sectionHeader: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  emptyCard: {
    borderRadius: 14,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#1f2937',
    padding: 36,
    alignItems: 'center',
  },
  emptyIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f8fafc',
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
    maxWidth: 320,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#6366f1',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
  },
  emptyActionBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  recentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  chunkCard: {
    flex: 1,
    minWidth: 280,
    backgroundColor: '#111827',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1f2937',
    padding: 16,
  },
  chunkSubjTag: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6366f1',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  chunkCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 6,
  },
  chunkCardSummary: {
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 18,
    marginBottom: 12,
  },
  chunkMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#1f2937',
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaBadgeText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
});

