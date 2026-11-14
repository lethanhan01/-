import { BusyScheduleMap, HOUR_SLOTS, WEEKDAYS, Weekday } from './types';

export interface ParsedSchedulePreview {
  source: 'ics' | 'csv' | 'ocr-simulated';
  subjects: { day: Weekday; startHour: number; endHour: number; title: string }[];
  busyMap: BusyScheduleMap;
}

export function createEmptyBusyMap(): BusyScheduleMap {
  return {
    mon: [],
    tue: [],
    wed: [],
    thu: [],
    fri: [],
    sat: [],
    sun: [],
  };
}

const VALID_SLOT_SET = new Set<number>(HOUR_SLOTS);

function addBusyRange(map: BusyScheduleMap, day: Weekday, startHour: number, endHour: number) {
  const set = new Set(map[day]);
  for (let h = Math.floor(startHour); h < Math.ceil(endHour); h += 1) {
    if (VALID_SLOT_SET.has(h)) {
      set.add(h);
    }
  }
  map[day] = Array.from(set).sort((a, b) => a - b);
}

const DAY_ALIASES: Record<string, Weekday> = {
  mon: 'mon',
  mo: 'mon',
  t2: 'mon',
  '2': 'mon',
  'thu 2': 'mon',
  tue: 'tue',
  tu: 'tue',
  t3: 'tue',
  '3': 'tue',
  'thu 3': 'tue',
  wed: 'wed',
  we: 'wed',
  t4: 'wed',
  '4': 'wed',
  'thu 4': 'wed',
  thu: 'thu',
  th: 'thu',
  t5: 'thu',
  '5': 'thu',
  'thu 5': 'thu',
  fri: 'fri',
  fr: 'fri',
  t6: 'fri',
  '6': 'fri',
  'thu 6': 'fri',
  sat: 'sat',
  sa: 'sat',
  t7: 'sat',
  '7': 'sat',
  'thu 7': 'sat',
  sun: 'sun',
  su: 'sun',
  cn: 'sun',
  '8': 'sun',
  'chu nhat': 'sun',
};

function normalizeDayToken(raw: string): Weekday | null {
  const cleaned = raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return DAY_ALIASES[cleaned] ?? null;
}

function parseHourToken(raw: string): number | null {
  const match = raw.trim().match(/^(\d{1,2})(?::(\d{2}))?/);
  if (!match) {
    return null;
  }
  const hour = Number(match[1]);
  const minute = match[2] ? Number(match[2]) : 0;
  if (hour < 0 || hour > 23) {
    return null;
  }
  return hour + minute / 60;
}

/**
 * Parses CSV schedule lines like: T2,07:30,11:30,Cau truc du lieu
 */
export function parseCsvSchedule(content: string): ParsedSchedulePreview {
  const busyMap = createEmptyBusyMap();
  const subjects: ParsedSchedulePreview['subjects'] = [];

  const lines = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  for (const line of lines) {
    const parts = line.split(',').map((p) => p.trim());
    if (parts.length < 3) {
      continue;
    }
    const day = normalizeDayToken(parts[0]);
    const start = parseHourToken(parts[1]);
    const end = parseHourToken(parts[2]);
    if (!day || start === null || end === null || end <= start) {
      continue;
    }
    const title = parts[3] || 'Lịch học trên trường';
    subjects.push({ day, startHour: Math.floor(start), endHour: Math.ceil(end), title });
    addBusyRange(busyMap, day, start, end);
  }

  return { source: 'csv', subjects, busyMap };
}

function parseIcsDateHour(val: string): { date: Date; hour: number } | null {
  const match = val.match(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})/);
  if (!match) {
    return null;
  }
  const [, y, m, d, hh, mm] = match;
  const date = new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm));
  return { date, hour: Number(hh) + Number(mm) / 60 };
}

const JS_DAY_TO_WEEKDAY: Weekday[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

/**
 * Parses standard .ics VEVENT blocks into weekly busy slots.
 */
export function parseIcsSchedule(content: string): ParsedSchedulePreview {
  const busyMap = createEmptyBusyMap();
  const subjects: ParsedSchedulePreview['subjects'] = [];

  const blocks = content.split('BEGIN:VEVENT').slice(1);
  for (const block of blocks) {
    const endIdx = block.indexOf('END:VEVENT');
    const body = endIdx >= 0 ? block.slice(0, endIdx) : block;

    const dtStartMatch = body.match(/DTSTART[^:]*:([^\r\n]+)/);
    const dtEndMatch = body.match(/DTEND[^:]*:([^\r\n]+)/);
    const summaryMatch = body.match(/SUMMARY:([^\r\n]+)/);
    const byDayMatch = body.match(/BYDAY=([A-Z,]+)/);

    if (!dtStartMatch || !dtEndMatch) {
      continue;
    }
    const startInfo = parseIcsDateHour(dtStartMatch[1].trim());
    const endInfo = parseIcsDateHour(dtEndMatch[1].trim());
    if (!startInfo || !endInfo || endInfo.hour <= startInfo.hour) {
      continue;
    }

    const title = summaryMatch ? summaryMatch[1].trim() : 'Môn học';
    const days: Weekday[] = [];

    if (byDayMatch) {
      for (const token of byDayMatch[1].split(',')) {
        const mapped = normalizeDayToken(token);
        if (mapped) {
          days.push(mapped);
        }
      }
    } else {
      days.push(JS_DAY_TO_WEEKDAY[startInfo.date.getDay()]);
    }

    for (const day of days) {
      subjects.push({
        day,
        startHour: Math.floor(startInfo.hour),
        endHour: Math.ceil(endInfo.hour),
        title,
      });
      addBusyRange(busyMap, day, startInfo.hour, endInfo.hour);
    }
  }

  return { source: 'ics', subjects, busyMap };
}

/**
 * Simulates OCR extraction when a student uploads an image of their university timetable.
 */
export function simulateImageOcrSchedule(fileName: string): ParsedSchedulePreview {
  const busyMap = createEmptyBusyMap();
  const subjects: ParsedSchedulePreview['subjects'] = [
    { day: 'mon', startHour: 7, endHour: 11, title: 'Cấu trúc dữ liệu & Giải thuật' },
    { day: 'tue', startHour: 13, endHour: 17, title: 'Cơ sở dữ liệu' },
    { day: 'wed', startHour: 7, endHour: 11, title: 'Mạng máy tính' },
    { day: 'thu', startHour: 13, endHour: 16, title: 'Kỹ năng giao tiếp & Teamwork' },
    { day: 'fri', startHour: 7, endHour: 10, title: `Anh văn chuyên ngành (${fileName})` },
  ];

  for (const s of subjects) {
    addBusyRange(busyMap, s.day, s.startHour, s.endHour);
  }

  return { source: 'ocr-simulated', subjects, busyMap };
}

export const SAMPLE_WEEKDAYS = WEEKDAYS;
