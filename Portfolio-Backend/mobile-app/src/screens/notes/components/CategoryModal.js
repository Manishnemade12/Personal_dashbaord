import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing } from '../../../styles/theme';
import api from '../../../api/client';

const COLOR_PALETTE = [
  '#7e37d8', // Purple
  '#3b82f6', // Blue
  '#10b981', // Green
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#06b6d4', // Cyan
  '#ec4899', // Pink
  '#8b5cf6', // Indigo
  '#64748b', // Slate
];

export default function CategoryModal({
  visible,
  onClose,
  categories = [],
  onRefresh,
  onSelectCategory,
}) {
  const [newCatName, setNewCatName] = useState('');
  const [selectedColor, setSelectedColor] = useState('#7e37d8');
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async () => {
    const trimmed = newCatName.trim();
    if (!trimmed) {
      Alert.alert('Category Name Required', 'Please enter a name for the category.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.createNoteCategory({
        name: trimmed,
        color: selectedColor,
      });

      if (res?.success || res?.category) {
        setNewCatName('');
        if (onRefresh) onRefresh();
        if (onSelectCategory) onSelectCategory(trimmed);
        onClose();
      } else {
        throw new Error(res?.error || 'Failed to create category');
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to create category');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (catName) => {
    if (catName.toLowerCase() === 'general') {
      Alert.alert('Protected Category', 'The default "General" category cannot be removed.');
      return;
    }

    Alert.alert(
      'Delete Category',
      `Delete "${catName}"? Any notes under this category will automatically move to "General".`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteNoteCategory(catName);
              if (onRefresh) onRefresh();
            } catch (err) {
              Alert.alert('Error', err.message || 'Failed to delete category');
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <View style={modalStyles.container}>
          {/* Header */}
          <View style={modalStyles.headerRow}>
            <View style={modalStyles.headerLeft}>
              <View style={modalStyles.iconWrap}>
                <Ionicons name="folder-outline" size={18} color="#7e37d8" />
              </View>
              <View>
                <Text style={modalStyles.title}>Manage Categories</Text>
                <Text style={modalStyles.subtitle}>Organize your notes into custom folders</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView style={modalStyles.scrollBody} showsVerticalScrollIndicator={false}>
            {/* Create New Category Form */}
            <View style={modalStyles.createBox}>
              <Text style={modalStyles.fieldLabel}>NEW CATEGORY NAME</Text>
              <TextInput
                style={modalStyles.textInput}
                placeholder="e.g. Shopping, Projects, Meeting Notes..."
                placeholderTextColor={colors.textMuted}
                value={newCatName}
                onChangeText={setNewCatName}
                maxLength={30}
              />

              {/* Color Palette */}
              <Text style={[modalStyles.fieldLabel, { marginTop: 12 }]}>PICK COLOR</Text>
              <View style={modalStyles.colorRow}>
                {COLOR_PALETTE.map((c) => {
                  const isSel = selectedColor === c;
                  return (
                    <TouchableOpacity
                      key={c}
                      style={[
                        modalStyles.colorCircle,
                        { backgroundColor: c },
                        isSel && modalStyles.colorCircleSelected,
                      ]}
                      onPress={() => setSelectedColor(c)}
                      activeOpacity={0.8}
                    >
                      {isSel && <Ionicons name="checkmark" size={14} color="#ffffff" />}
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                style={[modalStyles.createBtn, submitting && { opacity: 0.6 }]}
                onPress={handleCreate}
                disabled={submitting || !newCatName.trim()}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={16} color="#ffffff" />
                <Text style={modalStyles.createBtnText}>
                  {submitting ? 'Creating...' : 'Create Category'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Existing Categories List */}
            <Text style={[modalStyles.fieldLabel, { marginTop: 18, marginBottom: 8 }]}>
              EXISTING CATEGORIES ({categories.length})
            </Text>

            <View style={modalStyles.categoriesList}>
              {categories.map((cat) => {
                const isGeneral = cat.name.toLowerCase() === 'general';
                return (
                  <View key={cat._id || cat.name} style={modalStyles.catItemRow}>
                    <View style={modalStyles.catItemLeft}>
                      <View style={[modalStyles.catDot, { backgroundColor: cat.color || '#7e37d8' }]} />
                      <Text style={modalStyles.catItemName}>{cat.name}</Text>
                      {cat.count !== undefined && (
                        <View style={modalStyles.countPill}>
                          <Text style={modalStyles.countPillText}>{cat.count} note{cat.count === 1 ? '' : 's'}</Text>
                        </View>
                      )}
                    </View>

                    {!isGeneral && (
                      <TouchableOpacity
                        style={modalStyles.deleteBtn}
                        onPress={() => handleDelete(cat.name)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="trash-outline" size={15} color="#ef4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={modalStyles.footerRow}>
            <TouchableOpacity style={modalStyles.doneBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={modalStyles.doneBtnText}>Done</Text>
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
    maxWidth: 480,
    maxHeight: '85%',
    backgroundColor: '#ffffff',
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...Platform.select({
      web: { boxShadow: '0 10px 25px rgba(0,0,0,0.15)' },
      default: {
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
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
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    backgroundColor: '#f5f3ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
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
  createBox: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fieldLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#ffffff',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: colors.textPrimary,
  },
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 4,
  },
  colorCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorCircleSelected: {
    borderWidth: 2.5,
    borderColor: '#ffffff',
    transform: [{ scale: 1.15 }],
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 9,
    borderRadius: radii.md,
    gap: 6,
    marginTop: 12,
  },
  createBtnText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '700',
  },
  categoriesList: {
    backgroundColor: '#ffffff',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  catItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  catItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  catDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  catItemName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  countPill: {
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  countPillText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
  },
  deleteBtn: {
    padding: 6,
    borderRadius: radii.xs,
    backgroundColor: '#fef2f2',
  },
  footerRow: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    alignItems: 'flex-end',
  },
  doneBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.md,
  },
  doneBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.textPrimary,
  },
});
