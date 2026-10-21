import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Alert,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { notificationService } from '../../services/notificationService';
import CalendarToolbar from './components/CalendarToolbar';
import CalendarSwitcher from './components/CalendarSwitcher';
import CalendarViewControls from './components/CalendarViewControls';
import CalendarViews from './components/CalendarViews';
import CalendarModals from './components/CalendarModals';
import AiRoutinePlannerModal from './components/AiRoutinePlannerModal';
import styles from './styles/calendarStyles';
import aiRoutineStyles from './styles/aiRoutineStyles';

const formatLocalDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function CalendarScreen({ onNavigate }) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  // Current view date & selected day for mobile agenda
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('month'); // 'month', 'week', 'day', 'agenda'

  // Data states
  const [calendars, setCalendars] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCalendarFilter, setActiveCalendarFilter] = useState('all'); // 'all' = Universal

  // Visibility map for calendars { [calendarId]: boolean }
  const [calendarVisibility, setCalendarVisibility] = useState({});

  // Modals
  const [eventModalVisible, setEventModalVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [calendarModalVisible, setCalendarModalVisible] = useState(false);
  const [editingCalendar, setEditingCalendar] = useState(null);
  const [remindersModalVisible, setRemindersModalVisible] = useState(false);
  const [upcomingReminders, setUpcomingReminders] = useState([]);
  const [calendarDrawerVisible, setCalendarDrawerVisible] = useState(false);
  const [aiPlanModalVisible, setAiPlanModalVisible] = useState(false);

  // Event Form state
  const [eventTitle, setEventTitle] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [selectedCalendarId, setSelectedCalendarId] = useState('');
  const [eventDateStr, setEventDateStr] = useState(''); // YYYY-MM-DD
  const [eventStartTimeStr, setEventStartTimeStr] = useState('10:00'); // HH:mm
  const [eventEndTimeStr, setEventEndTimeStr] = useState('11:00'); // HH:mm
  const [isAllDay, setIsAllDay] = useState(false);
  const [eventLocation, setEventLocation] = useState('');
  const [eventPriority, setEventPriority] = useState('medium');
  const [eventRecurrence, setEventRecurrence] = useState('none');
  const [eventReminders, setEventReminders] = useState([15]); // array of offsetMinutes
  const [savingEvent, setSavingEvent] = useState(false);

  // Calendar Form state
  const [calName, setCalName] = useState('');
  const [calDesc, setCalDesc] = useState('');
  const [calColor, setCalColor] = useState('#7e37d8');
  const [calIsDefault, setCalIsDefault] = useState(false);
  const [savingCalendar, setSavingCalendar] = useState(false);

  // Notification state
  const [hasNotifPermission, setHasNotifPermission] = useState(false);

  // Initial load
  useEffect(() => {
    loadData();
    notificationService.startReminderWatcher();
    notificationService.requestPermission().then((granted) => {
      setHasNotifPermission(granted);
    });

    const unsubscribe = notificationService.addListener((rem) => {
      // In-app alert notification
      Alert.alert(
        `🔔 ${rem.title}`,
        rem.body,
        [{ text: 'Dismiss' }, { text: 'View Calendar', onPress: () => loadEvents() }]
      );
    });

    return () => {
      unsubscribe();
      notificationService.stopReminderWatcher();
    };
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [calsRes, eventsRes] = await Promise.all([
        api.getCalendars(),
        api.getEvents(),
      ]);

      setCalendars(Array.isArray(calsRes) ? calsRes : []);
      setEvents(Array.isArray(eventsRes) ? eventsRes : []);

      // Initialize visibility
      const visMap = {};
      (calsRes || []).forEach((c) => {
        visMap[c._id] = c.isVisible !== false;
      });
      setCalendarVisibility(visMap);

      if (calsRes && calsRes.length > 0 && !selectedCalendarId) {
        setSelectedCalendarId(calsRes[0]._id);
      }
    } catch (e) {
      console.log('Error loading calendar data:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadEvents = async () => {
    try {
      const data = await api.getEvents();
      setEvents(Array.isArray(data) ? data : []);
    } catch (e) {}
  };

  const loadReminders = async () => {
    try {
      const logs = await api.getUpcomingReminders();
      setUpcomingReminders(Array.isArray(logs) ? logs : []);
    } catch (e) {}
  };

  // Toggle calendar show/hide
  const toggleCalendarVisibility = (id) => {
    setCalendarVisibility((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Date Navigation Helpers
  const goToToday = () => setCurrentDate(new Date());

  const changeDate = (direction) => {
    const next = new Date(currentDate);
    if (viewMode === 'month') {
      next.setMonth(next.getMonth() + direction);
    } else if (viewMode === 'week') {
      next.setDate(next.getDate() + direction * 7);
    } else {
      next.setDate(next.getDate() + direction);
    }
    setCurrentDate(next);
  };

  // Format month and year label
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const headerDateLabel = `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;

  // Open Event Modal
  const openEventModal = (event = null, prefillDate = null) => {
    setEditingEvent(event);
    if (event) {
      setEventTitle(event.title || '');
      setEventDescription(event.description || '');
      setSelectedCalendarId(
        event.calendarId?._id || event.calendarId || calendars[0]?._id || ''
      );

      const s = new Date(event.startAt);
      const e = new Date(event.endAt);
      setEventDateStr(formatLocalDate(s));
      setEventStartTimeStr(
        `${String(s.getHours()).padStart(2, '0')}:${String(s.getMinutes()).padStart(2, '0')}`
      );
      setEventEndTimeStr(
        `${String(e.getHours()).padStart(2, '0')}:${String(e.getMinutes()).padStart(2, '0')}`
      );
      setIsAllDay(!!event.isAllDay);
      setEventLocation(event.location || '');
      setEventPriority(event.priority || 'medium');
      setEventRecurrence(event.recurrenceRule?.frequency || 'none');
      setEventReminders(
        event.reminders && event.reminders.length > 0
          ? event.reminders.map((r) => r.offsetMinutes)
          : [15]
      );
    } else {
      setEventTitle('');
      setEventDescription('');
      const baseDate = prefillDate || currentDate;
      setEventDateStr(formatLocalDate(baseDate));
      setEventStartTimeStr('10:00');
      setEventEndTimeStr('11:00');
      setIsAllDay(false);
      setEventLocation('');
      setEventPriority('medium');
      setEventRecurrence('none');
      setEventReminders([15]);
      if (activeCalendarFilter !== 'all') {
        setSelectedCalendarId(activeCalendarFilter);
      } else if (calendars.length > 0) {
        setSelectedCalendarId(calendars[0]._id);
      }
    }
    setEventModalVisible(true);
  };

  // Save Event
  const handleSaveEvent = async () => {
    if (!eventTitle.trim()) {
      Alert.alert('Required', 'Please enter an event title');
      return;
    }
    if (!eventDateStr) {
      Alert.alert('Required', 'Please enter a valid date');
      return;
    }

    setSavingEvent(true);
    try {
      let year, month, day;
      const rawDate = eventDateStr.trim().replace(/\//g, '-');
      const parts = rawDate.split('-');
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          year = Number(parts[0]);
          month = Number(parts[1]);
          day = Number(parts[2]);
        } else if (parts[2].length === 4) {
          day = Number(parts[0]);
          month = Number(parts[1]);
          year = Number(parts[2]);
        }
      }
      if (!year || !month || !day || isNaN(year) || isNaN(month) || isNaN(day)) {
        const d = new Date(eventDateStr);
        if (isNaN(d.getTime())) {
          Alert.alert('Invalid Date', 'Please enter date in YYYY-MM-DD format (e.g. 2026-10-15)');
          setSavingEvent(false);
          return;
        }
        year = d.getFullYear();
        month = d.getMonth() + 1;
        day = d.getDate();
      }

      const [startH, startM] = (eventStartTimeStr || '10:00').split(':').map(Number);
      const [endH, endM] = (eventEndTimeStr || '11:00').split(':').map(Number);

      const startAt = new Date(year, month - 1, day, isAllDay ? 0 : (isNaN(startH) ? 10 : startH), isAllDay ? 0 : (isNaN(startM) ? 0 : startM));
      const endAt = new Date(year, month - 1, day, isAllDay ? 23 : (isNaN(endH) ? 11 : endH), isAllDay ? 59 : (isNaN(endM) ? 0 : endM));

      if (isNaN(startAt.getTime()) || isNaN(endAt.getTime())) {
        Alert.alert('Invalid Time', 'Please check the event date and time');
        setSavingEvent(false);
        return;
      }

      const payload = {
        title: eventTitle.trim(),
        description: eventDescription.trim(),
        calendarId: selectedCalendarId || calendars[0]?._id,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        isAllDay,
        location: eventLocation.trim(),
        priority: eventPriority,
        recurrenceRule: { frequency: eventRecurrence },
        reminders: eventReminders.map((offsetMinutes) => ({
          offsetMinutes,
          isEnabled: true,
          reminderType: 'notification',
        })),
      };

      let savedEvent = null;
      if (editingEvent?._id) {
        savedEvent = await api.updateEvent(editingEvent._id, payload);
        Alert.alert('Success', 'Event updated successfully!');
      } else {
        savedEvent = await api.createEvent(payload);
        Alert.alert('Success', 'Event scheduled successfully!');
      }

      // Schedule native local notifications for Expo mobile / Web
      if (savedEvent && Array.isArray(eventReminders)) {
        for (const offsetMinutes of eventReminders) {
          const alertTime = new Date(startAt.getTime() - offsetMinutes * 60 * 1000);
          if (alertTime.getTime() > Date.now()) {
            const timeStr = isAllDay ? 'All Day' : eventStartTimeStr;
            const notifTitle = `⏰ Reminder: ${payload.title}`;
            const notifBody = offsetMinutes === 0
              ? `Starting now (${timeStr})`
              : `Starts in ${offsetMinutes} minutes at ${timeStr}`;
            try {
              await notificationService.scheduleLocalReminder(
                notifTitle,
                notifBody,
                alertTime,
                savedEvent
              );
            } catch (err) {
              console.log('Mobile local notification notice:', err);
            }
          }
        }
      }

      setEventModalVisible(false);
      loadEvents();
      notificationService.checkDueReminders();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to save event');
    } finally {
      setSavingEvent(false);
    }
  };

  // Delete Event
  const handleDeleteEvent = (id, title) => {
    Alert.alert(
      'Delete Event',
      `Delete "${title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteEvent(id);
              setEventModalVisible(false);
              loadEvents();
            } catch (e) {
              Alert.alert('Error', 'Failed to delete event');
            }
          },
        },
      ]
    );
  };

  // Clear all events
  const handleClearAllEvents = () => {
    Alert.alert(
      'Clear All Events',
      'Are you sure you want to delete all scheduled events across your calendars?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.clearAllEvents();
              loadEvents();
              Alert.alert('Cleared', 'All calendar events have been removed.');
            } catch (e) {
              Alert.alert('Error', 'Failed to clear events');
            }
          },
        },
      ]
    );
  };

  // Open Calendar Create/Edit Modal
  const openCalendarModal = (cal = null) => {
    setEditingCalendar(cal);
    if (cal) {
      setCalName(cal.name || '');
      setCalDesc(cal.description || '');
      setCalColor(cal.color || '#7e37d8');
      setCalIsDefault(!!cal.isDefault);
    } else {
      setCalName('');
      setCalDesc('');
      setCalColor('#7e37d8');
      setCalIsDefault(false);
    }
    setCalendarModalVisible(true);
  };

  // Save Calendar
  const handleSaveCalendar = async () => {
    if (!calName.trim()) {
      Alert.alert('Required', 'Please enter calendar name');
      return;
    }

    setSavingCalendar(true);
    try {
      const payload = {
        name: calName.trim(),
        description: calDesc.trim(),
        color: calColor,
        isDefault: calIsDefault,
      };

      if (editingCalendar?._id) {
        await api.updateCalendar(editingCalendar._id, payload);
      } else {
        await api.createCalendar(payload);
      }

      setCalendarModalVisible(false);
      loadData();
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to save calendar');
    } finally {
      setSavingCalendar(false);
    }
  };

  // Delete Calendar
  const handleDeleteCalendar = (id, name) => {
    Alert.alert(
      'Delete Calendar',
      `Delete calendar "${name}" and all of its events? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteCalendar(id);
              setCalendarModalVisible(false);
              loadData();
            } catch (e) {
              Alert.alert('Error', 'Failed to delete calendar');
            }
          },
        },
      ]
    );
  };

  // Request Notification Permissions
  const handleRequestNotifPermission = async () => {
    const granted = await notificationService.requestPermission();
    setHasNotifPermission(granted);
    if (granted) {
      Alert.alert('Notifications Enabled', 'You will receive reminders before your events!');
    } else {
      Alert.alert(
        'Permission Denied',
        'Please enable notifications in your browser or device settings to receive reminder popups.'
      );
    }
  };

  // Filter events by active calendar filter, visibility, and search query
  const visibleEvents = events.filter((ev) => {
    const calId = ev.calendarId?._id || ev.calendarId;
    if (activeCalendarFilter !== 'all' && calId !== activeCalendarFilter) {
      return false;
    }
    const isVisible = calendarVisibility[calId] !== false;
    const matchesSearch =
      searchQuery.trim() === '' ||
      ev.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.location?.toLowerCase().includes(searchQuery.toLowerCase());

    return isVisible && matchesSearch;
  });

  const calendarHeader = (
    <View>
      <CalendarToolbar
        dateLabel={headerDateLabel}
        onPrevious={() => changeDate(-1)}
        onToday={goToToday}
        onNext={() => changeDate(1)}
        calendarCount={calendars.length}
        onCalendars={() => setCalendarDrawerVisible(true)}
        onReminders={() => { loadReminders(); setRemindersModalVisible(true); }}
        onCreateEvent={() => openEventModal()}
        onAiPlan={() => setAiPlanModalVisible(true)}
      />

      <CalendarSwitcher
        calendars={calendars}
        events={events}
        activeId={activeCalendarFilter}
        onSelect={setActiveCalendarFilter}
        onAdd={() => openCalendarModal()}
      />

      {/* Quick Access Banner to Workout & Diet Tracker */}
      <View style={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 6, backgroundColor: '#ffffff' }}>
        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#ecfdf5',
            borderWidth: 1,
            borderColor: '#a7f3d0',
            borderRadius: 8,
            paddingHorizontal: 10,
            paddingVertical: 7,
          }}
          onPress={() => onNavigate && onNavigate('WorkoutDiet')}
          activeOpacity={0.7}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
            <Ionicons name="fitness" size={15} color="#059669" />
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#047857' }}>
              Workout & Diet Tracker
            </Text>
            <Text style={{ fontSize: 10, color: '#065f46' }}>
              • Daily Meals & Grok Macros
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: '#059669' }}>Open</Text>
            <Ionicons name="chevron-forward" size={12} color="#059669" />
          </View>
        </TouchableOpacity>
      </View>

      <CalendarViewControls
        mode={viewMode}
        onModeChange={setViewMode}
        search={searchQuery}
        onSearchChange={setSearchQuery}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.viewContainer}>
        {loading ? (
          <View style={{ flex: 1 }}>
            {calendarHeader}
            <View style={styles.loadingCenter}>
              <ActivityIndicator size="large" color="#7e37d8" />
              <Text style={styles.loadingText}>Syncing calendar & reminders...</Text>
            </View>
          </View>
        ) : (
          <CalendarViews
            isMobile={isMobile}
            currentDate={currentDate}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            visibleEvents={visibleEvents}
            openEventModal={openEventModal}
            viewMode={viewMode}
            headerComponent={calendarHeader}
          />
        )}
      </View>
      <CalendarModals
        eventModalVisible={eventModalVisible}
        setEventModalVisible={setEventModalVisible}
        editingEvent={editingEvent}
        eventTitle={eventTitle}
        setEventTitle={setEventTitle}
        eventDescription={eventDescription}
        setEventDescription={setEventDescription}
        selectedCalendarId={selectedCalendarId}
        setSelectedCalendarId={setSelectedCalendarId}
        calendars={calendars}
        eventDateStr={eventDateStr}
        setEventDateStr={setEventDateStr}
        isAllDay={isAllDay}
        setIsAllDay={setIsAllDay}
        eventStartTimeStr={eventStartTimeStr}
        setEventStartTimeStr={setEventStartTimeStr}
        eventEndTimeStr={eventEndTimeStr}
        setEventEndTimeStr={setEventEndTimeStr}
        eventLocation={eventLocation}
        setEventLocation={setEventLocation}
        eventPriority={eventPriority}
        setEventPriority={setEventPriority}
        eventRecurrence={eventRecurrence}
        setEventRecurrence={setEventRecurrence}
        eventReminders={eventReminders}
        setEventReminders={setEventReminders}
        savingEvent={savingEvent}
        handleSaveEvent={handleSaveEvent}
        handleDeleteEvent={handleDeleteEvent}
        calendarDrawerVisible={calendarDrawerVisible}
        setCalendarDrawerVisible={setCalendarDrawerVisible}
        openCalendarModal={openCalendarModal}
        calendarVisibility={calendarVisibility}
        toggleCalendarVisibility={toggleCalendarVisibility}
        handleDeleteCalendar={handleDeleteCalendar}
        handleClearAllEvents={handleClearAllEvents}
        calendarModalVisible={calendarModalVisible}
        setCalendarModalVisible={setCalendarModalVisible}
        editingCalendar={editingCalendar}
        calName={calName}
        setCalName={setCalName}
        calDesc={calDesc}
        setCalDesc={setCalDesc}
        calColor={calColor}
        setCalColor={setCalColor}
        calIsDefault={calIsDefault}
        setCalIsDefault={setCalIsDefault}
        savingCalendar={savingCalendar}
        handleSaveCalendar={handleSaveCalendar}
        remindersModalVisible={remindersModalVisible}
        setRemindersModalVisible={setRemindersModalVisible}
        hasNotifPermission={hasNotifPermission}
        handleRequestNotifPermission={handleRequestNotifPermission}
        upcomingReminders={upcomingReminders}
        loadReminders={loadReminders}
      />

      {/* Floating Action Button (FAB) for AI Routine Generator */}
      <TouchableOpacity
        style={aiRoutineStyles.aiPlanFab}
        onPress={() => setAiPlanModalVisible(true)}
        activeOpacity={0.85}
      >
        <Ionicons name="sparkles" size={17} color="#ffffff" />
        <Text style={aiRoutineStyles.aiPlanFabText}>AI Routine</Text>
      </TouchableOpacity>

      {/* AI Routine Planner Modal */}
      <AiRoutinePlannerModal
        visible={aiPlanModalVisible}
        onClose={() => setAiPlanModalVisible(false)}
        calendars={calendars}
        selectedDate={selectedDate}
        onRoutineCreated={() => {
          loadEvents();
          loadReminders();
        }}
      />
    </View>
  );
}
