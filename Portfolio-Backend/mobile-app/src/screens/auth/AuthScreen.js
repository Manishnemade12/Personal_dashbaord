import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { api, getApiBaseUrl, setApiBaseUrl } from '../../api/client';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../styles/theme';
import styles from './styles/authStyles';

export default function AuthScreen({ onLoginSuccess }) {
  const [email, setEmail] = useState('mnemade140@gmail.com');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Server IP / URL configuration
  const [serverUrl, setServerUrl] = useState(getApiBaseUrl());
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [testingServer, setTestingServer] = useState(false);
  const [testResult, setTestResult] = useState(null); // { success: boolean, msg: string }

  useEffect(() => {
    setServerUrl(getApiBaseUrl());
  }, []);

  const handleTestConnection = async () => {
    if (!serverUrl.trim()) {
      setTestResult({ success: false, msg: 'Please enter a server URL.' });
      return;
    }
    setTestingServer(true);
    setTestResult(null);
    try {
      const cleanUrl = serverUrl.trim().replace(/\/+$/, '');
      const healthUrl = cleanUrl.endsWith('/api')
        ? `${cleanUrl}/health`
        : `${cleanUrl}/api/health`;

      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(healthUrl, { signal: controller.signal });
      clearTimeout(tid);

      if (res.ok) {
        await setApiBaseUrl(cleanUrl);
        setTestResult({
          success: true,
          msg: '✓ Connected! Backend server is reachable.',
        });
      } else {
        setTestResult({
          success: false,
          msg: `Server responded with error status ${res.status}`,
        });
      }
    } catch (err) {
      setTestResult({
        success: false,
        msg: `Cannot reach server: ${err.message}. Ensure laptop & phone are on same Wi-Fi.`,
      });
    } finally {
      setTestingServer(false);
    }
  };

  const handleSaveServerUrl = async () => {
    if (!serverUrl.trim()) return;
    const cleanUrl = serverUrl.trim().replace(/\/+$/, '');
    await setApiBaseUrl(cleanUrl);
    Alert.alert('Saved', `Server URL set to:\n${cleanUrl}`);
  };

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (isSignUp) {
        const res = await fetch(`${getApiBaseUrl()}/auth/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), password: password.trim() }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          onLoginSuccess(data.user);
        } else {
          setError(data.error || 'Failed to create account');
        }
      } else {
        const res = await api.login(email.trim(), password.trim());
        if (res && res.success) {
          onLoginSuccess(res.user);
        } else {
          setError(res?.error || 'Invalid email or password');
        }
      }
    } catch (err) {
      setError(err.message || 'Sign-in failed. Please check your credentials or server connection.');
    } finally {
      setLoading(false);
    }
  };

  const openAdminLink = () => {
    Linking.openURL('https://www.instagram.com/manish_nemade_190/');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.fullH}
    >
      <ScrollView contentContainerStyle={styles.centerContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.loginform}>
          <View style={styles.logoRow}>
            <View style={styles.logoBadge}>
              <Ionicons name="shield-checkmark" size={24} color={colors.primary} />
            </View>
            <Text style={styles.heading}>
              {isSignUp ? 'Create Admin Account' : 'Admin Sign In'}
            </Text>
            <Text style={styles.subheading}>
              Personal Portfolio & Financial Administration
            </Text>
          </View>

          {loading && (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.loadingText}>Authenticating...</Text>
            </View>
          )}

          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TextInput
              style={styles.input}
              placeholder="Enter password"
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
              onPress={handleSubmit}
              activeOpacity={0.85}
              disabled={loading}
              style={styles.loginBtnWrapper}
            >
              <LinearGradient
                colors={colors.gradients.purple}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.loginButton}
              >
                <Text style={styles.loginButtonText}>
                  {loading ? 'Please wait...' : isSignUp ? 'Sign Up' : 'Sign In'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setIsSignUp(!isSignUp);
                setError('');
              }}
              style={styles.toggleWrap}
              activeOpacity={0.7}
            >
              <Text style={styles.toggleText}>
                {isSignUp
                  ? 'Already have an account? Sign In'
                  : 'New admin? Create an Account'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Collapsible Server Connection Config */}
          <View style={{ marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9', width: '100%' }}>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              onPress={() => setShowServerConfig(!showServerConfig)}
              activeOpacity={0.7}
            >
              <Ionicons name="settings-outline" size={14} color="#64748b" />
              <Text style={{ fontSize: 11, fontWeight: '600', color: '#64748b' }}>
                Server Connection ({showServerConfig ? 'Hide' : 'Configure'})
              </Text>
              <Ionicons
                name={showServerConfig ? 'chevron-up' : 'chevron-down'}
                size={13}
                color="#64748b"
              />
            </TouchableOpacity>

            {showServerConfig && (
              <View style={{ marginTop: 10, backgroundColor: '#f8fafc', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0' }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#475569', marginBottom: 4 }}>
                  Backend Server URL (Mobile IP / Cloud)
                </Text>
                <TextInput
                  style={{
                    backgroundColor: '#ffffff',
                    borderWidth: 1,
                    borderColor: '#cbd5e1',
                    borderRadius: 6,
                    paddingHorizontal: 8,
                    paddingVertical: 6,
                    fontSize: 11,
                    color: '#0f172a',
                    marginBottom: 8,
                  }}
                  placeholder="http://192.168.43.236:5000/api"
                  value={serverUrl}
                  onChangeText={setServerUrl}
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      backgroundColor: '#3b82f6',
                      paddingVertical: 6,
                      borderRadius: 6,
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'row',
                      gap: 4,
                    }}
                    onPress={handleTestConnection}
                    disabled={testingServer}
                  >
                    {testingServer ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <>
                        <Ionicons name="wifi" size={12} color="#ffffff" />
                        <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: '700' }}>
                          Test Connection
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      backgroundColor: '#10b981',
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 6,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    onPress={handleSaveServerUrl}
                  >
                    <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: '700' }}>Save</Text>
                  </TouchableOpacity>
                </View>

                {testResult && (
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: '600',
                      marginTop: 6,
                      color: testResult.success ? '#059669' : '#dc2626',
                    }}
                  >
                    {testResult.msg}
                  </Text>
                )}
              </View>
            )}
          </View>

          <TouchableOpacity onPress={openAdminLink} style={styles.agreement} activeOpacity={0.7}>
            <Text style={styles.agreementLink}>Connect with Developer</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
