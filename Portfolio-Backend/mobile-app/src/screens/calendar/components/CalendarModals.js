import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Modal, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../../api/client';
import styles from '../styles/calendarStyles';
import { COLOR_PALETTE } from '../constants/calendarOptions';
import { REMINDER_OPTIONS } from '../constants/calendarOptions';
import GenericDateTimePicker from '../../../components/common/GenericDateTimePicker';

export default function CalendarModals(props) {
  const {
    eventModalVisible, setEventModalVisible, editingEvent, eventTitle, setEventTitle,
    eventDescription, setEventDescription, selectedCalendarId, setSelectedCalendarId,
    calendars, eventDateStr, setEventDateStr, isAllDay, setIsAllDay,
    eventStartTimeStr, setEventStartTimeStr, eventEndTimeStr, setEventEndTimeStr,
    eventLocation, setEventLocation, eventPriority, setEventPriority,
    eventRecurrence, setEventRecurrence, eventReminders, setEventReminders, savingEvent,
    handleSaveEvent, handleDeleteEvent, calendarDrawerVisible, setCalendarDrawerVisible,
    openCalendarModal, calendarVisibility, toggleCalendarVisibility,
    handleDeleteCalendar, handleClearAllEvents, calendarModalVisible,
    setCalendarModalVisible, editingCalendar, calName, setCalName, calDesc, setCalDesc,
    calColor, setCalColor, calIsDefault, setCalIsDefault, savingCalendar,
    handleSaveCalendar, remindersModalVisible, setRemindersModalVisible,
    hasNotifPermission, handleRequestNotifPermission, upcomingReminders, loadReminders,
  } = props;
  return (
    <>
      {/* ========================================================= */}
      {/* MODAL 1: EVENT CREATE & EDIT MODAL                        */}
      {/* ========================================================= */}
      <Modal visible={eventModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.eventModalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeading}>
                {editingEvent ? 'Edit Event' : 'Create New Event'}
              </Text>
              <TouchableOpacity onPress={() => setEventModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBodyScroll} showsVerticalScrollIndicator={false}>
              {/* Title */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Event Title *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Daily Standup, Fitness Routine"
                  value={eventTitle}
                  onChangeText={setEventTitle}
                />
              </View>

              {/* Calendar Selector */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Choose Calendar</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.calSelectorRow}>
                  {calendars.map((cal) => (
                    <TouchableOpacity
                      key={cal._id}
                      style={[
                        styles.calSelectorPill,
                        selectedCalendarId === cal._id && {
                          borderColor: cal.color,
                          backgroundColor: `${cal.color}20`,
                        },
                      ]}
                      onPress={() => setSelectedCalendarId(cal._id)}
                    >
                      <View style={[styles.calDotSmall, { backgroundColor: cal.color }]} />
                      <Text
                        style={[
                          styles.calSelectorText,
                          selectedCalendarId === cal._id && { color: cal.color, fontWeight: '700' },
                        ]}
                      >
                        {cal.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Date & All Day */}
              {/* Generic Intuitive Date & Time Picker */}
              <View style={styles.inputGroup}>
                <View style={styles.flexRowSb}>
                  <Text style={styles.inputLabel}>Event Schedule</Text>
                  <TouchableOpacity
                    style={styles.allDayToggle}
                    onPress={() => setIsAllDay(!isAllDay)}
                  >
                    <Ionicons
                      name={isAllDay ? 'checkbox' : 'square-outline'}
                      size={18}
                      color="#7e37d8"
                    />
                    <Text style={styles.allDayText}>All-Day Event</Text>
                  </TouchableOpacity>
                </View>

                <GenericDateTimePicker
                  dateStr={eventDateStr}
                  onChangeDate={setEventDateStr}
                  startTimeStr={eventStartTimeStr}
                  onChangeStartTime={setEventStartTimeStr}
                  endTimeStr={eventEndTimeStr}
                  onChangeEndTime={setEventEndTimeStr}
                  isAllDay={isAllDay}
                />
              </View>

              {/* Smart Reminders Picker */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Smart Reminders</Text>
                <View style={styles.remindersGrid}>
                  {REMINDER_OPTIONS.map((opt) => {
                    const isSelected = eventReminders.includes(opt.minutes);
                    return (
                      <TouchableOpacity
                        key={opt.minutes}
                        style={[
                          styles.reminderChip,
                          isSelected && styles.reminderChipActive,
                        ]}
                        onPress={() => {
                          if (isSelected) {
                            setEventReminders(eventReminders.filter((m) => m !== opt.minutes));
                          } else {
                            setEventReminders([...eventReminders, opt.minutes]);
                          }
                        }}
                      >
                        <Ionicons
                          name={isSelected ? 'notifications' : 'notifications-outline'}
                          size={14}
                          color={isSelected ? '#ffffff' : '#475569'}
                        />
                        <Text
                          style={[
                            styles.reminderChipText,
                            isSelected && styles.reminderChipTextActive,
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Recurrence Rule */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Recurrence</Text>
                <View style={styles.recurrenceRow}>
                  {['none', 'daily', 'weekly', 'monthly'].map((freq) => (
                    <TouchableOpacity
                      key={freq}
                      style={[
                        styles.recurrencePill,
                        eventRecurrence === freq && styles.recurrencePillActive,
                      ]}
                      onPress={() => setEventRecurrence(freq)}
                    >
                      <Text
                        style={[
                          styles.recurrencePillText,
                          eventRecurrence === freq && styles.recurrencePillTextActive,
                        ]}
                      >
                        {freq.charAt(0).toUpperCase() + freq.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Location & Priority */}
              <View style={styles.timeRow}>
                <View style={[styles.inputGroup, { flex: 2, marginRight: 8 }]}>
                  <Text style={styles.inputLabel}>Location (Optional)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. Conference Room A, Meet"
                    value={eventLocation}
                    onChangeText={setEventLocation}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.inputLabel}>Priority</Text>
                  <View style={styles.prioritySelector}>
                    {['low', 'medium', 'high'].map((p) => (
                      <TouchableOpacity
                        key={p}
                        style={[
                          styles.priorityOption,
                          eventPriority === p && styles.priorityOptionActive,
                        ]}
                        onPress={() => setEventPriority(p)}
                      >
                        <Text
                          style={[
                            styles.priorityOptionText,
                            eventPriority === p && styles.priorityOptionTextActive,
                          ]}
                        >
                          {p.charAt(0).toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              {/* Description */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description / Notes</Text>
                <TextInput
                  style={[styles.textInput, { height: 70, textAlignVertical: 'top' }]}
                  placeholder="Additional agenda details, objectives, or tasks..."
                  multiline
                  value={eventDescription}
                  onChangeText={setEventDescription}
                />
              </View>
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.modalFooter}>
              {editingEvent && (
                <TouchableOpacity
                  style={styles.deleteEventBtn}
                  onPress={() => handleDeleteEvent(editingEvent._id, editingEvent.title)}
                >
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.saveEventBtn}
                onPress={handleSaveEvent}
                disabled={savingEvent}
              >
                <Text style={styles.saveEventBtnText}>
                  {savingEvent ? 'Saving...' : editingEvent ? 'Update Event' : 'Schedule Event'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ========================================================= */}
      {/* MODAL 2: CALENDAR DRAWER & MANAGEMENT                     */}
      {/* ========================================================= */}
      <Modal visible={calendarDrawerVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.drawerCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeading}>Manage Calendars</Text>
              <TouchableOpacity onPress={() => setCalendarDrawerVisible(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.addNewCalBtn}
              onPress={() => {
                setCalendarDrawerVisible(false);
                openCalendarModal();
              }}
            >
              <Ionicons name="add" size={18} color="#7e37d8" />
              <Text style={styles.addNewCalBtnText}>+ Add New Calendar</Text>
            </TouchableOpacity>

            <ScrollView style={styles.calListScroll}>
              {calendars.map((cal) => {
                const isVis = calendarVisibility[cal._id] !== false;
                return (
                  <View key={cal._id} style={styles.calListItem}>
                    <TouchableOpacity
                      style={styles.calVisibilityBtn}
                      onPress={() => toggleCalendarVisibility(cal._id)}
                    >
                      <Ionicons
                        name={isVis ? 'checkbox' : 'square-outline'}
                        size={22}
                        color={cal.color}
                      />
                      <View style={[styles.calDotSmall, { backgroundColor: cal.color, marginLeft: 8 }]} />
                      <View style={{ marginLeft: 8, flex: 1 }}>
                        <Text style={styles.calListName}>{cal.name}</Text>
                        {cal.description ? (
                          <Text style={styles.calListDesc} numberOfLines={1}>
                            {cal.description}
                          </Text>
                        ) : null}
                      </View>
                    </TouchableOpacity>

                    <View style={styles.calRowActions}>
                      <TouchableOpacity
                        onPress={() => {
                          setCalendarDrawerVisible(false);
                          openCalendarModal(cal);
                        }}
                        style={styles.editCalIcon}
                      >
                        <Ionicons name="create-outline" size={18} color="#64748b" />
                      </TouchableOpacity>
                      {!cal.isDefault && (
                        <TouchableOpacity
                          onPress={() => handleDeleteCalendar(cal._id, cal.name)}
                          style={styles.deleteCalIcon}
                        >
                          <Ionicons name="trash-outline" size={18} color="#ef4444" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={styles.clearAllEventsDrawerBtn}
              onPress={() => {
                setCalendarDrawerVisible(false);
                handleClearAllEvents();
              }}
            >
              <Ionicons name="trash-outline" size={15} color="#ef4444" />
              <Text style={styles.clearAllEventsDrawerBtnText}>Clear All Scheduled Events</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ========================================================= */}
      {/* MODAL 3: CALENDAR CREATE / EDIT MODAL                     */}
      {/* ========================================================= */}
      <Modal visible={calendarModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.calModalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeading}>
                {editingCalendar ? 'Edit Calendar' : 'Create New Calendar'}
              </Text>
              <TouchableOpacity onPress={() => setCalendarModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Calendar Name *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Fitness, Exam Prep, Work, Personal"
                value={calName}
                onChangeText={setCalName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Description of activities..."
                value={calDesc}
                onChangeText={setCalDesc}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Color Theme</Text>
              <View style={styles.colorPaletteRow}>
                {COLOR_PALETTE.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorSwatch,
                      { backgroundColor: color },
                      calColor === color && styles.colorSwatchActive,
                    ]}
                    onPress={() => setCalColor(color)}
                  />
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={styles.saveEventBtn}
              onPress={handleSaveCalendar}
              disabled={savingCalendar}
            >
              <Text style={styles.saveEventBtnText}>
                {savingCalendar ? 'Saving...' : editingCalendar ? 'Update Calendar' : 'Create Calendar'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ========================================================= */}
      {/* MODAL 4: SMART REMINDERS & NOTIFICATION CENTER            */}
      {/* ========================================================= */}
      <Modal visible={remindersModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.remindersModalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalHeading}>🔔 Smart Reminders</Text>
                <Text style={styles.modalSubheading}>Scheduled Event Alerts</Text>
              </View>
              <TouchableOpacity onPress={() => setRemindersModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Permission Banner */}
            <View style={styles.permBanner}>
              <Ionicons
                name={hasNotifPermission ? 'checkmark-circle' : 'alert-circle'}
                size={20}
                color={hasNotifPermission ? '#10b981' : '#f59e0b'}
              />
              <Text style={styles.permBannerText}>
                {hasNotifPermission
                  ? 'Browser / Native Notifications Active'
                  : 'Notifications disabled. Tap to enable.'}
              </Text>
              {!hasNotifPermission && (
                <TouchableOpacity
                  style={styles.permBtn}
                  onPress={handleRequestNotifPermission}
                >
                  <Text style={styles.permBtnText}>Enable</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Upcoming Reminders List */}
            <ScrollView style={styles.remindersListScroll}>
              {upcomingReminders.length === 0 ? (
                <View style={styles.emptyRemindersWrap}>
                  <Ionicons name="notifications-off-outline" size={40} color="#cbd5e1" />
                  <Text style={styles.emptyRemindersText}>No pending alerts for the next 24 hours</Text>
                </View>
              ) : (
                upcomingReminders.map((log) => {
                  const schedTime = new Date(log.scheduledFor).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <View key={log._id} style={styles.reminderItem}>
                      <View style={styles.reminderDot} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.reminderItemTitle}>{log.title}</Text>
                        <Text style={styles.reminderItemBody}>{log.body}</Text>
                        <Text style={styles.reminderItemTime}>Scheduled for: {schedTime}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.dismissBtn}
                        onPress={async () => {
                          await api.dismissReminder(log._id);
                          loadReminders();
                        }}
                      >
                        <Ionicons name="checkmark" size={18} color="#10b981" />
                      </TouchableOpacity>
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}
