import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function StudySidebarDrawer({
  subjects = [],
  chunks = [],
  activeChunkId = null,
  activeView = 'dashboard',
  onSelectChunk,
  onNavigateView,
  onOpenAddContent,
  onAddSubject,
  onDeleteSubject,
  onDeleteChunk,
  fieldName = 'Study Flow',
  onOpenPromptConfig,
}) {
  const [openSubjects, setOpenSubjects] = useState({});
  const [openChunks, setOpenChunks] = useState({});

  // Build hierarchical tree: Subject -> Root Chunks (parentChunkId is null) -> Children
  const tree = useMemo(() => {
    return subjects.map((s) => {
      const subjectChunks = chunks.filter((c) => c.subjectId === s.id && !c.isDeleted);
      const roots = subjectChunks
        .filter((c) => !c.parentChunkId)
        .sort((a, b) => (a.orderIndex ?? a.order ?? 0) - (b.orderIndex ?? b.order ?? 0))
        .map((root) => ({
          chunk: root,
          children: subjectChunks
            .filter((c) => c.parentChunkId === root.id)
            .sort((a, b) => (a.orderIndex ?? a.order ?? 0) - (b.orderIndex ?? b.order ?? 0)),
        }));
      return {
        subject: s,
        roots,
      };
    });
  }, [subjects, chunks]);

  const toggleSubject = (subjId) => {
    setOpenSubjects((prev) => ({ ...prev, [subjId]: !prev[subjId] }));
  };

  const toggleChunk = (chunkId) => {
    setOpenChunks((prev) => ({ ...prev, [chunkId]: !prev[chunkId] }));
  };

  const handlePromptAddSubject = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const name = window.prompt('Enter new subject name:');
      if (name && name.trim()) {
        onAddSubject(name.trim());
      }
    } else {
      Alert.prompt(
        'New Subject',
        'Enter subject name (e.g. Modern History, Biology):',
        (name) => {
          if (name && name.trim()) {
            onAddSubject(name.trim());
          }
        }
      );
    }
  };

  const confirmDeleteSubject = (subj) => {
    Alert.alert(
      'Delete Subject',
      `Are you sure you want to delete "${subj.name}" and all its study chunks?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => onDeleteSubject(subj.id) },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Brand Header */}
      <View style={styles.header}>
        <View style={styles.logoBadge}>
          <Ionicons name="book" size={18} color="#ffffff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {fieldName || 'Study Flow'}
          </Text>
          <Text style={styles.headerSubtitle}>AI Study Organizer</Text>
        </View>
        {onOpenPromptConfig && (
          <TouchableOpacity
            style={styles.promptIconBtn}
            onPress={onOpenPromptConfig}
            accessibilityLabel="Configure AI Prompt"
          >
            <Ionicons name="options-outline" size={16} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionSection}>
        <TouchableOpacity
          style={styles.primaryAddBtn}
          onPress={() => onOpenAddContent()}
          activeOpacity={0.8}
        >
          <Ionicons name="sparkles" size={16} color="#ffffff" />
          <Text style={styles.primaryAddBtnText}>Add content</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryAddBtn}
          onPress={handlePromptAddSubject}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={16} color="#94a3b8" />
          <Text style={styles.secondaryAddBtnText}>Add subject</Text>
        </TouchableOpacity>

        {/* Quick Nav Links */}
        <View style={styles.quickNavWrap}>
          <TouchableOpacity
            style={[
              styles.quickNavItem,
              activeView === 'dashboard' && styles.quickNavItemActive,
            ]}
            onPress={() => onNavigateView('dashboard')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="home-outline"
              size={16}
              color={activeView === 'dashboard' ? '#6366f1' : '#94a3b8'}
            />
            <Text
              style={[
                styles.quickNavText,
                activeView === 'dashboard' && styles.quickNavTextActive,
              ]}
            >
              Dashboard
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.quickNavItem,
              activeView === 'quiz_hub' && styles.quickNavItemActive,
            ]}
            onPress={() => onNavigateView('quiz_hub')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="flash"
              size={16}
              color={activeView === 'quiz_hub' ? '#f59e0b' : '#f59e0b'}
            />
            <Text
              style={[
                styles.quickNavText,
                activeView === 'quiz_hub' && styles.quickNavTextActive,
              ]}
            >
              Daily Quizzes
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.quickNavItem,
              activeView === 'weak_topics' && styles.quickNavItemActive,
            ]}
            onPress={() => onNavigateView('weak_topics')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="hardware-chip-outline"
              size={16}
              color={activeView === 'weak_topics' ? '#f43f5e' : '#f43f5e'}
            />
            <Text
              style={[
                styles.quickNavText,
                activeView === 'weak_topics' && styles.quickNavTextActive,
              ]}
            >
              Weak Topics
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.quickNavItem,
              activeView === 'quiz_settings' && styles.quickNavItemActive,
            ]}
            onPress={() => onNavigateView('quiz_settings')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="settings-outline"
              size={16}
              color={activeView === 'quiz_settings' ? '#6366f1' : '#94a3b8'}
            />
            <Text
              style={[
                styles.quickNavText,
                activeView === 'quiz_settings' && styles.quickNavTextActive,
              ]}
            >
              Quiz Settings
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tree View */}
      <ScrollView style={styles.treeScroll} showsVerticalScrollIndicator={false}>
        {tree.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No subjects yet.</Text>
            <Text style={styles.emptySubtext}>Paste notes or add a subject to get started.</Text>
          </View>
        ) : (
          tree.map(({ subject, roots }) => {
            const isOpen = openSubjects[subject.id] ?? true;
            return (
              <View key={subject.id} style={styles.subjectBlock}>
                {/* Subject Header Row */}
                <TouchableOpacity
                  style={styles.subjectRow}
                  onPress={() => toggleSubject(subject.id)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={isOpen ? 'chevron-down' : 'chevron-forward'}
                    size={14}
                    color="#94a3b8"
                  />
                  <Text style={styles.subjectName} numberOfLines={1}>
                    {subject.name}
                  </Text>
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>{roots.length}</Text>
                  </View>

                  {/* Add chunk to subject shortcut */}
                  <TouchableOpacity
                    style={styles.iconBtn}
                    onPress={() => onOpenAddContent({ subjectId: subject.id })}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="add" size={16} color="#64748b" />
                  </TouchableOpacity>

                  {/* Delete Subject */}
                  <TouchableOpacity
                    style={styles.iconBtn}
                    onPress={() => confirmDeleteSubject(subject)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="trash-outline" size={14} color="#64748b" />
                  </TouchableOpacity>
                </TouchableOpacity>

                {/* Roots and Leaf Sub-chunks */}
                {isOpen && (
                  <View style={styles.childrenIndent}>
                    {roots.map(({ chunk, children }) => {
                      const isChunkOpen = openChunks[chunk.id] ?? false;
                      const isRootActive = activeChunkId === chunk.id && activeView === 'chunk';

                      return (
                        <View key={chunk.id} style={{ marginBottom: 2 }}>
                          <View style={styles.chunkRow}>
                            {children.length > 0 ? (
                              <TouchableOpacity
                                onPress={() => toggleChunk(chunk.id)}
                                style={styles.expandIconBtn}
                              >
                                <Ionicons
                                  name={isChunkOpen ? 'chevron-down' : 'chevron-forward'}
                                  size={12}
                                  color="#94a3b8"
                                />
                              </TouchableOpacity>
                            ) : (
                              <View style={{ width: 14 }} />
                            )}

                            <TouchableOpacity
                              style={[
                                styles.chunkItemBtn,
                                isRootActive && styles.chunkItemBtnActive,
                              ]}
                              onPress={() => onSelectChunk(chunk.id)}
                              activeOpacity={0.7}
                            >
                              <Text
                                style={[
                                  styles.chunkTitle,
                                  isRootActive && styles.chunkTitleActive,
                                ]}
                                numberOfLines={1}
                              >
                                {chunk.title}
                              </Text>
                              {chunk.revised && (
                                <Ionicons name="checkmark-circle" size={14} color="#10b981" />
                              )}
                            </TouchableOpacity>
                          </View>

                          {/* Nested Sub-chunks */}
                          {isChunkOpen && children.length > 0 && (
                            <View style={styles.subChunkIndent}>
                              {children.map((child) => {
                                const isChildActive = activeChunkId === child.id && activeView === 'chunk';
                                return (
                                  <TouchableOpacity
                                    key={child.id}
                                    style={[
                                      styles.subChunkItemBtn,
                                      isChildActive && styles.chunkItemBtnActive,
                                    ]}
                                    onPress={() => onSelectChunk(child.id)}
                                    activeOpacity={0.7}
                                  >
                                    <Text
                                      style={[
                                        styles.subChunkTitle,
                                        isChildActive && styles.chunkTitleActive,
                                      ]}
                                      numberOfLines={1}
                                    >
                                      {child.title}
                                    </Text>
                                    {child.revised && (
                                      <Ionicons name="checkmark-circle" size={12} color="#10b981" />
                                    )}
                                  </TouchableOpacity>
                                );
                              })}
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRightWidth: 1,
    borderRightColor: '#1e293b',
    width: '100%',
    maxWidth: '100%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    gap: 12,
  },
  logoBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f8fafc',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 1,
  },
  promptIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  actionSection: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    gap: 8,
  },
  primaryAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366f1',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 8,
    gap: 8,
  },
  primaryAddBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  secondaryAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    gap: 6,
  },
  secondaryAddBtnText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#cbd5e1',
  },
  quickNavWrap: {
    marginTop: 6,
    gap: 3,
  },
  quickNavItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 6,
    gap: 8,
  },
  quickNavItemActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
  },
  quickNavText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#94a3b8',
  },
  quickNavTextActive: {
    color: '#f8fafc',
    fontWeight: '600',
  },
  treeScroll: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  emptyContainer: {
    paddingVertical: 32,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#cbd5e1',
  },
  emptySubtext: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
  },
  subjectBlock: {
    marginBottom: 6,
  },
  subjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 6,
    gap: 6,
  },
  subjectName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#f1f5f9',
  },
  countBadge: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countBadgeText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
  iconBtn: {
    padding: 3,
    marginLeft: 2,
  },
  childrenIndent: {
    marginLeft: 14,
    borderLeftWidth: 1,
    borderLeftColor: '#1e293b',
    paddingLeft: 6,
    marginTop: 2,
  },
  chunkRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expandIconBtn: {
    padding: 4,
  },
  chunkItemBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  chunkItemBtnActive: {
    backgroundColor: '#1e293b',
  },
  chunkTitle: {
    fontSize: 12,
    color: '#cbd5e1',
    flex: 1,
    marginRight: 6,
  },
  chunkTitleActive: {
    color: '#6366f1',
    fontWeight: '600',
  },
  subChunkIndent: {
    marginLeft: 16,
    borderLeftWidth: 1,
    borderLeftColor: '#334155',
    paddingLeft: 6,
    marginTop: 1,
  },
  subChunkItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  subChunkTitle: {
    fontSize: 11,
    color: '#94a3b8',
    flex: 1,
    marginRight: 6,
  },
});

