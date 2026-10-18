import React from 'react';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function CalendarToolbar({
  dateLabel, onPrevious, onToday, onNext, calendarCount,
  onCalendars, onReminders, onCreateEvent,
}) {
  return (
    <View style={styles.container}>
      <View style={styles.dateRow}>
        <Text style={styles.title}>{dateLabel}</Text>
        <View style={styles.navigation}>
          <TouchableOpacity accessibilityLabel="Previous date" style={styles.navButton} onPress={onPrevious}>
            <Ionicons name="chevron-back" size={14} color="#334155" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.todayButton} onPress={onToday}><Text style={styles.todayText}>Today</Text></TouchableOpacity>
          <TouchableOpacity accessibilityLabel="Next date" style={styles.navButton} onPress={onNext}>
            <Ionicons name="chevron-forward" size={14} color="#334155" />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.calendarButton} onPress={onCalendars}>
          <Ionicons name="albums-outline" size={13} color="#7e37d8" />
          <Text style={styles.calendarText} numberOfLines={1}>Calendars ({calendarCount})</Text>
        </TouchableOpacity>
        <TouchableOpacity accessibilityLabel="Upcoming reminders" style={styles.reminderButton} onPress={onReminders}>
          <Ionicons name="notifications-outline" size={14} color="#2563eb" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.createButton} onPress={onCreateEvent}>
          <Ionicons name="add" size={14} color="#fff" />
          <Text style={styles.createText}>Event</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#fff', paddingHorizontal: 10, paddingTop: 8, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: '#edf0f5', gap: 6 },
  dateRow: { minHeight: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  title: { flexShrink: 1, fontSize: 14, fontWeight: '700', color: '#172033' },
  navigation: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  navButton: { width: 26, height: 26, borderRadius: 6, backgroundColor: '#f3f4f8', alignItems: 'center', justifyContent: 'center' },
  todayButton: { paddingHorizontal: 7, height: 26, borderRadius: 6, backgroundColor: '#f3f4f8', justifyContent: 'center' },
  todayText: { fontSize: 10.5, fontWeight: '600', color: '#475569' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  calendarButton: { flex: 1, minWidth: 0, height: 26, borderRadius: 6, paddingHorizontal: 7, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: '#f4effb' },
  calendarText: { flexShrink: 1, fontSize: 10.5, fontWeight: '600', color: '#7e37d8' },
  reminderButton: { width: 26, height: 26, borderRadius: 6, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  createButton: { height: 26, borderRadius: 6, paddingHorizontal: 8, backgroundColor: '#7e37d8', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2 },
  createText: { color: '#fff', fontSize: 10.5, fontWeight: '600' },
});
