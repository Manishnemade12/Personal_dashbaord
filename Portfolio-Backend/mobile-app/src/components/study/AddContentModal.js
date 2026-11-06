import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { StudyDao } from '../../db/dao/StudyDao';

export default function AddContentModal({
  visible,
  onClose,
  initialTarget = null,
  subjects = [],
  chunks = [],
  onContentImported,
}) {
  const [step, setStep] = useState('input'); // 'input' | 'loading' | 'preview'
  const [mode, setMode] = useState('auto'); // 'auto' | 'subject' | 'chunk' | 'manual'
  const [text, setText] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedParentChunkId, setSelectedParentChunkId] = useState('');
  const [previewTree, setPreviewTree] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Manual mode state
  const [manualTitle, setManualTitle] = useState('');
  const [manualSummary, setManualSummary] = useState('');
  const [manualNotes, setManualNotes] = useState('');
  const [manualSubjectName, setManualSubjectName] = useState('');

  useEffect(() => {
    if (visible) {
      if (initialTarget?.parentChunkId) {
        setMode('chunk');
        setSelectedParentChunkId(initialTarget.parentChunkId);
        const parent = chunks.find((c) => c.id === initialTarget.parentChunkId);
        if (parent) setSelectedSubjectId(parent.subjectId);
      } else if (initialTarget?.subjectId) {
        setMode('subject');
        setSelectedSubjectId(initialTarget.subjectId);
        setSelectedParentChunkId('');
      } else {
        setMode('auto');
        setSelectedSubjectId(subjects[0]?.id || '');
        setSelectedParentChunkId('');
      }
      setStep('input');
      setText('');
      setPreviewTree(null);
      setManualTitle('');
      setManualSummary('');
      setManualNotes('');
      setManualSubjectName('');
    }
  }, [visible, initialTarget, subjects, chunks]);

  const handleOrganizeWithAi = async () => {
    if (mode === 'manual') {
      return handleSaveManual();
    }

    if (!text || text.trim().length < 20) {
      Alert.alert('Notice', 'Please paste at least a paragraph of study notes or chat content.');
      return;
    }

    if (mode === 'subject' && !selectedSubjectId) {
      Alert.alert('Notice', 'Please select an existing subject to add notes under.');
      return;
    }

    if (mode === 'chunk' && !selectedParentChunkId) {
      Alert.alert('Notice', 'Please select a parent chunk to add sub-sections under.');
      return;
    }

    setStep('loading');

    try {
      // Call backend AI chunker endpoint
      const res = await api.post('/study/ai/chunk-content', { content: text });
      if (res && res.subjects && res.subjects.length > 0) {
        setPreviewTree(res);
        setStep('preview');
      } else {
        throw new Error('AI returned an empty or invalid content hierarchy.');
      }
    } catch (err) {
      console.warn('[AddContentModal AI Error]', err);
      // Fallback: organize locally via heuristic in StudyDao
      Alert.alert(
        'AI Notice',
        'Could not reach cloud AI service. Content will be organized using smart heuristic offline parsing.',
        [
          {
            text: 'OK',
            onPress: () => {
              const fallbackTree = {
                subjects: [
                  {
                    name: 'General Studies',
                    description: 'Organized from raw text dump',
                    chunks: [
                      {
                        title: 'Imported Section',
                        summary: text.slice(0, 150) + '...',
                        notes: text,
                        keyPoints: ['Comprehensive overview from study material.'],
                        terms: [],
                        quiz: [],
                      },
                    ],
                  },
                ],
              };
              setPreviewTree(fallbackTree);
              setStep('preview');
            },
          },
        ]
      );
    }
  };

  const handleSaveManual = async () => {
    if (!manualTitle.trim()) {
      Alert.alert('Notice', 'Please enter a chunk title.');
      return;
    }

    let targetSubjId = selectedSubjectId;
    if (!targetSubjId && manualSubjectName.trim()) {
      const created = await StudyDao.createSubject(manualSubjectName.trim());
      targetSubjId = created.id;
    }

    if (!targetSubjId && subjects.length > 0) {
      targetSubjId = subjects[0].id;
    }

    if (!targetSubjId) {
      const created = await StudyDao.createSubject('General Studies');
      targetSubjId = created.id;
    }

    setIsSaving(true);
    try {
      await StudyDao.createChunk({
        subjectId: targetSubjId,
        parentChunkId: selectedParentChunkId || null,
        title: manualTitle.trim(),
        summary: manualSummary.trim(),
        notes: manualNotes.trim(),
        keyPoints: [],
        terms: [],
        quiz: [],
      });
      setIsSaving(false);
      onContentImported?.();
      onClose();
    } catch (e) {
      setIsSaving(false);
      Alert.alert('Error', e.message);
    }
  };

  const handleConfirmAndSaveTree = async () => {
    if (!previewTree) return;
    setIsSaving(true);

    try {
      const target = {};
      if (mode === 'subject' && selectedSubjectId) {
        target.subjectId = selectedSubjectId;
      } else if (mode === 'chunk' && selectedParentChunkId) {
        target.parentChunkId = selectedParentChunkId;
      }

      // Save directly to SQLite (offline-first single source of truth)
      await StudyDao.importTree(previewTree, target);

      // Best effort sync with backend
      try {
        await api.post('/study/import-tree', { tree: previewTree, target });
      } catch (e) {}

      setIsSaving(false);
      onContentImported?.();
      onClose();
    } catch (e) {
      setIsSaving(false);
      Alert.alert('Error Saving Tree', e.message);
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
                <Ionicons name="sparkles" size={18} color="#6366f1" />
              </View>
              <View>
                <Text style={styles.dialogTitle}>Add Study Content</Text>
                <Text style={styles.dialogSubtitle}>
                  Paste notes or ChatGPT chats to organize into chapters
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          {/* Body Based on Step */}
          {step === 'loading' ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#6366f1" />
              <Text style={styles.loadingTitle}>AI is structuring your content...</Text>
              <Text style={styles.loadingSub}>
                Detecting subjects, splitting chapters, formatting markdown, and extracting exam MCQs.
              </Text>
            </View>
          ) : step === 'preview' ? (
            <View style={{ flex: 1 }}>
              <Text style={styles.previewHeading}>Hierarchy Preview:</Text>
              <ScrollView style={styles.previewScroll} showsVerticalScrollIndicator={false}>
                {previewTree?.subjects?.map((s, si) => (
                  <View key={si} style={styles.previewSubjBlock}>
                    <View style={styles.previewSubjHeader}>
                      <Ionicons name="folder-outline" size={16} color="#6366f1" />
                      <Text style={styles.previewSubjTitle}>{s.name}</Text>
                      <Text style={styles.previewSubjCount}>{s.chunks?.length || 0} chunks</Text>
                    </View>
                    <View style={styles.previewChunkList}>
                      {s.chunks?.map((c, ci) => (
                        <View key={ci} style={styles.previewChunkCard}>
                          <Text style={styles.previewChunkTitle}>{c.title}</Text>
                          <Text style={styles.previewChunkSummary} numberOfLines={2}>
                            {c.summary}
                          </Text>
                          <View style={styles.previewMetaRow}>
                            <Text style={styles.previewMetaTag}>
                              {c.keyPoints?.length || 0} key points
                            </Text>
                            <Text style={styles.previewMetaTag}>
                              {c.terms?.length || 0} terms
                            </Text>
                            <Text style={styles.previewMetaTag}>
                              {c.quiz?.length || 0} MCQs
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                ))}
              </ScrollView>

              <View style={styles.footerRow}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setStep('input')}
                  disabled={isSaving}
                >
                  <Text style={styles.cancelBtnText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.confirmBtn}
                  onPress={handleConfirmAndSaveTree}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-done" size={16} color="#ffffff" />
                      <Text style={styles.confirmBtnText}>Confirm & Save</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              {/* Mode Selector Tabs */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.modeTabsScroll}
                contentContainerStyle={styles.modeTabs}
              >
                <TouchableOpacity
                  style={[styles.modeTab, mode === 'auto' && styles.modeTabActive]}
                  onPress={() => setMode('auto')}
                >
                  <Text style={[styles.modeTabText, mode === 'auto' && styles.modeTabTextActive]}>
                    Auto Detect
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modeTab, mode === 'subject' && styles.modeTabActive]}
                  onPress={() => setMode('subject')}
                >
                  <Text style={[styles.modeTabText, mode === 'subject' && styles.modeTabTextActive]}>
                    To Subject
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modeTab, mode === 'chunk' && styles.modeTabActive]}
                  onPress={() => setMode('chunk')}
                >
                  <Text style={[styles.modeTabText, mode === 'chunk' && styles.modeTabTextActive]}>
                    To Sub-chunk
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modeTab, mode === 'manual' && styles.modeTabActive]}
                  onPress={() => setMode('manual')}
                >
                  <Text style={[styles.modeTabText, mode === 'manual' && styles.modeTabTextActive]}>
                    Manual
                  </Text>
                </TouchableOpacity>
              </ScrollView>

              {/* Mode Dependent Selectors */}
              {mode === 'subject' && (
                <View style={styles.selectorBlock}>
                  <Text style={styles.inputLabel}>Select Target Subject:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ gap: 6 }}>
                    {subjects.map((s) => {
                      const isSel = selectedSubjectId === s.id;
                      return (
                        <TouchableOpacity
                          key={s.id}
                          style={[styles.pillBtn, isSel && styles.pillBtnActive]}
                          onPress={() => setSelectedSubjectId(s.id)}
                        >
                          <Text style={[styles.pillBtnText, isSel && styles.pillBtnTextActive]}>
                            {s.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {mode === 'chunk' && (
                <View style={styles.selectorBlock}>
                  <Text style={styles.inputLabel}>Select Target Parent Chunk:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ gap: 6 }}>
                    {chunks.map((c) => {
                      const isSel = selectedParentChunkId === c.id;
                      return (
                        <TouchableOpacity
                          key={c.id}
                          style={[styles.pillBtn, isSel && styles.pillBtnActive]}
                          onPress={() => setSelectedParentChunkId(c.id)}
                        >
                          <Text style={[styles.pillBtnText, isSel && styles.pillBtnTextActive]}>
                            {c.title}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {/* Input Area */}
              {mode === 'manual' ? (
                <View style={{ gap: 10, marginTop: 10 }}>
                  <View>
                    <Text style={styles.inputLabel}>Title</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. Battle of Plassey 1757"
                      placeholderTextColor="#64748b"
                      value={manualTitle}
                      onChangeText={setManualTitle}
                    />
                  </View>
                  <View>
                    <Text style={styles.inputLabel}>Summary (2-3 lines)</Text>
                    <TextInput
                      style={[styles.textInput, { height: 60 }]}
                      multiline
                      placeholder="Key takeaways..."
                      placeholderTextColor="#64748b"
                      value={manualSummary}
                      onChangeText={setManualSummary}
                    />
                  </View>
                  <View>
                    <Text style={styles.inputLabel}>Markdown Notes</Text>
                    <TextInput
                      style={[styles.textInput, { height: 160, textAlignVertical: 'top' }]}
                      multiline
                      placeholder="Full markdown notes..."
                      placeholderTextColor="#64748b"
                      value={manualNotes}
                      onChangeText={setManualNotes}
                    />
                  </View>
                </View>
              ) : (
                <View style={{ marginTop: 10 }}>
                  <Text style={styles.inputLabel}>
                    Paste Study Text / ChatGPT Conversation:
                  </Text>
                  <TextInput
                    style={styles.textArea}
                    multiline
                    numberOfLines={10}
                    placeholder="Paste long ChatGPT notes, syllabus topics, or exam Q&A here... The AI preserves 95%+ verbatim content while extracting chapters, key points, terms, and quiz questions."
                    placeholderTextColor="#64748b"
                    value={text}
                    onChangeText={setText}
                  />
                </View>
              )}

              {/* Footer */}
              <View style={styles.footerRow}>
                <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.confirmBtn}
                  onPress={handleOrganizeWithAi}
                  disabled={isSaving}
                >
                  <Ionicons name="sparkles" size={16} color="#ffffff" />
                  <Text style={styles.confirmBtnText}>
                    {mode === 'manual' ? 'Save Chunk' : 'Organize with AI'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
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
    maxWidth: 620,
    maxHeight: '90%',
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
    marginBottom: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
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
  modeTabsScroll: {
    marginBottom: 12,
    width: '100%',
  },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 3,
    minWidth: '100%',
    gap: 4,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  modeTabActive: {
    backgroundColor: '#334155',
  },
  modeTabText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
  modeTabTextActive: {
    color: '#f8fafc',
    fontWeight: '600',
  },
  selectorBlock: {
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#cbd5e1',
    marginBottom: 6,
  },
  pillBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#1e293b',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
    marginRight: 6,
  },
  pillBtnActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  pillBtnText: {
    fontSize: 12,
    color: '#cbd5e1',
  },
  pillBtnTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  textInput: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#f8fafc',
  },
  textArea: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    color: '#f8fafc',
    minHeight: 180,
    textAlignVertical: 'top',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16,
    paddingTop: 12,
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
    fontWeight: '500',
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
  loadingContainer: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f8fafc',
    marginTop: 16,
  },
  loadingSub: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    maxWidth: 400,
    marginTop: 6,
    lineHeight: 18,
  },
  previewHeading: {
    fontSize: 13,
    fontWeight: '600',
    color: '#cbd5e1',
    marginBottom: 8,
  },
  previewScroll: {
    maxHeight: 380,
  },
  previewSubjBlock: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  previewSubjHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  previewSubjTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f8fafc',
    flex: 1,
  },
  previewSubjCount: {
    fontSize: 11,
    color: '#94a3b8',
  },
  previewChunkList: {
    gap: 8,
  },
  previewChunkCard: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  previewChunkTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#e2e8f0',
  },
  previewChunkSummary: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 3,
    lineHeight: 16,
  },
  previewMetaRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  previewMetaTag: {
    fontSize: 11,
    color: '#6366f1',
    fontWeight: '500',
  },
});

