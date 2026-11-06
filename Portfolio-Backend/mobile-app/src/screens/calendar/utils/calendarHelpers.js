/**
 * Calendar Helpers & Matching Utilities
 * 
 * Provides robust identification, cross-referencing between local SQLite and remote
 * MongoDB IDs, event filtering, and calendar styling helpers.
 */

/**
 * Safely resolves the primary identifier of a calendar.
 * Prefers _id (server ObjectId), fallback to client_id or id.
 */
export const getCalendarId = (calendar) => {
  if (!calendar) return '';
  return calendar._id || calendar.id || calendar.client_id || calendar.clientId || calendar.server_id || '';
};

/**
 * Returns the calendar display name.
 */
export const getCalendarName = (calendar) => {
  return calendar?.name || 'Calendar';
};

/**
 * Returns the calendar color with a fallback.
 */
export const getCalendarColor = (calendar, fallback = '#7e37d8') => {
  return calendar?.color || fallback;
};

/**
 * Finds the calendar matching a given event within the calendars list.
 * Inspects all possible identifier bridges (server_id, client_id, populated calendarId object, etc.)
 */
export const resolveEventCalendar = (event, calendars = []) => {
  if (!event) return null;

  // Case 1: Populated calendar object on event
  if (event.calendarId && typeof event.calendarId === 'object' && event.calendarId.name) {
    // If it has full object details, try matching to calendars list to get latest state, or return it directly
    const found = calendars.find(
      (c) =>
        c._id === event.calendarId._id ||
        c.client_id === event.calendarId._id ||
        c.name?.toLowerCase() === event.calendarId.name?.toLowerCase()
    );
    return found || event.calendarId;
  }

  // Case 2: String reference (ObjectId, UUID, etc.)
  const eventCalRef = event.calendarId || event.calendar_server_id || event.calendarServerId || event.calendar_client_id || event.calendarClientId;
  if (!eventCalRef) {
    // If no calendar assigned, return default calendar if present
    return calendars.find((c) => c.isDefault || c.is_default) || calendars[0] || null;
  }

  return (
    calendars.find(
      (c) =>
        c._id === eventCalRef ||
        c.id === eventCalRef ||
        c.client_id === eventCalRef ||
        c.clientId === eventCalRef ||
        c.server_id === eventCalRef ||
        c.serverId === eventCalRef
    ) || null
  );
};

/**
 * Determines whether an event belongs to a target calendar filter.
 * 
 * Supports:
 * - 'all' or empty: true
 * - Target calendar matched by _id, client_id, server_id, or name
 * - Event matched by calendarId, calendarServerId, calendarClientId, or populated name
 */
export const isEventInCalendar = (event, activeFilter, calendars = []) => {
  if (!event) return false;
  if (!activeFilter || activeFilter === 'all') return true;

  // Find the target calendar in the calendars array
  const targetCal = calendars.find(
    (c) =>
      c._id === activeFilter ||
      c.id === activeFilter ||
      c.client_id === activeFilter ||
      c.clientId === activeFilter ||
      c.server_id === activeFilter ||
      c.serverId === activeFilter ||
      c.name?.toLowerCase() === String(activeFilter).toLowerCase()
  );

  // Build a set of all valid aliases for this target calendar
  const validIds = new Set();
  validIds.add(String(activeFilter).trim());

  if (targetCal) {
    if (targetCal._id) validIds.add(String(targetCal._id).trim());
    if (targetCal.id) validIds.add(String(targetCal.id).trim());
    if (targetCal.client_id) validIds.add(String(targetCal.client_id).trim());
    if (targetCal.clientId) validIds.add(String(targetCal.clientId).trim());
    if (targetCal.server_id) validIds.add(String(targetCal.server_id).trim());
    if (targetCal.serverId) validIds.add(String(targetCal.serverId).trim());
  }

  // 1. Check direct event properties
  const eventCalRef = event.calendarId?._id || event.calendarId?.id || event.calendarId;
  const eventServerId = event.calendarServerId || event.calendar_server_id;
  const eventClientId = event.calendarClientId || event.calendar_client_id;

  if (eventCalRef && validIds.has(String(eventCalRef).trim())) return true;
  if (eventServerId && validIds.has(String(eventServerId).trim())) return true;
  if (eventClientId && validIds.has(String(eventClientId).trim())) return true;

  // 2. Check populated calendarId name against target calendar name
  if (targetCal?.name) {
    const evName = event.calendarId?.name;
    if (evName && evName.toLowerCase() === targetCal.name.toLowerCase()) {
      return true;
    }
  }

  // 3. Fallback: Check if target calendar is default and event has no calendar assigned
  if (targetCal?.isDefault && !eventCalRef && !eventServerId && !eventClientId) {
    return true;
  }

  return false;
};

/**
 * Returns the effective display color for an event.
 */
export const getEventDisplayColor = (event, calendars = [], fallback = '#7e37d8') => {
  if (event?.color) return event.color;
  const cal = resolveEventCalendar(event, calendars);
  return cal?.color || fallback;
};

/**
 * Returns the effective calendar name for an event.
 */
export const getEventCalendarName = (event, calendars = [], fallback = 'Calendar') => {
  const cal = resolveEventCalendar(event, calendars);
  return cal?.name || event?.calendarId?.name || fallback;
};

/**
 * Checks whether an event matches a target date, considering exact dates
 * and recurring rules (daily, weekly, weekdays, monthly).
 */
export const isEventMatchingDate = (ev, targetDate) => {
  if (!ev || !ev.startAt || !targetDate) return false;
  const evDate = new Date(ev.startAt);
  const target = new Date(targetDate);

  if (isNaN(evDate.getTime()) || isNaN(target.getTime())) return false;

  // Exact same day
  if (
    evDate.getFullYear() === target.getFullYear() &&
    evDate.getMonth() === target.getMonth() &&
    evDate.getDate() === target.getDate()
  ) {
    return true;
  }

  // Handle recurrence frequency
  const freq = ev.recurrenceRule?.frequency;
  if (!freq || freq === 'none') return false;

  const startMidnight = new Date(evDate.getFullYear(), evDate.getMonth(), evDate.getDate()).getTime();
  const targetMidnight = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  if (targetMidnight < startMidnight) return false;

  if (ev.recurrenceRule?.until) {
    const untilMidnight = new Date(new Date(ev.recurrenceRule.until).setHours(23, 59, 59, 999)).getTime();
    if (targetMidnight > untilMidnight) return false;
  }

  if (freq === 'daily') return true;
  if (freq === 'weekdays') {
    const day = target.getDay();
    return day >= 1 && day <= 5;
  }
  if (freq === 'weekly') {
    if (Array.isArray(ev.recurrenceRule?.daysOfWeek) && ev.recurrenceRule.daysOfWeek.length > 0) {
      return ev.recurrenceRule.daysOfWeek.includes(target.getDay());
    }
    return evDate.getDay() === target.getDay();
  }
  if (freq === 'monthly') return evDate.getDate() === target.getDate();

  return false;
};
