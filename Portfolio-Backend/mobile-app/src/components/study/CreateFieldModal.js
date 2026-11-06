import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const PRESET_COLORS = [
  '#6366f1', // Indigo
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#8b5cf6', // Violet
  '#f43f5e', // Rose
  '#f59e0b', // Amber
  '#3b82f6', // Blue
  '#14b8a6', // Teal
];

const PRESET_ICONS = [
  'school-outline',
  'code-slash-outline',
  'construct-outline',
  'book-outline',
  'hardware-chip-outline',
  'terminal-outline',
  'calculator-outline',
  'flask-outline',
  'rocket-outline',
  'ribbon-outline',
  'briefcase-outline',
  'layers-outline',
];

export default function CreateFieldModal({
  visible,
  onClose,
  onSave,
  fieldToEdit = null,
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [icon, setIcon] = useState('school-outline');
  const [error, setError] = useState('');

  useEffect(() => {
    if (fieldToEdit) {
      setName(fieldToEdit.name || '');
      setDescription(fieldToEdit.description || '');
      setColor(fieldToEdit.color || '#6366f1');
      setIcon(fieldToEdit.icon || 'school-outline');
    } else {
      setName('');
      setDescription('');
      setColor('#6366f1');
      setIcon('school-outline');
    }
    setError('');
  }, [fieldToEdit, visible]);

  const handleSubmit = () => {
    if (!name.trim()) {
      setError('Please enter a folder / field name.');
      return;
    }
    onSave({
      name: name.trim(),
      description: description.trim(),
      color,
      icon,
    });
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.modalBox}>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View style={[styles.iconBubble, { backgroundColor: color }]}>
                <Ionicons name={icon} size={18} color="#ffffff" />
              </View>
              <Text style={styles.modalTitle}>
                {fieldToEdit ? 'Edit Study Folder' : 'New Study Folder'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Text style={styles.inputLabel}>Folder / Field Name *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. SSC Exam Prep, Engineering, GATE..."
              placeholderTextColor="#64748b"
              value={name}
              onChangeText={(t) => {
                setName(t);
                if (error) setError('');
              }}
            />

            <Text style={styles.inputLabel}>Description / Target Exam</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="e.g. Computer Science, Algorithms, Core engineering subjects..."
              placeholderTextColor="#64748b"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />

            {/* Color Palette */}
            <Text style={styles.inputLabel}>Color Theme</Text>
            <View style={styles.colorsRow}>
              {PRESET_COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.colorCircle,
                    { backgroundColor: c },
                    color === c && styles.colorCircleActive,
                  ]}
                  onPress={() => setColor(c)}
                  activeOpacity={0.8}
                >
                  {color === c && (
                    <Ionicons name="checkmark" size={14} color="#ffffff" />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Icon Picker */}
            <Text style={styles.inputLabel}>Folder Icon</Text>
            <View style={styles.iconsRow}>
              {PRESET_ICONS.map((ic) => (
                <TouchableOpacity
                  key={ic}
                  style={[
                    styles.iconTile,
                    icon === ic && { borderColor: color, backgroundColor: 'rgba(99, 102, 241, 0.15)' },
                  ]}
                  onPress={() => setIcon(ic)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={ic}
                    size={20}
                    color={icon === ic ? color : '#94a3b8'}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <View style={styles.btnRow}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: color }]}
              onPress={handleSubmit}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-circle-outline" size={18} color="#ffffff" />
              <Text style={styles.saveBtnText}>
                {fieldToEdit ? 'Save Changes' : 'Create Folder'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  modalBox: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#0f172a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 20,
    maxHeight: '90%',
    zIndex: 10,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBubble: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f8fafc',
  },
  closeBtn: {
    padding: 4,
  },
  formScroll: {
    maxHeight: 400,
  },
  errorText: {
    fontSize: 12,
    color: '#f43f5e',
    marginBottom: 10,
    fontWeight: '600',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#cbd5e1',
    marginTop: 10,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    color: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  textArea: {
    height: 70,
    textAlignVertical: 'top',
  },
  colorsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginVertical: 4,
  },
  colorCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorCircleActive: {
    borderWidth: 2,
    borderColor: '#ffffff',
    transform: [{ scale: 1.15 }],
  },
  iconsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 4,
  },
  iconTile: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#1e293b',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#cbd5e1',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
});

