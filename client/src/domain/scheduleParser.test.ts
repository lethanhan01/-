import { parseCsvSchedule, parseIcsSchedule } from './scheduleParser';

describe('scheduleParser', () => {
  it('parses CSV timetable into weekly busy hours', () => {
    const csv = ['Thu,Start,End,Mon hoc', 'T2,07:30,11:00,CTDL', 'T5,13:00,16:00,CSDL'].join('\n');
    const parsed = parseCsvSchedule(csv);

    expect(parsed.subjects).toHaveLength(2);
    expect(parsed.busyMap.mon).toEqual([7, 8, 9, 10]);
    expect(parsed.busyMap.thu).toEqual([13, 14, 15]);
  });

  it('parses ICS VEVENT entries into weekly busy hours', () => {
    const ics = [
      'BEGIN:VCALENDAR',
      'BEGIN:VEVENT',
      'SUMMARY:Lap trinh Web',
      'DTSTART:20261116T130000',
      'DTEND:20261116T160000',
      'RRULE:FREQ=WEEKLY;BYDAY=WE',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\n');

    const parsed = parseIcsSchedule(ics);
    expect(parsed.subjects).toHaveLength(1);
    expect(parsed.busyMap.wed).toEqual([13, 14, 15]);
  });
});
