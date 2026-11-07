import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StudyDao } from '../../db/dao/StudyDao';
import { api } from '../../api/client';

export const DEFAULT_UNIVERSAL_PROMPT = `You are an expert universal study organizer and academic content architect.
The user pastes study notes, ChatGPT chat transcripts, syllabus outlines, textbook excerpts, or code documentation.
Your job is to ORGANIZE, STRUCTURE, and RE-FORMAT — NOT to summarize, condense, or discard facts.

ABSOLUTE CONTENT-PRESERVATION RULES (most important):
- Keep ~95% of the original text. You are a FORMATTER, not a summarizer.
- Preserve all formulas, code snippets, algorithms, dates, names, historical timelines, lists, diagrams-in-text, tables, and explanations verbatim where possible.
- Only drop conversational chat filler ("sure!", "here you go"), exact duplicate lines, and raw quiz blocks (which move to the quiz array).
- NEVER invent facts that are not grounded in the source notes.

FORMATTING RULES:
- Convert plain text into clean, scannable markdown with #, ##, ### headers, bold terms, bullet points, code fences, and blank lines.
- The "notes" field for each leaf chunk must contain the FULL re-formatted content.
- The "summary" field is 2-4 lines of high-level overview.
- "keyPoints" (3-8 bullets) and "terms" (term + meaning) are additive.

STRUCTURE RULES:
- Detect logical Subjects appropriate for the domain.
- Under each subject, detect Chapters / Units / Sections with clear logical hierarchy.
- Use "children" for deeper sub-topics when hierarchy exists.

QUIZ RULES:
- Scan the source for any quiz, MCQ, or practice questions.
- REMOVE questions from "notes" and place them into the chunk's "quiz" array.
- All questions must be "mcq" with 4 options, a correct answer, and an explanation.
- Add 2-4 high-yield conceptual MCQs per chunk.`;

export default function StudyPromptConfigModal({
  visible,
  onClose,
  fieldId = 'field_ssc',
  fieldName = 'Study Field',
  onPromptSaved,
}) {
  const [mode, setMode] = useState('universal'); // 'universal' | 'custom'
  const [customPromptText, setCustomPromptText] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [testingKey, setTestingKey] = useState(false);

  useEffect(() => {
    if (visible && fieldId) {
      loadFieldPrompt();
      loadSavedApiKey();
    }
  }, [visible, fieldId]);

  const loadFieldPrompt = async () => {
    try {
      const field = await StudyDao.getFieldById(fieldId);
      if (field?.systemPrompt && field.systemPrompt.trim().length > 0) {
        setCustomPromptText(field.systemPrompt);
        setMode('custom');
      } else {
        setCustomPromptText('');
        setMode('universal');
      }
    } catch (e) {
      setMode('universal');
    }
  };

  const loadSavedApiKey = async () => {
    try {
      const savedKey = await AsyncStorage.getItem('STUDY_AI_CUSTOM_API_KEY');
      if (savedKey) setApiKeyInput(savedKey);
    } catch (e) {}
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const promptToSave = mode === 'custom' ? customPromptText.trim() : '';
      await StudyDao.updateField(fieldId, { systemPrompt: promptToSave });
      
      try {
        await api.put(`/study/fields/${fieldId}/prompt`, { systemPrompt: promptToSave });
      } catch (netErr) {}

      if (apiKeyInput.trim()) {
        await AsyncStorage.setItem('STUDY_AI_CUSTOM_API_KEY', apiKeyInput.trim());
      }

      Alert.alert(
        'Saved',
        mode === 'universal'
          ? `Default Universal Setup Prompt is now active for ${fieldName}.`
          : `Custom prompt saved for ${fieldName}.`
      );

      onPromptSaved?.(promptToSave);
      onClose();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to save prompt settings');
    } finally {
      setSaving(false);
    }
  };

  const handleResetUniversal = () => {
    setMode('universal');
    setCustomPromptText('');
  };

  const handleTestApiKey = async () => {
    if (!apiKeyInput.trim()) {
      Alert.alert('Notice', 'Please paste your Groq, OpenAI, or LLM API Key first.');
      return;
    }

    setTestingKey(true);
    try {
      const key = apiKeyInput.trim();
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: 'Reply with "OK" in 1 word.' }],
          max_tokens: 5,
        }),
      });

      if (res.ok) {
        Alert.alert('Success ✅', 'Your AI API Key is active and working properly!');
        await AsyncStorage.setItem('STUDY_AI_CUSTOM_API_KEY', key);
      } else {
        const errText = await res.text();
        Alert.alert('Verification Failed', `API returned status ${res.status}: ${errText.slice(0, 120)}`);
      }
    } catch (e) {
      Alert.alert('Network Error', e.message || 'Could not verify API Key.');
    } finally {
      setTestingKey(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={styles.iconBadge}>
                <Ionicons name="options-outline" size={18} color="#6366f1" />
              </View>
              <View>
                <Text style={styles.title}>AI System Prompt & Engine</Text>
                <Text style={styles.subtitle}>Configuring for: {fieldName}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {/* Mode Selector */}
            <View style={styles.modeTabs}>
              <TouchableOpacity
                style={[styles.modeTab, mode === 'universal' && styles.modeTabActive]}
                onPress={() => setMode('universal')}
              >
                <Ionicons
                  name="globe-outline"
                  size={15}
                  color={mode === 'universal' ? '#6366f1' : '#94a3b8'}
                />
                <Text
                  style={[styles.modeTabText, mode === 'universal' && styles.modeTabTextActive]}
                >
                  Universal Setup Prompt
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modeTab, mode === 'custom' && styles.modeTabActive]}
                onPress={() => setMode('custom')}
              >
                <Ionicons
                  name="create-outline"
                  size={15}
                  color={mode === 'custom' ? '#6366f1' : '#94a3b8'}
                />
                <Text
                  style={[styles.modeTabText, mode === 'custom' && styles.modeTabTextActive]}
                >
                  Custom Field Prompt
                </Text>
              </TouchableOpacity>
            </View>

            {mode === 'universal' ? (
              <View style={styles.universalBox}>
                <View style={styles.bannerRow}>
                  <Ionicons name="checkmark-circle" size={18} color="#10b981" />
                  <Text style={styles.bannerTitle}>
                    Universal Academic Architecture Active
                  </Text>
                </View>
                <Text style={styles.universalDesc}>
                  The Universal prompt automatically adapts to any field (Engineering, SSC, UPSC, Coding, Science, etc.). It enforces strict ~95% verbatim content retention, separates MCQs into interactive quizzes, formats clean Markdown, and creates glossaries without hardcoded exam biases.
                </Text>

                <View style={styles.codePreview}>
                  <Text style={styles.codeText}>{DEFAULT_UNIVERSAL_PROMPT}</Text>
                </View>
              </View>
            ) : (
              <View style={styles.customBox}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>Custom System Prompt Instructions:</Text>
                  <TouchableOpacity onPress={handleResetUniversal}>
                    <Text style={styles.resetLink}>Reset to Universal</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.helperText}>
                  Write instructions tailored specifically for {fieldName} (e.g. "Focus on GATE syllabus with code snippets", "Generate 4-option MCQs with formulas").
                </Text>
                <TextInput
                  style={styles.textArea}
                  multiline
                  numberOfLines={10}
                  value={customPromptText}
                  onChangeText={setCustomPromptText}
                  placeholder="Paste or write custom system prompt instructions here..."
                  placeholderTextColor="#64748b"
                  textAlignVertical="top"
                />
              </View>
            )}

            {/* Optional Custom API Key */}
            <View style={styles.apiKeySection}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Custom LLM API Key (Optional)</Text>
                <TouchableOpacity onPress={handleTestApiKey} disabled={testingKey}>
                  {testingKey ? (
                    <ActivityIndicator size="small" color="#6366f1" />
                  ) : (
                    <Text style={styles.verifyLink}>Test Key</Text>
                  )}
                </TouchableOpacity>
              </View>
              <Text style={styles.helperText}>
                Optionally provide your own Groq / OpenAI API Key (e.g. gsk_...). If left empty, the server's configured AI or Smart Heuristic parser will be used.
              </Text>
              <TextInput
                style={styles.input}
                value={apiKeyInput}
                onChangeText={setApiKeyInput}
                placeholder="gsk_... or sk-..."
                placeholderTextColor="#64748b"
                secureTextEntry={false}
                autoCapitalize="none"
              />
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={saving}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="checkmark-done" size={16} color="#ffffff" />
                  <Text style={styles.saveBtnText}>Save Settings</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    width: '100%',
    maxWidth: 620,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    backgroundColor: '#1e293b',
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollArea: {
    padding: 20,
    maxHeight: 460,
  },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    gap: 4,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  modeTabActive: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
  },
  modeTabText: {
    color: '#94a3b8',
    fontSize: 12.5,
    fontWeight: '600',
  },
  modeTabTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  universalBox: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  bannerTitle: {
    color: '#10b981',
    fontSize: 13,
    fontWeight: '700',
  },
  universalDesc: {
    color: '#cbd5e1',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
  },
  codePreview: {
    backgroundColor: '#0b1120',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    maxHeight: 140,
  },
  codeText: {
    color: '#94a3b8',
    fontSize: 11,
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  customBox: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  resetLink: {
    color: '#6366f1',
    fontSize: 12,
    fontWeight: '600',
  },
  verifyLink: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '700',
  },
  helperText: {
    color: '#64748b',
    fontSize: 11.5,
    lineHeight: 16,
    marginBottom: 8,
  },
  textArea: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    padding: 12,
    color: '#ffffff',
    fontSize: 12.5,
    lineHeight: 18,
    minHeight: 140,
  },
  apiKeySection: {
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingTop: 16,
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#ffffff',
    fontSize: 13,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    backgroundColor: '#1e293b',
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#334155',
  },
  cancelBtnText: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '600',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#6366f1',
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});

