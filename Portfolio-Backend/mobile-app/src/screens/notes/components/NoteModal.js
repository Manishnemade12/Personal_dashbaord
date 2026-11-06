import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Switch,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing } from '../../../styles/theme';

const COLOR_PALETTE = [
  '#7e37d8', // Purple
  '#3b82f6', // Blue
  '#10b981', // Green
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#06b6d4', // Cyan
  '#ec4899', // Pink
  '#64748b', // Slate
];

export default function NoteModal({
  visible,
  onClose,
  editingNote,
  categories = [],
  onSave,
  onOpenCategoryModal,
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('General');
  const [color, setColor] = useState('#7e37d8');
  const [isPinned, setIsPinned] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editingNote) {
      setTitle(editingNote.title || '');
      setDescription(editingNote.description || '');
      setCategory(editingNote.category || 'General');
      setColor(editingNote.color || '#7e37d8');
      setIsPinned(Boolean(editingNote.isPinned));
    } else {
      setTitle('');
      setDescription('');
      setCategory(categories.length > 0 ? categories[0].name : 'General');
      setColor('#7e37d8');
      setIsPinned(false);
    }
  }, [editingNote, visible]);

  const handleSubmit = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      Alert.alert('Title Required', 'Please enter a title for your note.');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        id: editingNote?._id,
        title: trimmedTitle,
        description: description.trim(),
        category: category || 'General',
        color,
        isPinned,
      });
      onClose();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to save note.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <View style={modalStyles.container}>
          {/* Header */}
          <View style={modalStyles.headerRow}>
            <View style={modalStyles.headerLeft}>
              <View style={[modalStyles.iconWrap, { backgroundColor: color ? `${color}18` : '#f5f3ff' }]}>
                <Ionicons
                  name={editingNote ? 'create-outline' : 'document-text-outline'}
                  size={18}
                  color={color || '#7e37d8'}
                />
              </View>
              <View>
                <Text style={modalStyles.title}>
                  {editingNote ? 'Edit Note' : 'Create New Note'}
                </Text>
                <Text style={modalStyles.subtitle}>
                  {editingNote ? 'Modify title, description or category' : 'Capture your thoughts, ideas or tasks'}
                </Text>
              </View>
            </View>

            <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView style={modalStyles.scrollBody} showsVerticalScrollIndicator={false}>
            {/* Title Input */}
            <View style={modalStyles.formGroup}>
              <Text style={modalStyles.fieldLabel}>NOTE TITLE *</Text>
              <TextInput
                style={modalStyles.titleInput}
                placeholder="Give your note a clear title..."
                placeholderTextColor={colors.textMuted}
                value={title}
                onChangeText={setTitle}
                maxLength={100}
                autoFocus={!editingNote}
              />
            </View>

            {/* Category Selector */}
            <View style={modalStyles.formGroup}>
              <View style={modalStyles.labelRow}>
                <Text style={modalStyles.fieldLabel}>CATEGORY</Text>
                {onOpenCategoryModal && (
                  <TouchableOpacity onPress={onOpenCategoryModal} activeOpacity={0.7}>
                    <Text style={modalStyles.manageCatLink}>+ Manage Categories</Text>
                  </TouchableOpacity>
                )}
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={modalStyles.catPillContainer}
              >
                {categories.map((cat) => {
                  const isSelected = category === cat.name;
                  return (
                    <TouchableOpacity
                      key={cat._id || cat.name}
                      style={[
                        modalStyles.catPill,
                        isSelected && {
                          backgroundColor: cat.color || colors.primary,
                          borderColor: cat.color || colors.primary,
                        },
                      ]}
                      onPress={() => {
                        setCategory(cat.name);
                        if (cat.color) setColor(cat.color);
                      }}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          modalStyles.catPillDot,
                          { backgroundColor: isSelected ? '#ffffff' : cat.color || '#7e37d8' },
                        ]}
                      />
                      <Text
                        style={[
                          modalStyles.catPillText,
                          isSelected && { color: '#ffffff', fontWeight: '700' },
                        ]}
                      >
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Color Accent */}
            <View style={modalStyles.formGroup}>
              <Text style={modalStyles.fieldLabel}>ACCENT COLOR</Text>
              <View style={modalStyles.colorRow}>
                {COLOR_PALETTE.map((c) => {
                  const isSel = color === c;
                  return (
                    <TouchableOpacity
                      key={c}
                      style={[
                        modalStyles.colorDot,
                        { backgroundColor: c },
                        isSel && modalStyles.colorDotSelected,
                      ]}
                      onPress={() => setColor(c)}
                      activeOpacity={0.8}
                    >
                      {isSel && <Ionicons name="checkmark" size={13} color="#ffffff" />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Description Textarea */}
            <View style={modalStyles.formGroup}>
              <Text style={modalStyles.fieldLabel}>DESCRIPTION & CONTENT</Text>
              <TextInput
                style={modalStyles.descriptionInput}
                placeholder="Write full details, steps, meeting points, recipes, or thoughts..."
                placeholderTextColor={colors.textMuted}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
            </View>

            {/* Pin to Top Switch */}
            <View style={modalStyles.pinRow}>
              <View style={modalStyles.pinLeft}>
                <Ionicons name="pin-outline" size={18} color={isPinned ? colors.primary : '#64748b'} />
                <View>
                  <Text style={modalStyles.pinTitle}>Pin to Top</Text>
                  <Text style={modalStyles.pinSub}>Keep this note highlighted at the very top</Text>
                </View>
              </View>
              <Switch
                value={isPinned}
                onValueChange={setIsPinned}
                trackColor={{ false: '#cbd5e1', true: '#ddd6fe' }}
                thumbColor={isPinned ? colors.primary : '#f8fafc'}
              />
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={modalStyles.footerRow}>
            <TouchableOpacity style={modalStyles.cancelBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={modalStyles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[modalStyles.saveBtn, saving && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={saving}
              activeOpacity={0.8}
            >
              <Ionicons name={editingNote ? 'checkmark-circle' : 'add'} size={16} color="#ffffff" />
              <Text style={modalStyles.saveBtnText}>
                {saving ? 'Saving...' : editingNote ? 'Update Note' : 'Create Note'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  container: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '90%',
    backgroundColor: '#ffffff',
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...Platform.select({
      web: { boxShadow: '0 12px 30px rgba(0,0,0,0.18)' },
      default: {
        elevation: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.16,
        shadowRadius: 18,
      },
    }),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 10,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 15.5,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  formGroup: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  fieldLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  manageCatLink: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  titleInput: {
    backgroundColor: '#ffffff',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  catPillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  catPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5.5,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  catPillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  catPillText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  colorDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorDotSelected: {
    borderWidth: 2,
    borderColor: '#ffffff',
    transform: [{ scale: 1.15 }],
  },
  descriptionInput: {
    backgroundColor: '#ffffff',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: colors.textPrimary,
    minHeight: 110,
    lineHeight: 19,
  },
  pinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.md,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 4,
    marginBottom: 8,
  },
  pinLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  pinTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  pinSub: {
    fontSize: 10.5,
    color: colors.textMuted,
    marginTop: 1,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: 10,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceAlt,
  },
  cancelBtnText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: radii.md,
    gap: 6,
  },
  saveBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#ffffff',
  },
});

