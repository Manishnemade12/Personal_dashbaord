import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { colors } from '../constants/theme';
import { getApiBaseUrl, setApiBaseUrl, api } from '../api/client';
import { Ionicons } from '@expo/vector-icons';

export default function SettingsScreen() {
  const [url, setUrl] = useState(getApiBaseUrl());
  const [testing, setTesting] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  const handleSave = () => {
    if (!url.trim()) {
      Alert.alert('Required', 'Please enter a valid API URL.');
      return;
    }
    setApiBaseUrl(url.trim());
    Alert.alert('Saved', `API Base URL updated to:\n${url.trim()}`);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setStatusMsg(null);
    setApiBaseUrl(url.trim());

    try {
      await api.getBlogs();
      setStatusMsg({ success: true, text: 'Connection successful! Next.js backend responded.' });
    } catch (err) {
      setStatusMsg({
        success: false,
        text: `Connection failed: ${err.message || 'Make sure Next.js server is running.'}`,
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="server-outline" size={24} color={colors.primary} />
          <Text style={styles.cardTitle}>Backend Server Configuration</Text>
        </View>

        <Text style={styles.description}>
          Configure the base URL of your Next.js backend server. When testing from an Android/iOS device or emulator, use your local network IP (e.g., http://192.168.1.15:3000/api).
        </Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>API Base URL</Text>
          <TextInput
            style={styles.input}
            value={url}
            onChangeText={setUrl}
            placeholder="http://localhost:3000/api"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.btn, styles.testBtn]}
            onPress={handleTestConnection}
            disabled={testing}
          >
            {testing ? (
              <ActivityIndicator color={colors.primary} size="small" />
            ) : (
              <>
                <Ionicons name="pulse" size={16} color={colors.primary} />
                <Text style={styles.testBtnText}>Test Connection</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={[styles.btn, styles.saveBtn]} onPress={handleSave}>
            <Ionicons name="save-outline" size={16} color="#ffffff" />
            <Text style={styles.saveBtnText}>Save URL</Text>
          </TouchableOpacity>
        </View>

        {statusMsg ? (
          <View
            style={[
              styles.statusBanner,
              { backgroundColor: statusMsg.success ? '#ecfdf5' : '#fef2f2' },
            ]}
          >
            <Ionicons
              name={statusMsg.success ? 'checkmark-circle' : 'alert-circle'}
              size={18}
              color={statusMsg.success ? '#059669' : '#dc2626'}
            />
            <Text
              style={[
                styles.statusText,
                { color: statusMsg.success ? '#065f46' : '#991b1b' },
              ]}
            >
              {statusMsg.text}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1e293b',
  },
  description: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
    marginBottom: 18,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    fontSize: 14,
    color: colors.textPrimary,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  testBtn: {
    backgroundColor: colors.primaryBg,
  },
  testBtnText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  saveBtn: {
    backgroundColor: colors.primary,
  },
  saveBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  statusText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
});
