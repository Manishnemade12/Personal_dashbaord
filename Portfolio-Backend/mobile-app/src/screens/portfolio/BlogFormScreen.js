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

export default function BlogFormScreen({ blog, onBack, onSuccess }) {
  const isEditing = !!blog?._id;

  const [title, setTitle] = useState(blog?.title || '');
  const [slug, setSlug] = useState(blog?.slug || '');
  const [category, setCategory] = useState(
    Array.isArray(blog?.blogcategory)
      ? blog.blogcategory.join(', ')
      : blog?.blogcategory || ''
  );
  const [tags, setTags] = useState(
    Array.isArray(blog?.tags) ? blog.tags.join(', ') : blog?.tags || ''
  );
  const [description, setDescription] = useState(blog?.description || '');
  const [images, setImages] = useState(
    Array.isArray(blog?.images) ? blog.images.join(', ') : blog?.images || ''
  );
  const [isPublish, setIsPublish] = useState(blog?.status === 'publish');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Required', 'Please enter a blog title.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        slug: slug.trim() || title.toLowerCase().replace(/\s+/g, '-'),
        blogcategory: category ? category.split(',').map((c) => c.trim()).filter(Boolean) : [],
        tags: tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
        description,
        images: images ? images.split(',').map((img) => img.trim()).filter(Boolean) : [],
        status: isPublish ? 'publish' : 'draft',
      };

      if (isEditing) {
        payload._id = blog._id;
        await api.updateBlog(payload);
        Alert.alert('Success', 'Blog updated successfully!');
      } else {
        await api.createBlog(payload);
        Alert.alert('Success', 'Blog created successfully!');
      }

      if (onSuccess) onSuccess();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to save blog');
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
          {isEditing ? 'Edit Blog' : 'Create Blog'}
        </Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Title */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Blog Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter blog title"
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
            placeholder="e.g. my-awesome-blog-post"
            value={slug}
            onChangeText={setSlug}
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
          />
        </View>

        {/* Categories */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Categories (comma separated)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Full Stack, Kubernetes, Next.js"
            value={category}
            onChangeText={setCategory}
            placeholderTextColor={colors.textMuted}
          />
        </View>

        {/* Tags */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Tags (comma separated)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. react, nodejs, tutorial"
            value={tags}
            onChangeText={setTags}
            placeholderTextColor={colors.textMuted}
          />
        </View>

        {/* Image URLs */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Image URLs (comma separated)</Text>
          <TextInput
            style={styles.input}
            placeholder="https://example.com/image.jpg"
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
              {isPublish ? 'Publish (Visible on portfolio)' : 'Draft (Hidden)'}
            </Text>
          </View>
          <Switch
            value={isPublish}
            onValueChange={setIsPublish}
            trackColor={{ false: '#cbd5e1', true: colors.primaryLight }}
            thumbColor={isPublish ? colors.primary : '#f4f3f4'}
          />
        </View>

        {/* Content / Markdown */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Content / Markdown Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Write your article markdown or description here..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={8}
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
              {isEditing ? 'Update Blog' : 'Save & Publish Blog'}
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
    minHeight: 160,
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
