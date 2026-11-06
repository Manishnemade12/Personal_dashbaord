import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StudyDao } from '../../db/dao/StudyDao';
import { api } from '../../api/client';

export default function DailyQuizSettingsScreen({ onBackToHub }) {
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [config, setConfig] = useState({
    enabled: true,
    scheduleTime: '12:00:00',
    timezone: 'Asia/Kolkata',
    difficulty: 'mixed',
    includePyq: true,
    numQuestions: 10,
  });

  useEffect(() => {
    async function loadConfig() {
      setLoading(true);
      try {
        const localCfg = await StudyDao.getQuizConfig();
        setConfig(localCfg);
      } catch (err) {
        console.warn('[QuizSettings] Error loading config:', err);
      } finally {
        setLoading(false);
      }
    }
    loadConfig();
  }, []);

  const handleSave = async (patch) => {
    const updated = { ...config, ...patch };
    setConfig(updated);
    setIsSaving(true);
    try {
      await StudyDao.updateQuizConfig(updated);
      try {
        await api.put('/study/quiz-config', updated);
      } catch (apiErr) {}
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentWrap}>
      {/* Top Back */}
      <TouchableOpacity style={styles.backBtn} onPress={onBackToHub}>
        <Ionicons name="arrow-back" size={16} color="#94a3b8" />
        <Text style={styles.backBtnText}>Back</Text>
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={styles.pageTitle}>Quiz Settings</Text>
        <Text style={styles.pageSubtitle}>
          Configure automated daily quiz generation and difficulty preferences
        </Text>
      </View>

      <View style={styles.settingsCard}>
        {/* Toggle 1: Daily Quiz Enabled */}
        <View style={styles.settingRow}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={styles.settingLabel}>Daily Quiz Generation</Text>
            <Text style={styles.settingDesc}>
              Automatically prepare fresh questions daily based on your study notes
            </Text>
          </View>
          <Switch
            value={config.enabled}
            onValueChange={(val) => handleSave({ enabled: val })}
            trackColor={{ false: '#334155', true: '#6366f1' }}
            thumbColor="#ffffff"
          />
        </View>

        {/* Toggle 2: Include PYQs */}
        <View style={styles.settingRow}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={styles.settingLabel}>Include Previous Year Questions (PYQs)</Text>
            <Text style={styles.settingDesc}>
              Mix official SSC past paper questions with AI-generated questions
            </Text>
          </View>
          <Switch
            value={config.includePyq}
            onValueChange={(val) => handleSave({ includePyq: val })}
            trackColor={{ false: '#334155', true: '#6366f1' }}
            thumbColor="#ffffff"
          />
        </View>

        {/* Difficulty */}
        <View style={styles.settingBlock}>
          <Text style={styles.settingLabel}>Default Difficulty:</Text>
          <View style={styles.segmentRow}>
            {['easy', 'medium', 'hard', 'mixed'].map((lvl) => {
              const isSel = config.difficulty === lvl;
              return (
                <TouchableOpacity
                  key={lvl}
                  style={[styles.segmentBtn, isSel && styles.segmentBtnActive]}
                  onPress={() => handleSave({ difficulty: lvl })}
                >
                  <Text style={[styles.segmentText, isSel && styles.segmentTextActive]}>
                    {lvl.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Number of Questions */}
        <View style={styles.settingBlock}>
          <Text style={styles.settingLabel}>Questions per Quiz:</Text>
          <View style={styles.segmentRow}>
            {[5, 10, 15, 20].map((num) => {
              const isSel = config.numQuestions === num;
              return (
                <TouchableOpacity
                  key={num}
                  style={[styles.segmentBtn, isSel && styles.segmentBtnActive]}
                  onPress={() => handleSave({ numQuestions: num })}
                >
                  <Text style={[styles.segmentText, isSel && styles.segmentTextActive]}>
                    {num} Qs
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Schedule Time & Timezone */}
        <View style={styles.settingBlock}>
          <Text style={styles.settingLabel}>Scheduled Time (24h format):</Text>
          <TextInput
            style={styles.timeInput}
            value={config.scheduleTime}
            onChangeText={(txt) => setConfig({ ...config, scheduleTime: txt })}
            onBlur={() => handleSave({ scheduleTime: config.scheduleTime })}
            placeholder="12:00:00"
            placeholderTextColor="#64748b"
          />
          <Text style={styles.timezoneMeta}>Timezone: {config.timezone}</Text>
        </View>
      </View>
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
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
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
  header: {
    marginBottom: 20,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#f8fafc',
  },
  pageSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  settingsCard: {
    backgroundColor: '#111827',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1f2937',
    padding: 20,
    gap: 20,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f1f5f9',
    marginBottom: 3,
  },
  settingDesc: {
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 17,
  },
  settingBlock: {
    gap: 8,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 8,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  segmentBtnActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderColor: '#6366f1',
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
  },
  segmentTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  timeInput: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1f2937',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#f8fafc',
    fontFamily: 'monospace',
  },
  timezoneMeta: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 4,
  },
});

