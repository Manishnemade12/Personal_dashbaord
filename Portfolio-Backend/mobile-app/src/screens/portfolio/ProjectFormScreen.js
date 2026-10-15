import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Switch,
  useWindowDimensions,
} from 'react-native';
import { colors, spacing, radii, typography, layout } from '../../styles/theme';
import { api } from '../../api/client';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../../components/common';

export default function ProjectFormScreen({ project, onBack, onSuccess }) {
  const { width } = useWindowDimensions();
  const isMobile = width < 600;
  const isEditing = !!project?._id;

  const [title, setTitle] = useState(project?.title || '');
  const [slug, setSlug] = useState(project?.slug || '');
  const [client, setClient] = useState(
    Array.isArray(project?.client) ? project.client.join(', ') : project?.client || ''
  );
  const [category, setCategory] = useState(
    Array.isArray(project?.projectcategory)
      ? project.projectcategory.join(', ')
      : project?.projectcategory || ''
  );
  const [tags, setTags] = useState(
    Array.isArray(project?.tags) ? project.tags.join(', ') : project?.tags || ''
  );
  const [livepreview, setLivepreview] = useState(
    Array.isArray(project?.livepreview)
      ? project.livepreview.join(', ')
      : project?.livepreview || ''
  );
  const [description, setDescription] = useState(project?.description || '');
  const [images, setImages] = useState(
    Array.isArray(project?.images) ? project.images.join(', ') : project?.images || ''
  );
  const [isPublish, setIsPublish] = useState(project?.status === 'publish');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Required', 'Please enter a project title.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        slug: slug.trim() || title.toLowerCase().replace(/\s+/g, '-'),
        client: client.trim(),
        projectcategory: category ? category.split(',').map((c) => c.trim()).filter(Boolean) : [],
        tags: tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
        livepreview: livepreview.trim(),
        description,
        images: images ? images.split(',').map((img) => img.trim()).filter(Boolean) : [],
        status: isPublish ? 'publish' : 'draft',
      };

      if (isEditing) {
        payload._id = project._id;
        await api.updateProject(payload);
        Alert.alert('Success', 'Project updated successfully!');
      } else {
        await api.createProject(payload);
        Alert.alert('Success', 'Project created successfully!');
      }

      if (onSuccess) onSuccess();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to save project');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={isEditing ? 'Edit Project' : 'Add New Project'}
        subtitle={isEditing ? `Modifying "${title || 'Untitled'}"` : 'Showcase a new application or client work'}
        category="PORTFOLIO EDITOR"
        iconName="briefcase-outline"
        onBack={onBack}
        backText="All Projects"
      />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={[styles.formCard, isMobile && styles.formCardMobile]}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Project Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Distributed Task Orchestrator"
              value={title}
              onChangeText={setTitle}
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Slug (URL Endpoint)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. distributed-task-orchestrator"
              value={slug}
              onChangeText={setSlug}
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Client or Organization</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Open Source / Self-Initiated"
              value={client}
              onChangeText={setClient}
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Category</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Full Stack, Cloud Infrastructure"
              value={category}
              onChangeText={setCategory}
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Live Preview or Repository URL</Text>
            <TextInput
              style={styles.input}
              placeholder="https://github.com/..."
              value={livepreview}
              onChangeText={setLivepreview}
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Tags (comma separated)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. react, typescript, golang"
              value={tags}
              onChangeText={setTags}
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Cover Image URL</Text>
            <TextInput
              style={styles.input}
              placeholder="https://images.unsplash.com/photo-..."
              value={images}
              onChangeText={setImages}
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Publication Status</Text>
              <Text style={styles.sublabel}>
                {isPublish ? 'Published (Live on public portfolio)' : 'Draft (Admin preview only)'}
              </Text>
            </View>
            <Switch
              value={isPublish}
              onValueChange={setIsPublish}
              trackColor={{ false: colors.borderDark, true: colors.primaryLight }}
              thumbColor={isPublish ? colors.primary : '#f8fafc'}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Project Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Detailed architecture overview, tech stack highlights, features..."
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator color={colors.textLight} />
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={18} color={colors.textLight} />
                <Text style={styles.submitBtnText}>
                  {isEditing ? 'Update Project' : 'Save & Publish Project'}
                </Text>
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
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl + 20,
    alignItems: 'center',
  },
  formCard: {
    width: '100%',
    maxWidth: 720,
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
  formCardMobile: {
    padding: spacing.md,
  },
  formGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  sublabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
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
  textArea: {
    minHeight: 120,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: spacing.sm,
    minHeight: layout.minTouchTarget,
  },
  submitBtnText: {
    color: colors.textLight,
    fontWeight: '700',
    fontSize: 14,
  },
});
