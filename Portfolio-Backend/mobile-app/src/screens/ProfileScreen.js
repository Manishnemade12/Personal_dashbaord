import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { colors, spacing, radii, typography, layout } from '../styles/theme';
import { api } from '../api/client';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader, ImageUploader } from '../components/common';

export default function ProfileScreen({ onBack }) {
  const { width } = useWindowDimensions();
  const isMobile = width < 600;

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [profession, setProfession] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');

  const fetchProfile = async () => {
    try {
      const data = await api.getProfile();
      if (data) {
        setProfile(data);
        setName(data.name || '');
        setEmail(data.email || '');
        setProfession(data.profession || '');
        setDescription(data.description || '');
        setImage(Array.isArray(data.images) ? data.images[0] || '' : data.images || '');
      }
    } catch (e) {
      console.log('Error fetching profile:', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleUpdate = async () => {
    setSaving(true);
    try {
      await api.updateProfile({
        name,
        email,
        profession,
        description,
        images: image ? [image] : [],
      });
      Alert.alert('Success', 'Profile updated successfully!');
      fetchProfile();
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Admin Profile"
        subtitle="Manage personal portfolio profile and public bio"
        category="SETTINGS"
        iconName="person"
        onBack={onBack}
        backText="Dashboard"
      />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.profileCard, isMobile && styles.profileCardMobile]}>
          <View style={styles.avatarWrap}>
            {image ? (
              <Image source={{ uri: image }} style={styles.avatarImg} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={40} color={colors.primary} />
              </View>
            )}
          </View>

          <Text style={styles.profileName}>{name || 'Admin User'}</Text>
          <Text style={styles.profileRole}>{profession || 'Full Stack Developer'}</Text>

          <View style={styles.divider} />

          <View style={styles.formGroup}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter name"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter email"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Profession / Role</Text>
            <TextInput
              style={styles.input}
              value={profession}
              onChangeText={setProfession}
              placeholder="e.g. Full Stack Developer"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <ImageUploader
            label="Profile Picture / Avatar"
            value={image}
            onChange={setImage}
            folder="portfolio/profile"
            aspectRatio="square"
            placeholder="https://res.cloudinary.com/..."
          />

          <View style={styles.formGroup}>
            <Text style={styles.label}>Bio / Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Brief bio or description..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
            />
          </View>

          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleUpdate}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator color={colors.textLight} />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={18} color={colors.textLight} />
                <Text style={styles.saveBtnText}>Update Profile</Text>
              </>
            )}
          </TouchableOpacity>
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
    paddingBottom: spacing.xxl + 20,
    alignItems: 'center',
    width: '100%',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileCard: {
    width: '100%',
    maxWidth: 580,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
    elevation: 2,
    shadowColor: colors.shadows.card,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  profileCardMobile: {
    padding: spacing.sm + 4,
    borderRadius: radii.lg,
  },
  avatarWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 3,
    borderColor: colors.primaryBg,
    marginBottom: spacing.sm,
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primaryBg,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  profileRole: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
    marginTop: 2,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: spacing.lg,
  },
  formGroup: {
    width: '100%',
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  input: {
    width: '100%',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 13,
    color: colors.textPrimary,
  },
  textArea: {
    height: 85,
    textAlignVertical: 'top',
  },
  saveBtn: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.md,
  },
  saveBtnText: {
    color: colors.textLight,
    fontSize: 14,
    fontWeight: '700',
  },
});
