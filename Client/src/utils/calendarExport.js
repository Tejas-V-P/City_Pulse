/**
 * Formats a date string (YYYY-MM-DD) and optional time to UTC ISO representation for calendars
 */
function parseEventDates(dateStr, timeStr) {
  try {
    const baseDate = dateStr || new Date().toISOString().split('T')[0];
    let startHour = 10;
    let startMin = 0;
    let endHour = 17;
    let endMin = 0;

    if (timeStr && timeStr.includes('-')) {
      const parts = timeStr.split('-').map(s => s.trim());
      // Try to parse basic AM/PM
      const parseTime = (t) => {
        const isPM = /pm/i.test(t);
        const match = t.match(/(\d+):?(\d*)/);
        if (match) {
          let h = parseInt(match[1], 10);
          const m = match[2] ? parseInt(match[2], 10) : 0;
          if (isPM && h < 12) h += 12;
          if (!isPM && h === 12) h = 0;
          return { h, m };
        }
        return { h: 10, m: 0 };
      };
      const s = parseTime(parts[0]);
      const e = parseTime(parts[1]);
      startHour = s.h;
      startMin = s.m;
      endHour = e.h;
      endMin = e.m;
    }

    const d = new Date(baseDate);
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), startHour, startMin);
    const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), endHour, endMin);

    const formatToCal = (dt) =>
      dt.toISOString().replace(/-|:|\.\d+/g, '');

    return {
      startFormatted: formatToCal(start),
      endFormatted: formatToCal(end)
    };
  } catch (e) {
    const now = new Date().toISOString().replace(/-|:|\.\d+/g, '');
    return { startFormatted: now, endFormatted: now };
  }
}

/**
 * Generate a Google Calendar event creation URL
 */
export function getGoogleCalendarUrl(event) {
  const { startFormatted, endFormatted } = parseEventDates(event.date, event.time);
  const title = encodeURIComponent(event.title || 'City Pulse Event');
  const details = encodeURIComponent(
    `${event.description || ''}\n\nVenue: ${event.venue || ''}, ${event.city || ''}\nTicket: City Pulse Platform`
  );
  const location = encodeURIComponent(`${event.venue || ''}, ${event.city || ''}`);

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startFormatted}/${endFormatted}&details=${details}&location=${location}`;
}

/**
 * Generate and download an iCalendar (.ics) file
 */
export function downloadIcsFile(event) {
  const { startFormatted, endFormatted } = parseEventDates(event.date, event.time);
  const summary = event.title || 'City Pulse Event';
  const description = (event.description || '').replace(/\n/g, '\\n');
  const location = `${event.venue || ''}, ${event.city || ''}`;

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//City Pulse//Event Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:citypulse-${event.id || Date.now()}@citypulse.com`,
    `DTSTAMP:${startFormatted}`,
    `DTSTART:${startFormatted}`,
    `DTEND:${endFormatted}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', `${(event.title || 'event').replace(/[^a-zA-Z0-9]/g, '_')}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
