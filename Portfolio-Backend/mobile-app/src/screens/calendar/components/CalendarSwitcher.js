import React from 'react';
import { ScrollView, Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getCalendarId, isEventInCalendar, getCalendarColor, getCalendarName } from '../utils/calendarHelpers';

export default function CalendarSwitcher({ calendars = [], events = [], activeId = 'all', onSelect, onAdd }) {
  const isAllActive = activeId === 'all' || !activeId;

  const activeCalendar = !isAllActive
    ? calendars.find((c) => {
        const id = getCalendarId(c);
        return (
          id === activeId ||
          c._id === activeId ||
          c.client_id === activeId ||
          c.server_id === activeId ||
          c.name?.toLowerCase() === String(activeId).toLowerCase()
        );
      })
    : null;

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills}>
        {/* All Calendars Pill */}
        <TouchableOpacity
          style={[styles.pill, isAllActive && styles.allActive]}
          onPress={() => onSelect('all')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="globe-outline"
            size={14}
            color={isAllActive ? '#ffffff' : '#64748b'}
          />
          <Text style={[styles.pillText, isAllActive && styles.whiteText]}>
            All calendars
          </Text>
          <Text style={[styles.count, isAllActive && styles.activeCount]}>
            {events.length}
          </Text>
        </TouchableOpacity>

        {/* Individual Calendar Pills */}
        {calendars.map((calendar) => {
          const calId = getCalendarId(calendar);
          const color = getCalendarColor(calendar, '#7e37d8');
          const name = getCalendarName(calendar);

          const isSelected =
            !isAllActive &&
            (activeId === calId ||
              activeId === calendar._id ||
              activeId === calendar.client_id ||
              activeId === calendar.server_id ||
              String(activeId).toLowerCase() === name.toLowerCase());

          // Count only events belonging to this calendar
          const count = events.filter((ev) => isEventInCalendar(ev, calId, calendars)).length;

          return (
            <TouchableOpacity
              key={calId || name}
              style={[
                styles.pill,
                isSelected && {
                  backgroundColor: `${color}18`,
                  borderColor: color,
                  borderWidth: 1.5,
                },
              ]}
              onPress={() => onSelect(calId)}
              activeOpacity={0.7}
            >
              <View style={[styles.dot, { backgroundColor: color }]} />
              <Text
                numberOfLines={1}
                style={[
                  styles.pillText,
                  isSelected && { color, fontWeight: '700' },
                ]}
              >
                {name}
              </Text>
              <Text
                style={[
                  styles.count,
                  isSelected && {
                    color: '#ffffff',
                    backgroundColor: color,
                    fontWeight: '800',
                  },
                ]}
              >
                {count}
              </Text>
            </TouchableOpacity>
          );
        })}

        {/* Create New Calendar Pill */}
        <TouchableOpacity style={styles.addPill} onPress={onAdd} activeOpacity={0.7}>
          <Ionicons name="add" size={15} color="#7e37d8" />
          <Text style={styles.addText}>New</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Context Summary Bar */}
      <View style={styles.context}>
        <View style={[styles.dot, { backgroundColor: activeCalendar ? getCalendarColor(activeCalendar) : '#6366f1' }]} />
        <Text numberOfLines={1} style={styles.contextText}>
          {activeCalendar
            ? `Showing ${activeCalendar.name} · new events will be scheduled here`
            : `Showing all ${calendars.length} calendars`}
        </Text>
        {!isAllActive && (
          <TouchableOpacity onPress={() => onSelect('all')} style={styles.showAllLink}>
            <Text style={styles.showAllLinkText}>Reset to All</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    paddingTop: 6,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#edf0f5',
  },
  pills: {
    paddingHorizontal: 12,
    gap: 7,
    alignItems: 'center',
  },
  pill: {
    minHeight: 30,
    maxWidth: 180,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  allActive: {
    backgroundColor: '#1e293b',
    borderColor: '#1e293b',
  },
  pillText: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  whiteText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  count: {
    overflow: 'hidden',
    color: '#64748b',
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 9,
    backgroundColor: '#e2e8f0',
  },
  activeCount: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    color: '#ffffff',
  },
  addPill: {
    height: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 10,
    borderRadius: 15,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#c4b5fd',
    backgroundColor: '#faf5ff',
  },
  addText: {
    color: '#7e37d8',
    fontSize: 12,
    fontWeight: '700',
  },
  context: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: 14,
    marginTop: 5,
  },
  contextText: {
    flex: 1,
    color: '#64748b',
    fontSize: 11,
    lineHeight: 15,
  },
  showAllLink: {
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  showAllLinkText: {
    color: '#7e37d8',
    fontSize: 11,
    fontWeight: '700',
  },
});
