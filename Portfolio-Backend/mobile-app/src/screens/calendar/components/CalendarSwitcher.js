import React from 'react';
import { ScrollView, Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function CalendarSwitcher({ calendars, events, activeId, onSelect, onAdd }) {
  const activeCalendar = calendars.find((calendar) => calendar._id === activeId);
  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills}>
        <TouchableOpacity style={[styles.pill, activeId === 'all' && styles.allActive]} onPress={() => onSelect('all')}>
          <Ionicons name="globe-outline" size={15} color={activeId === 'all' ? '#fff' : '#64748b'} />
          <Text style={[styles.pillText, activeId === 'all' && styles.whiteText]}>All calendars</Text>
          <Text style={[styles.count, activeId === 'all' && styles.activeCount]}>{events.length}</Text>
        </TouchableOpacity>
        {calendars.map((calendar) => {
          const selected = activeId === calendar._id;
          const count = events.filter((event) => (event.calendarId?._id || event.calendarId) === calendar._id).length;
          const color = calendar.color || '#7e37d8';
          return (
            <TouchableOpacity key={calendar._id} style={[styles.pill, selected && { backgroundColor: `${color}14`, borderColor: color }]} onPress={() => onSelect(calendar._id)}>
              <View style={[styles.dot, { backgroundColor: color }]} />
              <Text numberOfLines={1} style={[styles.pillText, selected && { color }]}>{calendar.name}</Text>
              <Text style={[styles.count, selected && { color: '#fff', backgroundColor: color }]}>{count}</Text>
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity style={styles.addPill} onPress={onAdd}>
          <Ionicons name="add" size={16} color="#7e37d8" /><Text style={styles.addText}>New</Text>
        </TouchableOpacity>
      </ScrollView>
      <View style={styles.context}>
        <View style={[styles.dot, { backgroundColor: activeCalendar?.color || '#6366f1' }]} />
        <Text numberOfLines={2} style={styles.contextText}>
          {activeCalendar ? `Showing ${activeCalendar.name} · new events will be saved here` : `Showing all ${calendars.length} calendars`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#fff', paddingTop: 6, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: '#edf0f5' },
  pills: { paddingHorizontal: 10, gap: 6, alignItems: 'center' },
  pill: { minHeight: 28, maxWidth: 180, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, borderRadius: 14, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fafbfc' },
  allActive: { backgroundColor: '#253047', borderColor: '#253047' },
  pillText: { flexShrink: 1, fontSize: 11, fontWeight: '600', color: '#475569' },
  whiteText: { color: '#fff' },
  dot: { width: 6, height: 6, borderRadius: 3 },
  count: { overflow: 'hidden', color: '#64748b', fontSize: 9.5, fontWeight: '700', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 8, backgroundColor: '#e9edf3' },
  activeCount: { backgroundColor: 'rgba(255,255,255,0.22)', color: '#fff' },
  addPill: { height: 28, flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 8, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: '#d8c8ed' },
  addText: { color: '#7e37d8', fontSize: 11, fontWeight: '600' },
  context: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: 10, marginTop: 4 },
  contextText: { flex: 1, color: '#64748b', fontSize: 10, lineHeight: 14 },
});
