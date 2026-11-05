import { eventTypeLabel, priorityLabel } from './display-labels';
import { EventItem } from '../features/events/event.model';

export function exportEventIcs(event: EventItem): void {
  exportEventsIcs([event], event.eventName || 'eveniment');
}

export function exportEventsIcs(events: EventItem[], filename = 'evenimente'): void {
  const content = buildEventsIcs(events);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${safeFilename(filename)}.ics`;
  link.click();
  URL.revokeObjectURL(url);
}

function buildEventsIcs(events: EventItem[]): string {
  const now = formatDateTimeUtc(new Date());
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Modern Ministry//Events//RO',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...events.flatMap((event) => buildEventLines(event, now)),
    'END:VCALENDAR'
  ];
  return `${lines.join('\r\n')}\r\n`;
}

function buildEventLines(event: EventItem, now: string): string[] {
  const startDate = event.openDate || toIsoDate(new Date());
  const endDate = event.endDate && event.endDate >= startDate ? event.endDate : startDate;
  const timed = !!event.eventTime;
  const timedEnd = timed ? addOneHour(endDate, event.eventTime!) : null;
  const description = eventDescription(event);
  return [
    'BEGIN:VEVENT',
    `UID:${eventUid(event)}`,
    `DTSTAMP:${now}`,
    timed ? `DTSTART:${formatLocalDateTime(startDate, event.eventTime!)}` : `DTSTART;VALUE=DATE:${formatDate(startDate)}`,
    timed && timedEnd ? `DTEND:${formatLocalDateTime(timedEnd.date, timedEnd.time)}` : `DTEND;VALUE=DATE:${formatDate(addDays(endDate, 1))}`,
    `SUMMARY:${escapeIcs(event.eventName || 'Eveniment')}`,
    ...(description ? [`DESCRIPTION:${escapeIcs(description)}`] : []),
    ...(event.groupName ? [`LOCATION:${escapeIcs(event.groupName)}`] : []),
    'END:VEVENT'
  ];
}

function eventDescription(event: EventItem): string {
  return [
    event.about || '',
    event.responsibleNames?.length ? `Responsabili: ${event.responsibleNames.join(', ')}` : '',
    `Tip: ${eventTypeLabel(event.eventType)}`,
    `Prioritate: ${priorityLabel(event.priority)}`
  ].filter(Boolean).join('\n');
}

function eventUid(event: EventItem): string {
  const id = event.id || safeFilename(event.eventName || 'event');
  return `event-${id}@modern-ministry.local`;
}

function formatDate(value: string): string {
  return value.replaceAll('-', '');
}

function formatLocalDateTime(date: string, time: string): string {
  return `${formatDate(date)}T${time.slice(0, 5).replace(':', '')}00`;
}

function formatDateTimeUtc(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function addOneHour(date: string, time: string): { date: string; time: string } {
  const [rawHours, rawMinutes] = time.slice(0, 5).split(':').map(Number);
  const hours = Number.isFinite(rawHours) ? rawHours : 0;
  const minutes = Number.isFinite(rawMinutes) ? rawMinutes : 0;
  const nextDate = hours >= 23 ? addDays(date, 1) : date;
  const nextTime = `${(hours + 1) % 24}`.padStart(2, '0') + `:${minutes}`.padStart(3, '0').slice(-2);
  return { date: nextDate, time: nextTime };
}

function addDays(iso: string, days: number): string {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(year, month - 1, day + days);
  return toIsoDate(date);
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function escapeIcs(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

function safeFilename(value: string): string {
  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  let filename = '';
  let separatorPending = false;

  for (const character of normalized) {
    const isAsciiLetterOrDigit = (character >= 'a' && character <= 'z')
      || (character >= '0' && character <= '9');
    if (isAsciiLetterOrDigit) {
      if (separatorPending && filename) {
        filename += '-';
      }
      filename += character;
      separatorPending = false;
    } else {
      separatorPending = true;
    }
  }

  return filename.slice(0, 80) || 'eveniment';
}
