import * as ical from 'node-ical';

export type WorkRecord = {
  year: string;
  month: string;
  day: string;
  inHour: string;
  inMin: string;
  outHour: string;
  outMin: string;
  remark: string;
};

// ---------- Utils ----------
function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function normalize(text?: string): string {
  if (!text) return '';
  return text.replace(/\s+/g, ' ').trim();
}

function isMeeting(start: Date, end: Date): boolean {
  const hours = (end.getTime() - start.getTime()) / 36e5;
  return hours > 0 && hours <= 4;
}

// ---------- Main ----------
export function readICS(path: string): WorkRecord[] {
  const data = ical.parseFile(path);
  const results: WorkRecord[] = [];

  for (const key in data) {
    const ev: any = data[key];
    if (ev.type !== 'VEVENT') continue;

    const start = ev.start as Date;
    const end = ev.end as Date;

    // ===== Skip weekend =====
    const dayOfWeek = start.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    const allDay = ev.datetype === 'date';
    const meeting = !allDay && isMeeting(start, end);

    // ===== Default work time =====
    let inHour = '09';
    let inMin = '00';
    let outHour = '18';
    let outMin = '00';

    // Non meeting timed event
    if (!allDay && !meeting) {
      inHour = pad(start.getHours());
      inMin = pad(start.getMinutes());
      outHour = pad(end.getHours());
      outMin = pad(end.getMinutes());
    }

    // ===== Remark =====
    const summary = normalize(ev.summary);
    let remark = summary;

    if (meeting) {
      remark =
`${summary}
${pad(start.getHours())}:${pad(start.getMinutes())}
-${pad(end.getHours())}:${pad(end.getMinutes())}`;
    }

    results.push({
      year: String(start.getFullYear()),
      month: String(start.getMonth() + 1),
      day: String(start.getDate()),
      inHour,
      inMin,
      outHour,
      outMin,
      remark,
    });
  }

  return results;
}
