import React from 'react';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const getEventColor = (event) => event.color || event.calendarId?.color || '#7e37d8';

export default function MobileDayAgenda({ date, events, onAdd, onEventPress }) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.heading}>
          <Text style={styles.title}>{date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</Text>
          <Text style={styles.subtitle}>{events.length} event{events.length === 1 ? '' : 's'} scheduled</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={onAdd}>
          <Ionicons name="add" size={17} color="#7e37d8" /><Text style={styles.addText}>Add event</Text>
        </TouchableOpacity>
      </View>
      {events.length === 0 ? (
        <TouchableOpacity style={styles.empty} onPress={onAdd}>
          <Ionicons name="calendar-outline" size={26} color="#cbd5e1" />
          <Text style={styles.emptyText}>Nothing planned. Add an event for this day.</Text>
        </TouchableOpacity>
      ) : events.map((event) => {
        const color = getEventColor(event);
        const time = event.isAllDay ? 'All day' : new Date(event.startAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        return (
          <TouchableOpacity key={event._id} style={[styles.event, { borderLeftColor: color }]} onPress={() => onEventPress(event)} activeOpacity={0.8}>
            <View style={styles.eventContent}>
              <Text style={styles.eventTitle} numberOfLines={1}>{event.title}</Text>
              <Text style={styles.eventMeta} numberOfLines={1}>{time}{event.location ? ` · ${event.location}` : ''}</Text>
            </View>
            <View style={[styles.calendarBadge, { backgroundColor: `${color}15` }]}>
              <Text style={[styles.calendarName, { color }]} numberOfLines={1}>{event.calendarId?.name || 'Calendar'}</Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', marginHorizontal: 12, marginTop: 14, marginBottom: 12, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: '#e8ebf1' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12 },
  heading: { flex: 1, minWidth: 0 },
  title: { color: '#172033', fontSize: 16, fontWeight: '800' },
  subtitle: { color: '#7b8495', fontSize: 12, marginTop: 3 },
  addButton: { height: 38, paddingHorizontal: 10, borderRadius: 11, backgroundColor: '#f4effb', flexDirection: 'row', alignItems: 'center', gap: 3 },
  addText: { color: '#7e37d8', fontSize: 12, fontWeight: '800' },
  empty: { minHeight: 92, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, gap: 7 },
  emptyText: { textAlign: 'center', color: '#8791a1', fontSize: 13, lineHeight: 18 },
  event: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 11, paddingVertical: 10, marginBottom: 8, borderRadius: 12, borderLeftWidth: 4, backgroundColor: '#f8fafc' },
  eventContent: { flex: 1, minWidth: 0 },
  eventTitle: { color: '#172033', fontSize: 14, fontWeight: '700' },
  eventMeta: { color: '#687386', fontSize: 12, marginTop: 5 },
  calendarBadge: { maxWidth: 92, paddingHorizontal: 7, paddingVertical: 5, borderRadius: 7 },
  calendarName: { fontSize: 10, fontWeight: '800' },
});
