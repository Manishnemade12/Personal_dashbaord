import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from '../../../utils/tw';
import { vaultApi, setAuthToken } from '../../../services/vault/vaultApi';

const TAB_LOGIN = 'login';
const TAB_REGISTER = 'register';

export default function VaultAuthView({ onLoginSuccess }) {
  const [activeTab, setActiveTab] = useState(TAB_LOGIN);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [toast, setToast] = useState('');

  const isLogin = activeTab === TAB_LOGIN;

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setError('');
  };

  const switchTab = (tab) => {
    if (tab === activeTab) return;
    resetForm();
    setActiveTab(tab);
  };

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(''), 3500);
  };

  const validateInputs = () => {
    if (!email.trim()) {
      setError('Email is required.');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email.trim())) {
      setError('Please enter a valid email address.');
      return false;
    }
    if (!password) {
      setError('Password is required.');
      return false;
    }
    if (!isLogin && password.length < 6) {
      setError('Password must be at least 6 characters.');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    setError('');
    if (!validateInputs()) return;

    setLoading(true);
    try {
      if (isLogin) {
        const res = await vaultApi.login(email.trim(), password);
        if (!res.ok) {
          throw new Error(res.data?.error || res.data?.message || 'Login failed. Please check your credentials.');
        }
        const token = res.data?.token || res.token;
        await setAuthToken(token);
        onLoginSuccess(res.data || res);
      } else {
        const res = await vaultApi.register(email.trim(), password);
        if (!res.ok) {
          throw new Error(res.data?.error || res.data?.message || 'Registration failed.');
        }
        showToast('Account created! Please log in.');
        resetForm();
        setActiveTab(TAB_LOGIN);
      }
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        (isLogin ? 'Login failed. Please try again.' : 'Registration failed. Please try again.');
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={tw`flex-1 bg-vault-bg`}
    >
      <ScrollView
        contentContainerStyle={tw`flex-1 justify-center px-5 py-10`}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Toast ── */}
        {toast ? (
          <View style={tw`absolute top-12 left-5 right-5 z-50 bg-accent-success/90 rounded-xl px-4 py-3`}>
            <Text style={tw`text-white text-sm font-semibold text-center`}>{toast}</Text>
          </View>
        ) : null}

        {/* ── Header ── */}
        <View style={tw`items-center mb-8`}>
          <View
            style={tw`w-18 h-18 rounded-full bg-accent-primary/15 items-center justify-center mb-4`}
          >
            <Ionicons name="lock-closed" size={32} color={tw.color('accent-primary')} />
          </View>
          <Text style={tw`text-txt-primary text-2xl font-bold tracking-wide`}>CipherVault</Text>
          <Text style={tw`text-txt-muted text-sm mt-1`}>Your secrets, encrypted & safe</Text>
        </View>

        {/* ── Card ── */}
        <View
          style={[
            tw`bg-vault-card rounded-2xl p-6 border border-vault-border`,
            { maxWidth: 420, width: '100%', alignSelf: 'center' },
          ]}
        >
          {/* ── Tab Switcher ── */}
          <View style={tw`flex-row bg-vault-surface rounded-xl p-1 mb-6`}>
            {[TAB_LOGIN, TAB_REGISTER].map((tab) => {
              const active = activeTab === tab;
              return (
                <TouchableOpacity
                  key={tab}
                  onPress={() => switchTab(tab)}
                  activeOpacity={0.8}
                  style={[
                    tw`flex-1 py-2.5 rounded-lg items-center`,
                    active && tw`bg-accent-primary`,
                  ]}
                >
                  <Text
                    style={[
                      tw`text-sm font-semibold`,
                      active ? tw`text-white` : tw`text-txt-muted`,
                    ]}
                  >
                    {tab === TAB_LOGIN ? 'Login' : 'Register'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── Email Input ── */}
          <View style={tw`mb-4`}>
            <Text style={tw`text-txt-secondary text-xs font-semibold mb-1.5 ml-1`}>EMAIL</Text>
            <View
              style={tw`flex-row items-center bg-vault-surface border border-vault-border-light rounded-xl px-3`}
            >
              <Ionicons
                name="mail-outline"
                size={18}
                color={tw.color('txt-dim')}
                style={tw`mr-2`}
              />
              <TextInput
                style={tw`flex-1 text-txt-primary text-sm py-3`}
                placeholder="you@example.com"
                placeholderTextColor={tw.color('txt-dim')}
                value={email}
                onChangeText={(val) => {
                  setEmail(val);
                  if (error) setError('');
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
            </View>
          </View>

          {/* ── Password Input ── */}
          <View style={tw`mb-5`}>
            <Text style={tw`text-txt-secondary text-xs font-semibold mb-1.5 ml-1`}>PASSWORD</Text>
            <View
              style={tw`flex-row items-center bg-vault-surface border border-vault-border-light rounded-xl px-3`}
            >
              <Ionicons
                name="key-outline"
                size={18}
                color={tw.color('txt-dim')}
                style={tw`mr-2`}
              />
              <TextInput
                style={tw`flex-1 text-txt-primary text-sm py-3`}
                placeholder="••••••••"
                placeholderTextColor={tw.color('txt-dim')}
                value={password}
                onChangeText={(val) => {
                  setPassword(val);
                  if (error) setError('');
                }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                editable={!loading}
              />
              <TouchableOpacity onPress={() => setShowPassword((p) => !p)} disabled={loading}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={tw.color('txt-dim')}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Error Message ── */}
          {error ? (
            <View style={tw`flex-row items-start bg-accent-danger/10 rounded-lg px-3 py-2.5 mb-4`}>
              <Ionicons
                name="alert-circle"
                size={16}
                color={tw.color('accent-danger')}
                style={tw`mr-2 mt-0.5`}
              />
              <Text style={tw`text-accent-danger text-sm flex-1`}>{error}</Text>
            </View>
          ) : null}

          {/* ── Submit Button ── */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
            style={[
              tw`bg-accent-primary rounded-xl py-3.5 items-center justify-center flex-row`,
              loading && tw`opacity-60`,
            ]}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#ffffff" style={tw`mr-2`} />
            ) : (
              <Ionicons name="log-in-outline" size={18} color="#ffffff" style={tw`mr-2`} />
            )}
            <Text style={tw`text-white text-sm font-bold`}>
              {loading
                ? isLogin
                  ? 'Signing in…'
                  : 'Creating account…'
                : isLogin
                ? 'Sign In'
                : 'Create Account'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Footer ── */}
        <Text style={tw`text-txt-dim text-xs text-center mt-6`}>
          End-to-end encrypted • Zero-knowledge architecture
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
