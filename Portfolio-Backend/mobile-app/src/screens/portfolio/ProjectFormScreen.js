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
} from 'react-native';
import { colors } from '../../constants/theme';
import { api } from '../../api/client';
import { Ionicons } from '@expo/vector-icons';

export default function ProjectFormScreen({ project, onBack, onSuccess }) {
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
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Ionicons name="arrow-back" size={20} color={colors.primary} />
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditing ? 'Edit Project' : 'Add Project'}
        </Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Title */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Project Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. E-Commerce Platform"
            value={title}
            onChangeText={setTitle}
            placeholderTextColor={colors.textMuted}
          />
        </View>

        {/* Slug */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Slug</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. e-commerce-platform"
            value={slug}
            onChangeText={setSlug}
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
          />
        </View>

        {/* Client */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Client Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Acme Corp / Self Project"
            value={client}
            onChangeText={setClient}
            placeholderTextColor={colors.textMuted}
          />
        </View>

        {/* Category */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Project Category</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Full Stack, Mobile App, Web Design"
            value={category}
            onChangeText={setCategory}
            placeholderTextColor={colors.textMuted}
          />
        </View>

        {/* Live Preview URL */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Live Preview URL</Text>
          <TextInput
            style={styles.input}
            placeholder="https://myproject.com"
            value={livepreview}
            onChangeText={setLivepreview}
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
          />
        </View>

        {/* Tags */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Tags (comma separated)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. react, nextjs, tailwind"
            value={tags}
            onChangeText={setTags}
            placeholderTextColor={colors.textMuted}
          />
        </View>

        {/* Images */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Image URLs (comma separated)</Text>
          <TextInput
            style={styles.input}
            placeholder="https://example.com/project-preview.jpg"
            value={images}
            onChangeText={setImages}
            placeholderTextColor={colors.textMuted}
          />
        </View>

        {/* Publish Status Toggle */}
        <View style={styles.switchRow}>
          <View>
            <Text style={styles.label}>Publication Status</Text>
            <Text style={styles.sublabel}>
              {isPublish ? 'Publish (Show in portfolio)' : 'Draft (Saved as draft)'}
            </Text>
          </View>
          <Switch
            value={isPublish}
            onValueChange={setIsPublish}
            trackColor={{ false: '#cbd5e1', true: colors.primaryLight }}
            thumbColor={isPublish ? colors.primary : '#f4f3f4'}
          />
        </View>

        {/* Description */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Project Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe the project overview, tech stack, and achievements..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={styles.submitBtn}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.submitBtnText}>
              {isEditing ? 'Update Project' : 'Save & Publish Project'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backBtnText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1e293b',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  sublabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  input: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    fontSize: 14,
    color: colors.textPrimary,
  },
  textArea: {
    minHeight: 140,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 10,
    elevation: 3,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  submitBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 15,
  },
});
