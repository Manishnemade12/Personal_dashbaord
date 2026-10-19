import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const PRESET_TIMES = [
  { label: '08:00 AM', h: 8, m: 0 },
  { label: '09:30 AM', h: 9, m: 30 },
  { label: '11:00 AM', h: 11, m: 0 },
  { label: '01:30 PM', h: 13, m: 30 },
  { label: '05:00 PM', h: 17, m: 0 },
  { label: '08:30 PM', h: 20, m: 30 },
];

export default function GenericDateTimePicker({
  dateStr, // YYYY-MM-DD
  onChangeDate,
  startTimeStr, // HH:mm (24hr)
  onChangeStartTime,
  endTimeStr, // HH:mm (24hr)
  onChangeEndTime,
  isAllDay = false,
}) {
  const [showCalendarGrid, setShowCalendarGrid] = useState(false);

  // Parse dateStr
  const parseCurrentDate = () => {
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return new Date();
    }
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  const currDate = parseCurrentDate();

  const formatDateStr = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const stepDate = (offset) => {
    const next = new Date(currDate);
    next.setDate(next.getDate() + offset);
    onChangeDate(formatDateStr(next));
  };

  const handleQuickChip = (daysFromToday) => {
    const target = new Date();
    target.setDate(target.getDate() + daysFromToday);
    onChangeDate(formatDateStr(target));
  };

  // Convert 24hr HH:mm to 12hr parts
  const parseTime = (timeStr = '10:00') => {
    const [hRaw, mRaw] = (timeStr || '10:00').split(':').map(Number);
    const h = isNaN(hRaw) ? 10 : hRaw;
    const m = isNaN(mRaw) ? 0 : mRaw;
    const isPm = h >= 12;
    const h12 = h % 12 || 12;
    return { h24: h, h12, m, isPm };
  };

  const format24Time = (h12, m, isPm) => {
    let h24 = h12 % 12;
    if (isPm) h24 += 12;
    return `${String(h24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const startParsed = parseTime(startTimeStr);
  const endParsed = parseTime(endTimeStr);

  const adjustStartTime = (deltaH, deltaM) => {
    let { h12, m, isPm } = startParsed;
    if (deltaH !== 0) {
      h12 = ((h12 - 1 + deltaH + 12) % 12) + 1;
    }
    if (deltaM !== 0) {
      m = ((m + deltaM + 60) % 60);
    }
    const newStart = format24Time(h12, m, isPm);
    onChangeStartTime(newStart);

    // Auto adjust end time to +1 hour if end is earlier or equal
    if (onChangeEndTime) {
      const newEnd = format24Time(((h12 % 12) + 1), m, isPm);
      onChangeEndTime(newEnd);
    }
  };

  const toggleStartAmPm = () => {
    const newStart = format24Time(startParsed.h12, startParsed.m, !startParsed.isPm);
    onChangeStartTime(newStart);
    if (onChangeEndTime) {
      onChangeEndTime(format24Time(endParsed.h12, endParsed.m, !startParsed.isPm));
    }
  };

  const applyPresetTime = (preset) => {
    const h24 = preset.h;
    const m = preset.m;
    const newStart = `${String(h24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    const endH24 = (h24 + 1) % 24;
    const newEnd = `${String(endH24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    onChangeStartTime(newStart);
    if (onChangeEndTime) onChangeEndTime(newEnd);
  };

  // Mini Calendar Grid Generation
  const year = currDate.getFullYear();
  const month = currDate.getMonth();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

  return (
    <View style={localStyles.wrapper}>
      {/* 1. DATE PICKER SECTION */}
      <View style={localStyles.sectionCard}>
        <View style={localStyles.headerRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="calendar-outline" size={15} color="#7e37d8" />
            <Text style={localStyles.sectionLabel}>Date Selector</Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowCalendarGrid(!showCalendarGrid)}
            style={localStyles.gridToggleBtn}
          >
            <Ionicons
              name={showCalendarGrid ? 'list' : 'calendar'}
              size={13}
              color="#7e37d8"
            />
            <Text style={localStyles.gridToggleText}>
              {showCalendarGrid ? 'Hide Calendar' : 'Pick on Calendar'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Date Stepper Bar */}
        <View style={localStyles.stepperBar}>
          <TouchableOpacity
            style={localStyles.arrowBtn}
            onPress={() => stepDate(-1)}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={16} color="#334155" />
          </TouchableOpacity>

          <TouchableOpacity
            style={localStyles.dateDisplayBtn}
            onPress={() => setShowCalendarGrid(!showCalendarGrid)}
            activeOpacity={0.8}
          >
            <Text style={localStyles.dateDisplayText}>
              {currDate.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={localStyles.arrowBtn}
            onPress={() => stepDate(1)}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-forward" size={16} color="#334155" />
          </TouchableOpacity>
        </View>

        {/* Quick Date Chips */}
        <View style={localStyles.quickChipsRow}>
          <TouchableOpacity
            style={localStyles.quickChip}
            onPress={() => handleQuickChip(0)}
          >
            <Text style={localStyles.quickChipText}>Today</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={localStyles.quickChip}
            onPress={() => handleQuickChip(1)}
          >
            <Text style={localStyles.quickChipText}>Tomorrow</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={localStyles.quickChip}
            onPress={() => handleQuickChip(2)}
          >
            <Text style={localStyles.quickChipText}>+2 Days</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={localStyles.quickChip}
            onPress={() => handleQuickChip(7)}
          >
            <Text style={localStyles.quickChipText}>Next Week</Text>
          </TouchableOpacity>
        </View>

        {/* Expandable Mini Calendar Grid */}
        {showCalendarGrid && (
          <View style={localStyles.calendarGridBox}>
            <Text style={localStyles.monthTitle}>
              {MONTH_NAMES[month]} {year}
            </Text>
            <View style={localStyles.weekdaysRow}>
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((w, idx) => (
                <Text key={idx} style={localStyles.weekdayText}>{w}</Text>
              ))}
            </View>
            <View style={localStyles.daysGrid}>
              {/* Empty slots before first day */}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <View key={`empty-${i}`} style={localStyles.dayCellEmpty} />
              ))}
              {/* Days of month */}
              {Array.from({ length: totalDaysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const isSelected = dayNum === currDate.getDate();
                return (
                  <TouchableOpacity
                    key={dayNum}
                    style={[
                      localStyles.dayCell,
                      isSelected && localStyles.dayCellSelected,
                    ]}
                    onPress={() => {
                      const d = new Date(year, month, dayNum);
                      onChangeDate(formatDateStr(d));
                      setShowCalendarGrid(false);
                    }}
                  >
                    <Text
                      style={[
                        localStyles.dayNumText,
                        isSelected && localStyles.dayNumTextSelected,
                      ]}
                    >
                      {dayNum}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      </View>

      {/* 2. TIME PICKER SECTION (Hidden if All Day) */}
      {!isAllDay && (
        <View style={[localStyles.sectionCard, { marginTop: 10 }]}>
          <View style={localStyles.headerRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="time-outline" size={15} color="#10b981" />
              <Text style={localStyles.sectionLabel}>Time Selector (No Manual Typing)</Text>
            </View>
          </View>

          {/* Quick Preset Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 10 }}
          >
            {PRESET_TIMES.map((preset) => {
              const isMatch =
                startParsed.h24 === preset.h && startParsed.m === preset.m;
              return (
                <TouchableOpacity
                  key={preset.label}
                  style={[
                    localStyles.timePresetChip,
                    isMatch && localStyles.timePresetChipActive,
                  ]}
                  onPress={() => applyPresetTime(preset)}
                >
                  <Text
                    style={[
                      localStyles.timePresetChipText,
                      isMatch && localStyles.timePresetChipTextActive,
                    ]}
                  >
                    {preset.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Interactive Stepper Time Display */}
          <View style={localStyles.timePickerRow}>
            {/* Start Time Box */}
            <View style={localStyles.timeBlock}>
              <Text style={localStyles.timeBlockLabel}>START TIME</Text>
              <View style={localStyles.timeControlRow}>
                {/* Hour */}
                <View style={localStyles.digitStepper}>
                  <TouchableOpacity
                    style={localStyles.digitArrow}
                    onPress={() => adjustStartTime(1, 0)}
                  >
                    <Ionicons name="chevron-up" size={12} color="#334155" />
                  </TouchableOpacity>
                  <Text style={localStyles.digitText}>
                    {String(startParsed.h12).padStart(2, '0')}
                  </Text>
                  <TouchableOpacity
                    style={localStyles.digitArrow}
                    onPress={() => adjustStartTime(-1, 0)}
                  >
                    <Ionicons name="chevron-down" size={12} color="#334155" />
                  </TouchableOpacity>
                </View>

                <Text style={localStyles.colonText}>:</Text>

                {/* Minute (15 min steps) */}
                <View style={localStyles.digitStepper}>
                  <TouchableOpacity
                    style={localStyles.digitArrow}
                    onPress={() => adjustStartTime(0, 15)}
                  >
                    <Ionicons name="chevron-up" size={12} color="#334155" />
                  </TouchableOpacity>
                  <Text style={localStyles.digitText}>
                    {String(startParsed.m).padStart(2, '0')}
                  </Text>
                  <TouchableOpacity
                    style={localStyles.digitArrow}
                    onPress={() => adjustStartTime(0, -15)}
                  >
                    <Ionicons name="chevron-down" size={12} color="#334155" />
                  </TouchableOpacity>
                </View>

                {/* AM / PM Toggle */}
                <TouchableOpacity
                  style={localStyles.amPmBtn}
                  onPress={toggleStartAmPm}
                >
                  <Text style={localStyles.amPmText}>
                    {startParsed.isPm ? 'PM' : 'AM'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Separator Arrow */}
            <Ionicons
              name="arrow-forward"
              size={14}
              color="#94a3b8"
              style={{ alignSelf: 'center', marginTop: 12 }}
            />

            {/* End Time Summary Badge */}
            <View style={localStyles.timeBlock}>
              <Text style={localStyles.timeBlockLabel}>END TIME</Text>
              <View style={[localStyles.timeControlRow, { paddingVertical: 10 }]}>
                <Text style={[localStyles.digitText, { fontSize: 14 }]}>
                  {String(endParsed.h12).padStart(2, '0')}:
                  {String(endParsed.m).padStart(2, '0')}{' '}
                  {endParsed.isPm ? 'PM' : 'AM'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const localStyles = StyleSheet.create({
  wrapper: {
    marginBottom: 12,
  },
  sectionCard: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  gridToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f3e8ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  gridToggleText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#7e37d8',
  },
  stepperBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 3,
    marginBottom: 8,
  },
  arrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateDisplayBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  dateDisplayText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  quickChipsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  quickChip: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickChipText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#475569',
  },
  calendarGridBox: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  monthTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 6,
  },
  weekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 4,
  },
  weekdayText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94a3b8',
    width: 24,
    textAlign: 'center',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCellEmpty: {
    width: '14.28%',
    height: 24,
  },
  dayCell: {
    width: '14.28%',
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
  },
  dayCellSelected: {
    backgroundColor: '#7e37d8',
  },
  dayNumText: {
    fontSize: 10,
    color: '#334155',
    fontWeight: '600',
  },
  dayNumTextSelected: {
    color: '#ffffff',
    fontWeight: '800',
  },
  timePresetChip: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 6,
  },
  timePresetChipActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  timePresetChipText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#475569',
  },
  timePresetChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  timePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  timeBlock: {
    flex: 1,
    alignItems: 'center',
  },
  timeBlockLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 4,
  },
  timeControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  digitStepper: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 2,
    paddingHorizontal: 4,
    width: 32,
  },
  digitArrow: {
    padding: 1,
  },
  digitText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  colonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#64748b',
  },
  amPmBtn: {
    backgroundColor: '#7e37d8',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amPmText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ffffff',
  },
});
