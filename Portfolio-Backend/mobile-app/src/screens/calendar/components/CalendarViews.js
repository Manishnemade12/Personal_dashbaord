import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MobileDayAgenda from './MobileDayAgenda';
import styles from '../styles/calendarStyles';

export default function CalendarViews({ isMobile, currentDate, selectedDate, setSelectedDate, visibleEvents, openEventModal, viewMode }) {
  // ==========================================
  // VIEW RENDERERS
  // ==========================================

  // 1. Month View Grid
  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

    const days = [];
    // Leading empty slots
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ empty: true, key: `lead-${i}` });
    }
    // Days of month
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      const isToday = isCurrentMonth && today.getDate() === d;

      // Filter events on this day
      const dayEvents = visibleEvents.filter((ev) => {
        const evDate = new Date(ev.startAt);
        return (
          evDate.getFullYear() === year &&
          evDate.getMonth() === month &&
          evDate.getDate() === d
        );
      });

      days.push({
        dayNumber: d,
        dateObj,
        isToday,
        events: dayEvents,
        key: `day-${d}`,
      });
    }

    if (isMobile) {
      const selectedDayEvents = visibleEvents.filter((ev) => {
        const evDate = new Date(ev.startAt);
        return (
          evDate.getFullYear() === selectedDate.getFullYear() &&
          evDate.getMonth() === selectedDate.getMonth() &&
          evDate.getDate() === selectedDate.getDate()
        );
      });

      return (
        <ScrollView
          style={styles.monthScrollView}
          contentContainerStyle={{ paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.monthContainer, { paddingHorizontal: 6, paddingTop: 6 }]}>
            {/* Day Name Headers */}
            <View style={styles.weekHeaderRow}>
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((w, idx) => (
                <Text key={idx} style={[styles.weekHeaderCell, { fontSize: 11 }]}>{w}</Text>
              ))}
            </View>

            {/* Days Grid */}
            <View style={styles.monthGrid}>
              {days.map((item) => {
                if (item.empty) {
                  return <View key={item.key} style={[styles.monthCellEmpty, { height: 48, minHeight: 48 }]} />;
                }
                const isSelected =
                  selectedDate.getFullYear() === year &&
                  selectedDate.getMonth() === month &&
                  selectedDate.getDate() === item.dayNumber;

                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[
                      styles.monthCell,
                      { height: 50, minHeight: 50, padding: 2, alignItems: 'center', justifyContent: 'center' },
                      item.isToday && { backgroundColor: '#f5f3ff' },
                      isSelected && { borderColor: '#7e37d8', borderWidth: 1.5, backgroundColor: '#f3e8ff' },
                    ]}
                    onPress={() => setSelectedDate(item.dateObj)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.dayNumWrap,
                        item.isToday && styles.dayNumTodayWrap,
                        isSelected && { backgroundColor: '#7e37d8' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayNumText,
                          item.isToday && styles.dayNumTodayText,
                          isSelected && { color: '#ffffff', fontWeight: '800' },
                        ]}
                      >
                        {item.dayNumber}
                      </Text>
                    </View>

                    {/* Event Indicator Dots */}
                    <View style={{ flexDirection: 'row', gap: 2, marginTop: 2, height: 4, alignItems: 'center' }}>
                      {item.events.slice(0, 3).map((ev) => (
                        <View
                          key={ev._id}
                          style={{
                            width: 5,
                            height: 5,
                            borderRadius: 2.5,
                            backgroundColor: ev.color || ev.calendarId?.color || '#7e37d8',
                          }}
                        />
                      ))}
                      {item.events.length > 3 && (
                        <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#94a3b8' }} />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <MobileDayAgenda
            date={selectedDate}
            events={selectedDayEvents}
            onAdd={() => openEventModal(null, selectedDate)}
            onEventPress={openEventModal}
          />
        </ScrollView>
      );
    }

    return (
      <ScrollView
        style={styles.monthScrollView}
        contentContainerStyle={styles.monthScrollContent}
        showsVerticalScrollIndicator={true}
      >
        <View style={styles.monthContainer}>
          {/* Day Name Headers */}
          <View style={styles.weekHeaderRow}>
            {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((w) => (
              <Text key={w} style={styles.weekHeaderCell}>{w}</Text>
            ))}
          </View>

          {/* Days Grid */}
          <View style={styles.monthGrid}>
            {days.map((item) => {
              if (item.empty) {
                return <View key={item.key} style={styles.monthCellEmpty} />;
              }

              return (
                <TouchableOpacity
                  key={item.key}
                  style={[styles.monthCell, item.isToday && styles.monthCellToday]}
                  onPress={() => openEventModal(null, item.dateObj)}
                  activeOpacity={0.8}
                >
                  <View style={styles.monthCellHeader}>
                    <View style={[styles.dayNumWrap, item.isToday && styles.dayNumTodayWrap]}>
                      <Text style={[styles.dayNumText, item.isToday && styles.dayNumTodayText]}>
                        {item.dayNumber}
                      </Text>
                    </View>
                  </View>

                  {/* Event Chips */}
                  <ScrollView style={styles.eventChipScroll} showsVerticalScrollIndicator={false}>
                    {item.events.slice(0, 3).map((ev) => {
                      const calColor = ev.color || ev.calendarId?.color || '#7e37d8';
                      return (
                        <TouchableOpacity
                          key={ev._id}
                          style={[
                            styles.eventChip,
                            {
                              backgroundColor: `${calColor}18`,
                              borderLeftWidth: 3,
                              borderLeftColor: calColor,
                            },
                          ]}
                          onPress={(e) => {
                            e.stopPropagation();
                            openEventModal(ev);
                          }}
                        >
                          <Text style={[styles.eventChipText, { color: '#0f172a' }]} numberOfLines={1}>
                            {ev.title}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                    {item.events.length > 3 && (
                      <Text style={styles.moreEventsText}>+{item.events.length - 3} more</Text>
                    )}
                  </ScrollView>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
        <View style={{ height: 80 }} />
      </ScrollView>
    );
  };

  // 2. Week View
  const renderWeekView = () => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);

      const dayEvents = visibleEvents.filter((ev) => {
        const evDate = new Date(ev.startAt);
        return (
          evDate.getFullYear() === d.getFullYear() &&
          evDate.getMonth() === d.getMonth() &&
          evDate.getDate() === d.getDate()
        );
      });

      weekDays.push({ date: d, events: dayEvents });
    }

    return (
      <ScrollView horizontal style={styles.weekScrollContainer} showsHorizontalScrollIndicator={false}>
        <View style={styles.weekColsWrapper}>
          {weekDays.map(({ date, events: dayEvents }, idx) => {
            const isToday =
              new Date().toDateString() === date.toDateString();

            return (
              <View key={idx} style={styles.weekColumn}>
                <View style={[styles.weekColHeader, isToday && styles.weekColHeaderToday]}>
                  <Text style={[styles.weekDayName, isToday && styles.textWhite]}>
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()]}
                  </Text>
                  <Text style={[styles.weekDayNum, isToday && styles.textWhite]}>
                    {date.getDate()}
                  </Text>
                </View>

                <ScrollView style={styles.weekEventsList} showsVerticalScrollIndicator={false}>
                  {dayEvents.map((ev) => {
                    const calColor = ev.color || ev.calendarId?.color || '#7e37d8';
                    const startTime = new Date(ev.startAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <TouchableOpacity
                        key={ev._id}
                        style={[styles.weekEventCard, { borderLeftColor: calColor }]}
                        onPress={() => openEventModal(ev)}
                      >
                        <Text style={styles.weekEventTime}>{startTime}</Text>
                        <Text style={styles.weekEventTitle} numberOfLines={2}>
                          {ev.title}
                        </Text>
                        {ev.location ? (
                          <Text style={styles.weekEventLoc} numberOfLines={1}>
                            📍 {ev.location}
                          </Text>
                        ) : null}
                      </TouchableOpacity>
                    );
                  })}
                  {dayEvents.length === 0 && (
                    <TouchableOpacity
                      style={styles.emptyDaySlot}
                      onPress={() => openEventModal(null, date)}
                    >
                      <Text style={styles.emptyDaySlotText}>+ Add</Text>
                    </TouchableOpacity>
                  )}
                </ScrollView>
              </View>
            );
          })}
        </View>
      </ScrollView>
    );
  };

  // 3. Day View
  const renderDayView = () => {
    const dayEvents = visibleEvents.filter((ev) => {
      const evDate = new Date(ev.startAt);
      return evDate.toDateString() === currentDate.toDateString();
    });

    return (
      <View style={styles.dayViewContainer}>
        <View style={styles.dayHeaderBanner}>
          <Text style={styles.dayHeaderDate}>
            {currentDate.toLocaleDateString(undefined, {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </Text>
          <Text style={styles.dayHeaderCount}>{dayEvents.length} events scheduled</Text>
        </View>

        <FlatList
          data={dayEvents}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.dayEventsList}
          renderItem={({ item }) => {
            const calColor = item.color || item.calendarId?.color || '#7e37d8';
            const sTime = new Date(item.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const eTime = new Date(item.endAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            return (
              <TouchableOpacity
                style={[styles.dayEventCard, { borderLeftColor: calColor }]}
                onPress={() => openEventModal(item)}
              >
                <View style={styles.dayEventRowTop}>
                  <View style={styles.dayTimeBadge}>
                    <Ionicons name="time-outline" size={14} color="#64748b" />
                    <Text style={styles.dayTimeText}>{sTime} - {eTime}</Text>
                  </View>
                  <View style={[styles.calTag, { backgroundColor: `${calColor}20` }]}>
                    <Text style={[styles.calTagText, { color: calColor }]}>
                      {item.calendarId?.name || 'Calendar'}
                    </Text>
                  </View>
                </View>

                <Text style={styles.dayEventTitle}>{item.title}</Text>
                {item.description ? (
                  <Text style={styles.dayEventDesc}>{item.description}</Text>
                ) : null}

                <View style={styles.dayEventFooter}>
                  {item.location ? (
                    <Text style={styles.dayEventLoc}>📍 {item.location}</Text>
                  ) : <View />}

                  <View style={styles.priorityPill}>
                    <Text style={styles.priorityText}>{item.priority?.toUpperCase()}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyViewWrap}>
              <Ionicons name="calendar-outline" size={48} color="#cbd5e1" />
              <Text style={styles.emptyViewText}>No events scheduled for today</Text>
              <TouchableOpacity
                style={styles.emptyAddBtn}
                onPress={() => openEventModal(null, currentDate)}
              >
                <Text style={styles.emptyAddBtnText}>+ Create Event</Text>
              </TouchableOpacity>
            </View>
          }
        />
      </View>
    );
  };

  // 4. Agenda View
  const renderAgendaView = () => {
    // Sort all visible events chronologically
    const sorted = [...visibleEvents].sort(
      (a, b) => new Date(a.startAt) - new Date(b.startAt)
    );

    return (
      <FlatList
        data={sorted}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.agendaList}
        renderItem={({ item }) => {
          const calColor = item.color || item.calendarId?.color || '#7e37d8';
          const s = new Date(item.startAt);
          const dateStr = s.toLocaleDateString(undefined, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          });
          const timeStr = item.isAllDay
            ? 'All Day'
            : s.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

          return (
            <TouchableOpacity
              style={styles.agendaCard}
              onPress={() => openEventModal(item)}
              activeOpacity={0.8}
            >
              <View style={[styles.agendaDateBox, { backgroundColor: `${calColor}15` }]}>
                <Text style={[styles.agendaDateText, { color: calColor }]}>{s.getDate()}</Text>
                <Text style={[styles.agendaMonthText, { color: calColor }]}>
                  {s.toLocaleDateString(undefined, { month: 'short' })}
                </Text>
              </View>

              <View style={styles.agendaInfoCol}>
                <View style={styles.agendaHeaderRow}>
                  <Text style={styles.agendaTitle} numberOfLines={1}>{item.title}</Text>
                  <View style={[styles.calDot, { backgroundColor: calColor }]} />
                </View>
                <Text style={styles.agendaTime}>{dateStr} • {timeStr}</Text>
                {item.location ? (
                  <Text style={styles.agendaLoc} numberOfLines={1}>📍 {item.location}</Text>
                ) : null}
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyViewWrap}>
            <Ionicons name="list-outline" size={48} color="#cbd5e1" />
            <Text style={styles.emptyViewText}>No events match your calendars or search</Text>
          </View>
        }
      />
    );
  };


  if (viewMode === 'month') return renderMonthView();
  if (viewMode === 'week') return renderWeekView();
  if (viewMode === 'day') return renderDayView();
  return renderAgendaView();
}
