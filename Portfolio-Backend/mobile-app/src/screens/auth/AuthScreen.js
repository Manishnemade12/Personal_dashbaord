import React, { useState } from 'react';
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
} from 'react-native';
import { api } from '../../api/client';
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

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (isSignUp) {
        const res = await fetch('http://localhost:5000/api/auth/signup', {
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
          setError('Invalid email or password');
        }
      }
    } catch (err) {
      setError(err.message || 'Sign-in failed, please try again later');
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

          <TouchableOpacity onPress={openAdminLink} style={styles.agreement} activeOpacity={0.7}>
            <Text style={styles.agreementLink}>Connect with Developer</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
