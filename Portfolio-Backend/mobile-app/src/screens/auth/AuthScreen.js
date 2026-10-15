import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
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
        // Sign up create admin
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
        // Sign in
        const res = await api.login(email.trim(), password.trim());
        if (res && res.success) {
          onLoginSuccess(res.user);
        } else {
          setError('Invalid email or Password');
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
      <ScrollView contentContainerStyle={styles.centerContainer}>
        {/* Exact .loginform styling */}
        <View style={styles.loginform}>
          <Text style={styles.heading}>
            {isSignUp ? 'Signup - Create Admin' : 'Admin Sign In'}
          </Text>

          {loading && (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color="rgb(16, 137, 211)" />
              <Text style={styles.loadingText}>Checking...</Text>
            </View>
          )}

          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              placeholderTextColor="#94a3b8"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <TextInput
              style={styles.input}
              placeholder="Enter password"
              placeholderTextColor="#94a3b8"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
              onPress={handleSubmit}
              activeOpacity={0.85}
              disabled={loading}
              style={styles.loginBtnWrapper}
            >
              <LinearGradient
                colors={['rgb(16, 137, 211)', 'rgb(18, 177, 209)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.loginButton}
              >
                <Text style={styles.loginButtonText}>
                  {loading ? 'Please wait...' : isSignUp ? 'Sign Up' : 'Sign In'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Switch between Sign In and Sign Up */}
            <TouchableOpacity
              onPress={() => {
                setIsSignUp(!isSignUp);
                setError('');
              }}
              style={styles.toggleWrap}
            >
              <Text style={styles.toggleText}>
                {isSignUp
                  ? 'Already an admin? Switch to Sign In'
                  : 'New admin? Switch to Create Admin'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Connect to Admin Link */}
          <TouchableOpacity onPress={openAdminLink} style={styles.agreement}>
            <Text style={styles.agreementLink}>Connect to Admin</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fullH: {
    flex: 1,
    backgroundColor: 'rgb(248, 250, 252)',
  },
  centerContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  loginform: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#ffffff',
    borderRadius: 40,
    paddingVertical: 32,
    paddingHorizontal: 28,
    borderWidth: 5,
    borderColor: '#ffffff',
    elevation: 8,
    shadowColor: 'rgb(133, 189, 215)',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.8,
    shadowRadius: 25,
  },
  heading: {
    textAlign: 'center',
    fontWeight: '900',
    fontSize: 28,
    color: 'rgb(16, 137, 211)',
    marginBottom: 8,
  },
  loadingRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginVertical: 10,
  },
  loadingText: {
    color: 'rgb(16, 137, 211)',
    fontSize: 15,
    fontWeight: '600',
  },
  form: {
    marginTop: 10,
  },
  input: {
    width: '100%',
    backgroundColor: '#ffffff',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 20,
    fontSize: 16,
    color: '#0f172a',
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 3,
    shadowColor: '#cff0ff',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
  },
  errorText: {
    color: '#ef4444',
    textAlign: 'center',
    marginTop: 14,
    fontSize: 14,
    fontWeight: '600',
  },
  loginBtnWrapper: {
    marginTop: 22,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: 'rgb(133, 189, 215)',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
  },
  loginButton: {
    width: '100%',
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  toggleWrap: {
    marginTop: 16,
    alignItems: 'center',
  },
  toggleText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  agreement: {
    marginTop: 24,
    alignItems: 'center',
  },
  agreementLink: {
    color: '#0099ff',
    fontSize: 16,
    fontWeight: '600',
  },
});
