import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../../api/client';
import styles from '../styles/aiRoutineStyles';

const formatTimeLabel = (dateInput) => {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const CATEGORIES = [
  { id: 'study', label: 'Study & Exams', icon: 'book-outline', template: '4-hour deep study session: DSA, theory revision & challenge problems with short breaks' },
  { id: 'diet', label: 'Diet & Nutrition', icon: 'restaurant-outline', template: 'High-protein clean diet routine: hydration, pre/post workout nutrition & meal timings' },
  { id: 'workout', label: 'Workout & Fitness', icon: 'barbell-outline', template: 'Daily fitness schedule: mobility warm-up, heavy strength training, and recovery walk' },
  { id: 'work', label: 'Work & Projects', icon: 'briefcase-outline', template: 'Focused deep work sprint: priority tasks, code review, and goal execution' },
  { id: 'general', label: 'General Routine', icon: 'sparkles-outline', template: 'Balanced daily routine with prioritized focus blocks, hydration, and breaks' },
];

const SUGGESTIONS = [
  { label: '📚 4h DSA + Coding Sprint', category: 'study', text: '4 hours DSA: Trees, Dynamic Programming & LeetCode problems with breaks' },
  { label: '🥗 High-Protein Diet & Hydration', category: 'diet', text: '5-meal high-protein diet routine with hydration and shake reminders' },
  { label: '🏋️ Morning Workout & Cardio', category: 'workout', text: 'Morning workout: dynamic warm-up, strength lifting & evening 5k walk' },
  { label: '💼 Full-Day Deep Work Sprint', category: 'work', text: 'Deep work sprint: finish priority roadmap milestones and review pull requests' },
];

export default function AiRoutinePlannerModal({
  visible,
  onClose,
  calendars = [],
  selectedDate,
  onRoutineCreated,
}) {
  const [step, setStep] = useState('setup'); // 'setup' | 'generating' | 'review'
  const [selectedCalendarId, setSelectedCalendarId] = useState('');
  const [targetDateStr, setTargetDateStr] = useState('');
  const [planCategory, setPlanCategory] = useState('study');
  const [userGoal, setUserGoal] = useState('');
  const [intensity, setIntensity] = useState('moderate');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Review state
  const [routineItems, setRoutineItems] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');

  // Synchronize initial state when modal opens
  useEffect(() => {
    if (visible) {
      setStep('setup');
      const d = selectedDate ? new Date(selectedDate) : new Date();
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      setTargetDateStr(`${yyyy}-${mm}-${dd}`);

      if (calendars.length > 0 && !selectedCalendarId) {
        // Default to a study or personal calendar if found
        const studyCal = calendars.find((c) => /study|exam|learn/i.test(c.name));
        const defaultCal = calendars.find((c) => c.isDefault) || calendars[0];
        setSelectedCalendarId(studyCal ? studyCal._id : defaultCal._id);
      }
      if (!userGoal) {
        setUserGoal(CATEGORIES[0].template);
      }
    }
  }, [visible, selectedDate, calendars]);

  // Handle Category Change
  const handleSelectCategory = (cat) => {
    setPlanCategory(cat.id);
    setUserGoal(cat.template);

    // Auto-select corresponding calendar if exists
    if (cat.id === 'study') {
      const match = calendars.find((c) => /study|exam|learn/i.test(c.name));
      if (match) setSelectedCalendarId(match._id);
    } else if (cat.id === 'diet') {
      const match = calendars.find((c) => /diet|food|health|nutrition/i.test(c.name));
      if (match) setSelectedCalendarId(match._id);
    } else if (cat.id === 'workout') {
      const match = calendars.find((c) => /fitness|gym|workout/i.test(c.name));
      if (match) setSelectedCalendarId(match._id);
    } else if (cat.id === 'work') {
      const match = calendars.find((c) => /work|project/i.test(c.name));
      if (match) setSelectedCalendarId(match._id);
    }
  };

  // Generate Routine with AI API
  const handleGenerateRoutine = async () => {
    if (!selectedCalendarId) {
      Alert.alert('Select Calendar', 'Please choose which calendar this routine should be created in.');
      return;
    }
    if (!userGoal.trim()) {
      Alert.alert('Enter Goal', 'Please describe your routine goal or focus for the AI.');
      return;
    }

    setIsGenerating(true);
    setStep('generating');

    try {
      const res = await api.generateAiRoutine({
        calendarId: selectedCalendarId,
        targetDateStr,
        userGoal: userGoal.trim(),
        planCategory,
        intensity,
      });

      if (res && res.success && Array.isArray(res.routine) && res.routine.length > 0) {
        setRoutineItems(res.routine);
        setStep('review');
      } else {
        Alert.alert('Routine Generation', 'Could not generate routine. Please try again with more details.');
        setStep('setup');
      }
    } catch (err) {
      console.error('[AI Routine Generation Error]', err);
      Alert.alert('Error', err.message || 'Failed to communicate with AI routine planner.');
      setStep('setup');
    } finally {
      setIsGenerating(false);
    }
  };

  // Remove an item from the generated routine
  const handleRemoveItem = (index) => {
    setRoutineItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Open Edit Modal for a single item
  const handleStartEdit = (index) => {
    const item = routineItems[index];
    setEditingIndex(index);
    setEditTitle(item.title);
    setEditDesc(item.description);
    const s = new Date(item.startAt);
    const e = new Date(item.endAt);
    const sh = String(s.getHours()).padStart(2, '0');
    const sm = String(s.getMinutes()).padStart(2, '0');
    const eh = String(e.getHours()).padStart(2, '0');
    const em = String(e.getMinutes()).padStart(2, '0');
    setEditStartTime(`${sh}:${sm}`);
    setEditEndTime(`${eh}:${em}`);
  };

  // Save changes to edited item
  const handleSaveEdit = () => {
    if (editingIndex === null) return;
    const [sh, sm] = editStartTime.split(':').map(Number);
    const [eh, em] = editEndTime.split(':').map(Number);

    const [yyyy, mm, dd] = targetDateStr.split('-').map(Number);
    const newStart = new Date(yyyy, mm - 1, dd, sh || 9, sm || 0, 0);
    const newEnd = new Date(yyyy, mm - 1, dd, eh || 10, em || 0, 0);

    setRoutineItems((prev) =>
      prev.map((item, idx) =>
        idx === editingIndex
          ? {
              ...item,
              title: editTitle.trim(),
              description: editDesc.trim(),
              startAt: newStart,
              endAt: newEnd,
            }
          : item
      )
    );
    setEditingIndex(null);
  };

  // Add custom slot manually
  const handleAddCustomSlot = () => {
    const [yyyy, mm, dd] = targetDateStr.split('-').map(Number);
    const newStart = new Date(yyyy, mm - 1, dd, 12, 0, 0);
    const newEnd = new Date(yyyy, mm - 1, dd, 13, 0, 0);
    const targetCal = calendars.find((c) => c._id === selectedCalendarId) || { name: 'Routine', color: '#7e37d8' };

    setRoutineItems((prev) => [
      ...prev,
      {
        title: 'Custom Focus Slot',
        description: 'Manually added routine block',
        startAt: newStart,
        endAt: newEnd,
        priority: 'medium',
        calendarId: selectedCalendarId,
        calendarName: targetCal.name,
        calendarColor: targetCal.color,
      },
    ]);
  };

  // Accept and save all verified routine events to calendar
  const handleAcceptRoutine = async () => {
    if (routineItems.length === 0) {
      Alert.alert('Empty Routine', 'Please add at least one routine event to save.');
      return;
    }

    setIsSaving(true);
    try {
      const payload = routineItems.map((item) => ({
        calendarId: item.calendarId || selectedCalendarId,
        title: item.title,
        description: item.description,
        startAt: item.startAt,
        endAt: item.endAt,
        priority: item.priority || 'medium',
      }));

      const res = await api.bulkCreateEvents({ events: payload });
      if (res && res.success) {
        Alert.alert(
          '🎉 Routine Scheduled!',
          `Successfully added ${res.count} events to your calendar for ${targetDateStr}.`
        );
        if (onRoutineCreated) {
          onRoutineCreated();
        }
        onClose();
      } else {
        throw new Error(res?.error || 'Failed to save events in bulk');
      }
    } catch (err) {
      console.error('[Bulk Save Routine Error]', err);
      Alert.alert('Save Failed', err.message || 'Could not save routine events to database.');
    } finally {
      setIsSaving(false);
    }
  };

  const selectedCalendar = calendars.find((c) => c._id === selectedCalendarId);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconBox}>
                <Ionicons name="sparkles" size={20} color="#ffffff" />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.headerTitle} numberOfLines={1}>
                  {step === 'review' ? 'Verify & Accept AI Routine' : 'AI Routine Architect'}
                </Text>
                <Text style={styles.headerSubtitle} numberOfLines={1}>
                  {step === 'review'
                    ? `Cross-calendar optimized for ${targetDateStr}`
                    : 'Smart schedule with multi-calendar conflict & synergy awareness'}
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={20} color="#6b21a8" />
            </TouchableOpacity>
          </View>

          {/* STEP 1: SETUP */}
          {step === 'setup' && (
            <>
              <ScrollView style={styles.modalBodyScroll} contentContainerStyle={styles.modalBodyContent}>
                {/* Info / Rule Banner */}
                <View style={styles.infoBanner}>
                  <Ionicons name="shield-checkmark" size={18} color="#16a34a" />
                  <Text style={styles.infoBannerText}>
                    <Text style={{ fontWeight: '700' }}>Smart Multi-Calendar Awareness: </Text>
                    AI checks all existing events across your calendars. Hard conflicts (meetings/classes) are avoided, while parallel habits (diet reminders, shakes, water) co-occur naturally without delaying your study/work blocks!
                  </Text>
                </View>

                {/* Target Calendar Selector */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Target Calendar (Where to add routine)</Text>
                  <View style={styles.pillsRow}>
                    {calendars.map((cal) => {
                      const isSelected = cal._id === selectedCalendarId;
                      return (
                        <TouchableOpacity
                          key={cal._id}
                          style={[styles.calendarPill, isSelected && styles.calendarPillActive]}
                          onPress={() => setSelectedCalendarId(cal._id)}
                          activeOpacity={0.7}
                        >
                          <View style={[styles.calendarDot, { backgroundColor: cal.color || '#7e37d8' }]} />
                          <Text style={[styles.calendarPillText, isSelected && styles.calendarPillTextActive]}>
                            {cal.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Target Date Input */}
                <View style={styles.fieldGroup}>
                  <View style={styles.fieldLabelRow}>
                    <Text style={styles.fieldLabel}>Schedule Date (YYYY-MM-DD)</Text>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <TouchableOpacity
                        onPress={() => {
                          const today = new Date();
                          const yyyy = today.getFullYear();
                          const mm = String(today.getMonth() + 1).padStart(2, '0');
                          const dd = String(today.getDate()).padStart(2, '0');
                          setTargetDateStr(`${yyyy}-${mm}-${dd}`);
                        }}
                      >
                        <Text style={{ fontSize: 11, color: '#7e37d8', fontWeight: '700' }}>Today</Text>
                      </TouchableOpacity>
                      <Text style={{ fontSize: 11, color: '#94a3b8' }}>•</Text>
                      <TouchableOpacity
                        onPress={() => {
                          const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
                          const yyyy = tomorrow.getFullYear();
                          const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
                          const dd = String(tomorrow.getDate()).padStart(2, '0');
                          setTargetDateStr(`${yyyy}-${mm}-${dd}`);
                        }}
                      >
                        <Text style={{ fontSize: 11, color: '#7e37d8', fontWeight: '700' }}>Tomorrow</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <TextInput
                    style={styles.textInput}
                    value={targetDateStr}
                    onChangeText={setTargetDateStr}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#94a3b8"
                  />
                </View>

                {/* Category Selector */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Routine Category</Text>
                  <View style={styles.pillsRow}>
                    {CATEGORIES.map((cat) => {
                      const isActive = planCategory === cat.id;
                      return (
                        <TouchableOpacity
                          key={cat.id}
                          style={[styles.categoryPill, isActive && styles.categoryPillActive]}
                          onPress={() => handleSelectCategory(cat)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name={cat.icon} size={14} color={isActive ? '#7e37d8' : '#64748b'} />
                          <Text style={[styles.categoryPillText, isActive && styles.categoryPillTextActive]}>
                            {cat.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* User Goal / Instructions Input */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Goal & Specific Details for AI</Text>
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    value={userGoal}
                    onChangeText={setUserGoal}
                    placeholder="e.g. 4-hour DSA revision: trees, graphs & 3 leetcode problems. Note that I have a diet shake at 9:00 AM."
                    placeholderTextColor="#94a3b8"
                    multiline
                  />

                  {/* Quick Suggestion Chips */}
                  <View style={styles.suggestionsRow}>
                    {SUGGESTIONS.map((sug, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={styles.suggestionChip}
                        onPress={() => {
                          setPlanCategory(sug.category);
                          setUserGoal(sug.text);
                        }}
                      >
                        <Text style={styles.suggestionChipText}>{sug.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </ScrollView>

              {/* Action Footer */}
              <View style={styles.modalFooterBar}>
                <TouchableOpacity style={styles.secondaryBtn} onPress={onClose} activeOpacity={0.7}>
                  <Text style={styles.secondaryBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={handleGenerateRoutine}
                  activeOpacity={0.8}
                >
                  <Ionicons name="sparkles" size={15} color="#ffffff" />
                  <Text style={styles.primaryBtnText}>Generate Routine with AI</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* STEP 2: GENERATING ANIMATION */}
          {step === 'generating' && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#7e37d8" />
              <Text style={styles.loadingTitle}>Architecting Your Daily Routine...</Text>
              <Text style={styles.loadingSubtitle}>
                Analyzing existing events across all calendars, verifying compatibility of habits (shakes/hydration), and creating optimal focus blocks.
              </Text>
            </View>
          )}

          {/* STEP 3: REVIEW, CUSTOMIZE, ACCEPT / REJECT */}
          {step === 'review' && (
            <>
              <ScrollView style={styles.modalBodyScroll} contentContainerStyle={styles.modalBodyContent}>
                <View style={styles.reviewHeaderRow}>
                  <Text style={styles.reviewTitle}>
                    {selectedCalendar?.name || 'Routine'} ({targetDateStr})
                  </Text>
                  <View style={styles.reviewCountBadge}>
                    <Text style={styles.reviewCountText}>{routineItems.length} Events</Text>
                  </View>
                </View>

                {/* Routine Items List */}
                {routineItems.map((item, index) => {
                  const startTime = formatTimeLabel(item.startAt);
                  const endTime = formatTimeLabel(item.endAt);
                  const isEditing = editingIndex === index;

                  if (isEditing) {
                    return (
                      <View key={index} style={[styles.routineCard, { borderColor: '#7e37d8', backgroundColor: '#faf5ff' }]}>
                        <Text style={[styles.fieldLabel, { color: '#7e37d8' }]}>Edit Event Slot</Text>
                        <TextInput
                          style={styles.textInput}
                          value={editTitle}
                          onChangeText={setEditTitle}
                          placeholder="Event Title"
                        />
                        <TextInput
                          style={[styles.textInput, { minHeight: 45 }]}
                          value={editDesc}
                          onChangeText={setEditDesc}
                          placeholder="Event Description"
                          multiline
                        />
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.fieldHelper}>Start Time (HH:MM)</Text>
                            <TextInput
                              style={styles.textInput}
                              value={editStartTime}
                              onChangeText={setEditStartTime}
                              placeholder="09:00"
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.fieldHelper}>End Time (HH:MM)</Text>
                            <TextInput
                              style={styles.textInput}
                              value={editEndTime}
                              onChangeText={setEditEndTime}
                              placeholder="10:30"
                            />
                          </View>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
                          <TouchableOpacity
                            style={[styles.cardActionBtn, { backgroundColor: '#f1f5f9' }]}
                            onPress={() => setEditingIndex(null)}
                          >
                            <Text style={styles.cardActionText}>Cancel</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.cardActionBtn, { backgroundColor: '#7e37d8' }]}
                            onPress={handleSaveEdit}
                          >
                            <Text style={[styles.cardActionText, { color: '#ffffff' }]}>Save</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  }

                  return (
                    <View key={index} style={styles.routineCard}>
                      <View style={styles.routineCardHeader}>
                        <View style={styles.timeBadge}>
                          <Ionicons name="time-outline" size={13} color="#475569" />
                          <Text style={styles.timeBadgeText}>
                            {startTime} - {endTime}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.priorityBadge,
                            item.priority === 'high'
                              ? styles.priorityBadgeHigh
                              : item.priority === 'low'
                              ? styles.priorityBadgeLow
                              : styles.priorityBadgeMed,
                          ]}
                        >
                          <Text
                            style={[
                              styles.priorityText,
                              {
                                color:
                                  item.priority === 'high'
                                    ? '#b91c1c'
                                    : item.priority === 'low'
                                    ? '#0369a1'
                                    : '#b45309',
                              },
                            ]}
                          >
                            {item.priority || 'medium'}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.routineCardTitle}>{item.title}</Text>
                      {!!item.description && (
                        <Text style={styles.routineCardDesc}>{item.description}</Text>
                      )}

                      {/* Co-Occurrence Synergy Badge */}
                      {!!item.coOccurrenceNote && (
                        <View style={styles.parallelBanner}>
                          <Ionicons name="git-merge-outline" size={14} color="#1d4ed8" />
                          <Text style={styles.parallelText}>{item.coOccurrenceNote}</Text>
                        </View>
                      )}

                      {/* Conflict Resolution Badge */}
                      {!!item.conflictResolution && (
                        <View style={styles.conflictBanner}>
                          <Ionicons name="shield-outline" size={14} color="#854d0e" />
                          <Text style={styles.conflictText}>{item.conflictResolution}</Text>
                        </View>
                      )}

                      {/* Card Actions (Edit, Delete) */}
                      <View style={styles.cardActionsRow}>
                        <TouchableOpacity
                          style={styles.cardActionBtn}
                          onPress={() => handleStartEdit(index)}
                        >
                          <Ionicons name="pencil" size={12} color="#64748b" />
                          <Text style={styles.cardActionText}>Edit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.cardActionBtn}
                          onPress={() => handleRemoveItem(index)}
                        >
                          <Ionicons name="trash-outline" size={12} color="#ef4444" />
                          <Text style={[styles.cardActionText, { color: '#ef4444' }]}>Remove</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}

                {/* Add Custom Slot */}
                <TouchableOpacity style={styles.addSlotBtn} onPress={handleAddCustomSlot} activeOpacity={0.7}>
                  <Ionicons name="add-circle-outline" size={16} color="#64748b" />
                  <Text style={styles.addSlotText}>+ Add Custom Slot</Text>
                </TouchableOpacity>
              </ScrollView>

              {/* Action Footer for Review */}
              <View style={styles.modalFooterBar}>
                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={() => setStep('setup')}
                  disabled={isSaving}
                  activeOpacity={0.7}
                >
                  <Ionicons name="arrow-back" size={14} color="#334155" />
                  <Text style={styles.secondaryBtnText}>Adjust Plan</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.primaryBtn, (routineItems.length === 0 || isSaving) && styles.primaryBtnDisabled]}
                  onPress={handleAcceptRoutine}
                  disabled={routineItems.length === 0 || isSaving}
                  activeOpacity={0.8}
                >
                  <Ionicons name="checkmark-circle" size={15} color="#ffffff" />
                  <Text style={styles.primaryBtnText}>
                    {isSaving ? 'Scheduling...' : `Accept & Add Routine (${routineItems.length})`}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}
