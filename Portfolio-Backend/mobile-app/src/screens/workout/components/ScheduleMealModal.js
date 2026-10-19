import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import styles from '../styles/workoutStyles';
import api from '../../../api/client';

const TIME_PRESETS = [
  { label: 'Breakfast', time: '08:00' },
  { label: 'Mid-Morning', time: '11:00' },
  { label: 'Lunch', time: '13:30' },
  { label: 'Pre-Workout', time: '17:00' },
  { label: 'Post-Workout', time: '18:30' },
  { label: 'Dinner', time: '20:30' },
];

export default function ScheduleMealModal({
  visible,
  onClose,
  dietItems,
  prefillItem,
  defaultDateStr,
  onScheduleSuccess,
}) {
  const [selectedDietId, setSelectedDietId] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [dateStr, setDateStr] = useState(defaultDateStr || new Date().toISOString().slice(0, 10));
  const [timeStr, setTimeStr] = useState('08:30');
  const [scheduling, setScheduling] = useState(false);

  useEffect(() => {
    if (prefillItem) {
      setSelectedDietId(prefillItem._id);
      setCustomTitle(prefillItem.name);
    } else if (dietItems && dietItems.length > 0) {
      setSelectedDietId(dietItems[0]._id);
      setCustomTitle(dietItems[0].name);
    } else {
      setSelectedDietId('');
      setCustomTitle('');
    }
    setDateStr(defaultDateStr || new Date().toISOString().slice(0, 10));
    setTimeStr('08:30');
  }, [prefillItem, dietItems, defaultDateStr, visible]);

  const selectedItem = (dietItems || []).find((i) => i._id === selectedDietId);

  const handleSelectDiet = (item) => {
    setSelectedDietId(item._id);
    setCustomTitle(item.name);
  };

  const handleSchedule = async () => {
    const finalTitle = customTitle.trim() || selectedItem?.name;
    if (!finalTitle) {
      Alert.alert('Required', 'Please select a diet item or enter a meal title.');
      return;
    }
    if (!dateStr || !timeStr) {
      Alert.alert('Required', 'Please enter date (YYYY-MM-DD) and time (HH:mm).');
      return;
    }

    setScheduling(true);
    try {
      await api.scheduleDietMeal({
        title: finalTitle,
        dateStr,
        timeStr,
        description: selectedItem?.description || '',
        calories: selectedItem?.nutrients?.calories || 0,
        protein: selectedItem?.nutrients?.protein || 0,
      });

      onScheduleSuccess();
      onClose();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to schedule meal.');
    } finally {
      setScheduling(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Schedule Meal to Diet Calendar</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
              <Ionicons name="close" size={22} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Quick Pick from Library */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Choose From Diet Library</Text>
              {dietItems && dietItems.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                  {dietItems.map((item) => {
                    const isSelected = selectedDietId === item._id;
                    return (
                      <TouchableOpacity
                        key={item._id}
                        style={[
                          styles.categoryChip,
                          isSelected && styles.categoryChipActive,
                          { paddingHorizontal: 10, paddingVertical: 6 },
                        ]}
                        onPress={() => handleSelectDiet(item)}
                      >
                        <Text
                          style={[
                            styles.categoryChipText,
                            isSelected && styles.categoryChipTextActive,
                          ]}
                        >
                          {item.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              ) : (
                <Text style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>
                  (No saved diets in library. Enter title manually below)
                </Text>
              )}
            </View>

            {/* Meal Title Input */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Meal Title *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. Morning High-Protein Shake"
                placeholderTextColor="#94a3b8"
                value={customTitle}
                onChangeText={setCustomTitle}
              />
            </View>

            {/* Date Input */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Scheduled Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#94a3b8"
                value={dateStr}
                onChangeText={setDateStr}
              />
            </View>

            {/* Time Slot Presets & Custom Time */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Meal Time</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                {TIME_PRESETS.map((preset) => {
                  const isMatch = timeStr === preset.time;
                  return (
                    <TouchableOpacity
                      key={preset.time}
                      style={[
                        styles.macroPill,
                        isMatch && { backgroundColor: '#10b981', borderColor: '#10b981' },
                      ]}
                      onPress={() => setTimeStr(preset.time)}
                    >
                      <Text
                        style={[
                          styles.macroPillText,
                          isMatch && { color: '#ffffff', fontWeight: '700' },
                        ]}
                      >
                        {preset.label} ({preset.time})
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TextInput
                style={styles.formInput}
                placeholder="HH:mm (24-hour format, e.g. 08:30)"
                placeholderTextColor="#94a3b8"
                value={timeStr}
                onChangeText={setTimeStr}
              />
            </View>

            {/* Selected Meal Macro Preview */}
            {selectedItem && (
              <View
                style={{
                  backgroundColor: '#f0fdf4',
                  borderRadius: 8,
                  padding: 10,
                  borderWidth: 1,
                  borderColor: '#bbf7d0',
                  marginBottom: 10,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#047857', marginBottom: 2 }}>
                  Scheduled Meal Macros:
                </Text>
                <Text style={{ fontSize: 11, color: '#166534' }}>
                  ⚡ {selectedItem.nutrients?.calories || 0} kcal &nbsp;|&nbsp; 💪{' '}
                  {selectedItem.nutrients?.protein || 0}g Protein
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleSchedule}
              disabled={scheduling}
              activeOpacity={0.8}
            >
              {scheduling ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.saveBtnText}>Add to Diet Calendar</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
