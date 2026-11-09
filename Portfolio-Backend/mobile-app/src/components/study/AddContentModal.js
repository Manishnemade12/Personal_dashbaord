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
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../api/client';
import { StudyDao } from '../../db/dao/StudyDao';

const MODES = [
  { id: 'auto', label: 'Auto Detect', icon: 'sparkles' },
  { id: 'subject', label: 'To Subject', icon: 'folder-outline' },
  { id: 'chunk', label: 'To Sub-chunk', icon: 'git-branch-outline' },
  { id: 'manual', label: 'Manual', icon: 'create-outline' },
];

export default function AddContentModal({
  visible,
  onClose,
  initialTarget = null,
  fieldId = 'field_ssc',
  fieldName = 'Study Flow',
  subjects = [],
  chunks = [],
  onOpenPromptConfig,
  onContentImported,
}) {
  const { width: windowWidth } = useWindowDimensions();
  const isSmallMobile = windowWidth < 480;

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
      // 1. Fetch user-configured custom API key if present
      const customKey = await AsyncStorage.getItem('STUDY_AI_CUSTOM_API_KEY');

      // 2. Fetch field custom prompt if configured
      let customPrompt = '';
      try {
        const fieldDoc = await StudyDao.getFieldById(fieldId);
        if (fieldDoc?.systemPrompt) customPrompt = fieldDoc.systemPrompt;
      } catch (fErr) {}

      // 3. Call backend universal AI chunker endpoint
      const res = await api.post('/study/ai/chunk-content', {
        content: text,
        fieldId,
        fieldName,
        customPrompt,
        apiKey: customKey || undefined,
      });

      if (res && res.subjects && res.subjects.length > 0) {
        setPreviewTree(res);
        setStep('preview');
        return;
      }
    } catch (err) {
      console.warn('[AddContentModal AI Error]', err);
    }

    // High fidelity offline heuristic organizer fallback (no blocking popup)
    const lines = text.split('\n');
    let subjectName = fieldName && fieldName !== 'Study Flow' ? fieldName : 'General Studies';
    const firstNonEmpty = lines.find((l) => l.trim().length > 0) || '';
    if (firstNonEmpty.length < 50 && !firstNonEmpty.startsWith('#')) {
      subjectName = firstNonEmpty.replace(/^[-*#\s]+/, '').trim() || subjectName;
    }

    const fallbackTree = {
      subjects: [
        {
          name: subjectName,
          description: `Structured notes for ${subjectName}`,
          chunks: [
            {
              title: firstNonEmpty ? firstNonEmpty.slice(0, 45) : 'Study Chapter 1',
              summary: text.slice(0, 160).replace(/[\r\n#]+/g, ' ').trim() + '...',
              notes: text,
              keyPoints: [
                'Verbatim material captured for continuous active recall.',
                'Organized section ready for self-study and revision.',
              ],
              terms: [],
              quiz: [
                {
                  question: `Which core concept is central to this section in ${subjectName}?`,
                  type: 'mcq',
                  options: [
                    'Foundational principles covered in notes',
                    'Speculative theories',
                    'Unrelated topics',
                    'None of the above',
                  ],
                  answer: 'Foundational principles covered in notes',
                  explanation: 'The notes provide direct factual coverage of this subject topic.',
                },
              ],
            },
          ],
        },
      ],
      _meta: { usedAi: false, method: 'heuristic' },
    };
    setPreviewTree(fallbackTree);
    setStep('preview');
  };

  const handleSaveManual = async () => {
    if (!manualTitle.trim()) {
      Alert.alert('Notice', 'Please enter a chunk title.');
      return;
    }

    let targetSubjId = selectedSubjectId;
    if (!targetSubjId && manualSubjectName.trim()) {
      const created = await StudyDao.createSubject(manualSubjectName.trim(), '', 'admin', false, fieldId);
      targetSubjId = created.id;
    }

    if (!targetSubjId && subjects.length > 0) {
      targetSubjId = subjects[0].id;
    }

    if (!targetSubjId) {
      const created = await StudyDao.createSubject('General Studies', '', 'admin', false, fieldId);
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
      const target = { fieldId };
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
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardWrap}
        >
          <View style={styles.dialogCard}>
            {/* Header */}
            <View style={styles.dialogHeader}>
              <View style={styles.headerTitleGroup}>
                <View style={styles.iconWrap}>
                  <Ionicons name="sparkles" size={18} color="#6366f1" />
                </View>
                <View style={styles.headerTextWrap}>
                  <Text style={styles.dialogTitle} numberOfLines={1}>
                    Add Study Content
                  </Text>
                  <Text style={styles.dialogSubtitle} numberOfLines={1}>
                    Paste notes or ChatGPT chats to organize
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                activeOpacity={0.7}
              >
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
                    activeOpacity={0.7}
                  >
                    <Text style={styles.cancelBtnText}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.confirmBtn}
                    onPress={handleConfirmAndSaveTree}
                    disabled={isSaving}
                    activeOpacity={0.8}
                  >
                    {isSaving ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-done" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                        <Text style={styles.confirmBtnText}>Confirm & Save</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 10 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* Mode Selector Toggle */}
                <View style={styles.modeTabsWrap}>
                  {MODES.map((item) => {
                    const isAct = mode === item.id;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[
                          styles.modeTabBtn,
                          isSmallMobile ? { flexBasis: '48%' } : { flexBasis: '23%' },
                          isAct && styles.modeTabBtnActive,
                        ]}
                        onPress={() => setMode(item.id)}
                        activeOpacity={0.75}
                      >
                        <Ionicons
                          name={item.icon}
                          size={14}
                          color={isAct ? '#ffffff' : '#94a3b8'}
                          style={{ marginRight: 5 }}
                        />
                        <Text
                          style={[styles.modeTabBtnText, isAct && styles.modeTabBtnTextActive]}
                          numberOfLines={1}
                        >
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Mode Dependent Selectors */}
                {mode === 'subject' && (
                  <View style={styles.selectorBlock}>
                    <Text style={styles.inputLabel}>Select Target Subject:</Text>
                    {subjects.length === 0 ? (
                      <Text style={styles.emptySelectorText}>No subjects yet. AI will auto-create one.</Text>
                    ) : (
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.pillScrollContainer}
                      >
                        {subjects.map((s) => {
                          const isSel = selectedSubjectId === s.id;
                          return (
                            <TouchableOpacity
                              key={s.id}
                              style={[styles.pillBtn, isSel && styles.pillBtnActive]}
                              onPress={() => setSelectedSubjectId(s.id)}
                              activeOpacity={0.7}
                            >
                              <Ionicons
                                name="folder"
                                size={13}
                                color={isSel ? '#ffffff' : '#818cf8'}
                                style={{ marginRight: 5 }}
                              />
                              <Text style={[styles.pillBtnText, isSel && styles.pillBtnTextActive]}>
                                {s.name}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    )}
                  </View>
                )}

                {mode === 'chunk' && (
                  <View style={styles.selectorBlock}>
                    <Text style={styles.inputLabel}>Select Target Parent Chunk:</Text>
                    {chunks.length === 0 ? (
                      <Text style={styles.emptySelectorText}>No notes yet. AI will create root chapters.</Text>
                    ) : (
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.pillScrollContainer}
                      >
                        {chunks.map((c) => {
                          const isSel = selectedParentChunkId === c.id;
                          return (
                            <TouchableOpacity
                              key={c.id}
                              style={[styles.pillBtn, isSel && styles.pillBtnActive]}
                              onPress={() => setSelectedParentChunkId(c.id)}
                              activeOpacity={0.7}
                            >
                              <Ionicons
                                name="document-text"
                                size={13}
                                color={isSel ? '#ffffff' : '#38bdf8'}
                                style={{ marginRight: 5 }}
                              />
                              <Text style={[styles.pillBtnText, isSel && styles.pillBtnTextActive]}>
                                {c.title}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    )}
                  </View>
                )}

                {/* Input Area */}
                {mode === 'manual' ? (
                  <View style={{ gap: 10, marginTop: 4 }}>
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
                        style={[styles.textInput, { height: 140, textAlignVertical: 'top' }]}
                        multiline
                        placeholder="Full markdown notes..."
                        placeholderTextColor="#64748b"
                        value={manualNotes}
                        onChangeText={setManualNotes}
                      />
                    </View>
                  </View>
                ) : (
                  <View style={{ marginTop: 4 }}>
                    <Text style={styles.inputLabel}>
                      Paste Study Text / ChatGPT Conversation:
                    </Text>
                    <TextInput
                      style={styles.textArea}
                      multiline
                      numberOfLines={8}
                      placeholder="Paste long ChatGPT notes, syllabus topics, or exam Q&A here... The AI preserves 95%+ verbatim content while extracting chapters, key points, terms, and quiz questions."
                      placeholderTextColor="#64748b"
                      value={text}
                      onChangeText={setText}
                    />
                  </View>
                )}

                {/* Prompt Config Banner */}
                {mode !== 'manual' && onOpenPromptConfig && (
                  <View style={styles.promptBar}>
                    <TouchableOpacity
                      style={styles.promptBarBtn}
                      onPress={onOpenPromptConfig}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="options-outline" size={14} color="#818cf8" />
                      <Text style={styles.promptBarText} numberOfLines={1}>
                        AI Setup Prompt ({fieldName})
                      </Text>
                      <Ionicons name="chevron-forward" size={13} color="#818cf8" />
                    </TouchableOpacity>
                  </View>
                )}

                {/* Footer */}
                <View style={styles.footerRow}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.confirmBtn}
                    onPress={handleOrganizeWithAi}
                    disabled={isSaving}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="sparkles" size={15} color="#ffffff" style={{ marginRight: 6 }} />
                    <Text style={styles.confirmBtnText} numberOfLines={1}>
                      {mode === 'manual' ? 'Save Chunk' : 'Organize with AI'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
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
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  keyboardWrap: {
    width: '100%',
    maxWidth: 580,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogCard: {
    width: '100%',
    maxWidth: 580,
    maxHeight: '92%',
    backgroundColor: '#0f172a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 16,
    flexDirection: 'column',
  },
  dialogHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    marginBottom: 12,
    width: '100%',
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  headerTextWrap: {
    flex: 1,
    minWidth: 0,
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
  modeTabsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 4,
    gap: 5,
    marginBottom: 12,
    width: '100%',
  },
  modeTabBtn: {
    flexBasis: '48%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  modeTabBtnActive: {
    backgroundColor: '#6366f1',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  modeTabBtnText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
  },
  modeTabBtnTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  selectorBlock: {
    marginBottom: 10,
    width: '100%',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#cbd5e1',
    marginBottom: 6,
  },
  emptySelectorText: {
    fontSize: 12,
    color: '#94a3b8',
    fontStyle: 'italic',
    paddingVertical: 4,
  },
  pillScrollContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  pillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#1e293b',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
    marginRight: 4,
  },
  pillBtnActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  pillBtnText: {
    fontSize: 12,
    color: '#cbd5e1',
    fontWeight: '500',
  },
  pillBtnTextActive: {
    color: '#ffffff',
    fontWeight: '700',
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
    minHeight: 130,
    maxHeight: 200,
    textAlignVertical: 'top',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '600',
  },
  confirmBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366f1',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  confirmBtnText: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '700',
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
    maxHeight: 320,
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
  promptBar: {
    marginTop: 10,
    marginBottom: 4,
  },
  promptBarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  promptBarText: {
    flex: 1,
    fontSize: 12,
    color: '#cbd5e1',
    fontWeight: '600',
  },
  previewChunkSummary: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 3,
    lineHeight: 16,
  },
  previewMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  previewMetaTag: {
    fontSize: 11,
    color: '#6366f1',
    fontWeight: '500',
  },
});

