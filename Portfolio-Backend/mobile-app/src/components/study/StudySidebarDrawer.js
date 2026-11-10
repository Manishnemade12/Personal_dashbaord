import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  ActivityIndicator,
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
  const [subjectDialogVisible, setSubjectDialogVisible] = useState(false);
  const [subjectName, setSubjectName] = useState('');
  const [subjectSaving, setSubjectSaving] = useState(false);

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
    setSubjectName('');
    setSubjectDialogVisible(true);
  };

  const handleCreateSubject = async () => {
    const trimmedName = subjectName.trim();
    if (!trimmedName) {
      Alert.alert('Subject name required', 'Enter a name before creating the subject.');
      return;
    }

    setSubjectSaving(true);
    try {
      await onAddSubject(trimmedName);
      setSubjectDialogVisible(false);
      setSubjectName('');
    } catch (error) {
      Alert.alert('Could not create subject', error?.message || 'Please try again.');
    } finally {
      setSubjectSaving(false);
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

      <Modal
        visible={subjectDialogVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!subjectSaving) setSubjectDialogVisible(false);
        }}
      >
        <KeyboardAvoidingView
          style={styles.subjectModalOverlay}
          behavior="padding"
        >
          <View style={styles.subjectModalCard}>
            <View style={styles.subjectModalHeader}>
              <View style={styles.subjectModalIcon}>
                <Ionicons name="folder-open-outline" size={20} color="#818cf8" />
              </View>
              <View style={styles.subjectModalTitleWrap}>
                <Text style={styles.subjectModalTitle}>Create subject</Text>
                <Text style={styles.subjectModalSubtitle}>
                  Organize your study content by subject.
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setSubjectDialogVisible(false)}
                disabled={subjectSaving}
                style={styles.subjectModalClose}
                accessibilityLabel="Close create subject dialog"
              >
                <Ionicons name="close" size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.subjectInputLabel}>Subject name</Text>
            <TextInput
              style={styles.subjectInput}
              value={subjectName}
              onChangeText={setSubjectName}
              placeholder="e.g. Modern History"
              placeholderTextColor="#64748b"
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleCreateSubject}
              editable={!subjectSaving}
            />

            <View style={styles.subjectModalActions}>
              <TouchableOpacity
                style={styles.subjectCancelBtn}
                onPress={() => setSubjectDialogVisible(false)}
                disabled={subjectSaving}
              >
                <Text style={styles.subjectCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.subjectCreateBtn}
                onPress={handleCreateSubject}
                disabled={subjectSaving}
              >
                {subjectSaving ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="add" size={17} color="#ffffff" />
                    <Text style={styles.subjectCreateText}>Create subject</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  subjectModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
  },
  subjectModalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#0f172a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 18,
  },
  subjectModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  subjectModalIcon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.18)',
    marginRight: 10,
  },
  subjectModalTitleWrap: {
    flex: 1,
  },
  subjectModalTitle: {
    color: '#f8fafc',
    fontSize: 17,
    fontWeight: '700',
  },
  subjectModalSubtitle: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 3,
  },
  subjectModalClose: {
    padding: 5,
    marginLeft: 8,
  },
  subjectInputLabel: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 7,
  },
  subjectInput: {
    width: '100%',
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#475569',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: '#f8fafc',
    fontSize: 14,
  },
  subjectModalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  subjectCancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    paddingVertical: 11,
  },
  subjectCancelText: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '600',
  },
  subjectCreateBtn: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 10,
    backgroundColor: '#6366f1',
    paddingVertical: 11,
  },
  subjectCreateText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
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
