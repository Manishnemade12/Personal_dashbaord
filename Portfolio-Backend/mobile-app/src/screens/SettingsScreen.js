import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { colors, spacing, radii, typography, layout } from '../styles/theme';
import { getApiBaseUrl, setApiBaseUrl, api } from '../api/client';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../components/common';

export default function SettingsScreen({ onBack }) {
  const { width } = useWindowDimensions();
  const isMobile = width < 600;

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
        text: `Connection failed: ${err.message || 'Make sure backend server is running.'}`,
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Server Settings"
        subtitle="Configure and test backend server endpoints"
        category="PREFERENCES"
        iconName="server-outline"
        onBack={onBack}
        backText="Dashboard"
      />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, isMobile && styles.cardMobile]}>
          <View style={styles.cardHeader}>
            <View style={styles.iconCircle}>
              <Ionicons name="server" size={20} color={colors.primary} />
            </View>
            <Text style={styles.cardTitle}>Backend Server Configuration</Text>
          </View>

          <Text style={styles.description}>
            Configure the base URL of your backend server. When testing from an Android/iOS device or emulator, use your local network IP (e.g., http://192.168.1.15:5000/api).
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>API Base URL</Text>
            <TextInput
              style={styles.input}
              value={url}
              onChangeText={setUrl}
              placeholder="http://localhost:5000/api"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={[styles.buttonRow, isMobile && styles.buttonRowMobile]}>
            <TouchableOpacity
              style={[styles.btn, styles.testBtn]}
              onPress={handleTestConnection}
              disabled={testing}
              activeOpacity={0.8}
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

            <TouchableOpacity
              style={[styles.btn, styles.saveBtn]}
              onPress={handleSave}
              activeOpacity={0.8}
            >
              <Ionicons name="save-outline" size={16} color={colors.textLight} />
              <Text style={styles.saveBtnText}>Save URL</Text>
            </TouchableOpacity>
          </View>

          {statusMsg ? (
            <View
              style={[
                styles.statusBanner,
                {
                  backgroundColor: statusMsg.success ? colors.successBg : colors.dangerBg,
                  borderColor: statusMsg.success ? colors.successBorder : colors.dangerBorder,
                },
              ]}
            >
              <Ionicons
                name={statusMsg.success ? 'checkmark-circle' : 'alert-circle'}
                size={18}
                color={statusMsg.success ? colors.success : colors.danger}
              />
              <Text
                style={[
                  styles.statusText,
                  { color: statusMsg.success ? colors.successText : colors.dangerText },
                ]}
              >
                {statusMsg.text}
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl + 10,
    alignItems: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 600,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    elevation: 2,
    shadowColor: colors.shadows.card,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  cardMobile: {
    padding: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  description: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: spacing.lg,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 13,
    color: colors.textPrimary,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  buttonRowMobile: {
    flexDirection: 'column',
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: radii.md,
    gap: 6,
    minHeight: layout.minTouchTarget,
  },
  testBtn: {
    backgroundColor: colors.primaryBg,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  testBtnText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  saveBtn: {
    backgroundColor: colors.primary,
  },
  saveBtnText: {
    color: colors.textLight,
    fontSize: 13,
    fontWeight: '700',
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  statusText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
});
