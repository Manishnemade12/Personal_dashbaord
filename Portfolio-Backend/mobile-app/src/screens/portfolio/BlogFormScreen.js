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
import { ScreenHeader, ImageUploader } from '../../components/common';

export default function BlogFormScreen({ blog, onBack, onSuccess }) {
  const { width } = useWindowDimensions();
  const isMobile = width < 600;
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
    Array.isArray(blog?.images)
      ? blog.images
      : blog?.images ? blog.images.split(',').map((img) => img.trim()).filter(Boolean) : []
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
        images: Array.isArray(images)
          ? images.filter(Boolean)
          : (images ? images.split(',').map((img) => img.trim()).filter(Boolean) : []),
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
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <ScreenHeader
          title={isEditing ? 'Edit Blog Article' : 'Create Blog Article'}
          subtitle={isEditing ? `Modifying "${title || 'Untitled'}"` : 'Publish a new tech article or tutorial'}
          category="BLOG EDITOR"
          iconName="create-outline"
          onBack={onBack}
          backText="All Blogs"
        />

        <View style={[styles.formCard, isMobile && styles.formCardMobile]}>
          {/* Title */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Blog Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Modern Web Architecture with Next.js"
              value={title}
              onChangeText={setTitle}
              placeholderTextColor={colors.textMuted}
            />
          </View>

          {/* Slug */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Slug (URL Endpoint)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. modern-web-architecture-nextjs"
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
              placeholder="e.g. Full Stack, Cloud, Kubernetes"
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
              placeholder="e.g. react, nodejs, architecture"
              value={tags}
              onChangeText={setTags}
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <ImageUploader
            label="Article Media & Cover Image"
            value={images}
            onChange={setImages}
            multiple={true}
            folder="portfolio/blogs"
            aspectRatio="wide"
            placeholder="https://res.cloudinary.com/..."
          />

          {/* Publish Status Toggle */}
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

          {/* Content / Markdown */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Article Description & Content</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Write your article summary, Markdown content, or key takeaways..."
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
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator color={colors.textLight} />
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={18} color={colors.textLight} />
                <Text style={styles.submitBtnText}>
                  {isEditing ? 'Update Article' : 'Save & Publish Article'}
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
    padding: spacing.sm,
    paddingBottom: spacing.xxl + 25,
    alignItems: 'center',
    width: '100%',
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
    padding: spacing.sm + 4,
    borderRadius: radii.lg,
  },
  formGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  sublabel: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 1,
  },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 12,
    color: colors.textPrimary,
  },
  textArea: {
    minHeight: 90,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    padding: 10,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.sm,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.xs,
    minHeight: 34,
  },
  submitBtnText: {
    color: colors.textLight,
    fontWeight: '600',
    fontSize: 12,
  },
});
