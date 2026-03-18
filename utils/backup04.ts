import * as ical from 'node-ical';

type RecordItem = {
  year: string;
  month: string;
  day: string;
  remark: string;
};
//////////////////////HELPERS//////////////////////
function clean(text: string) {
  return (text || '').replace(/https?:\/\/\S+/g, '').trim();
}

function isHoliday(summary: string) {
  const s = summary.toLowerCase();
  return s.includes('leave') || s.includes('holiday') || s.includes('sick');
}

function isWFH(summary: string) {
  return summary.toLowerCase().includes('wfh');
}

function isOffSite(summary: string) {
  return summary.toLowerCase().includes('off-site');
}
//////////////////////MAIN FUNCTION//////////////////////
export function readICS(
  path: string,
  startDate?: string,
  endDate?: string
): RecordItem[] {

  const data = ical.parseFile(path);
  const map = new Map<string, string[]>();

  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;

  for (const k in data) {
    const ev: any = data[k];
    if (ev.type !== 'VEVENT') continue;

    if (ev.rrule) {
      const until = ev.rrule.options.until || new Date('2099-12-31');
      const dates = ev.rrule.between(ev.start, until, true);

      for (const d of dates) {
        if (isOutOfRange(d, start, end)) continue;
        
        push(ev, d, map);
      }
    } else {
      if (isOutOfRange(ev.start, start, end)) continue;
      push(ev, ev.start, map);
    }
  }

  const results: RecordItem[] = [];

  for (const [date, titles] of map.entries()) {
    // ต้องมี WFH อย่างน้อย 1 รายการ
    if (!titles.some(t => t.toLowerCase().includes('wfh'))) continue;
    if (!titles.some(t => t.includes('Off-Site'))) continue;

    const d = new Date(date);

    results.push({
      year: d.getFullYear().toString(),
      month: (d.getMonth() + 1).toString().padStart(2, '0'),
      day: d.getDate().toString().padStart(2, '0'),
      remark: titles.join('\n\n')
    });
  }

  return results.sort(
    (a, b) =>
      new Date(`${a.year}-${a.month}-${a.day}`).getTime() -
      new Date(`${b.year}-${b.month}-${b.day}`).getTime()
  );
}

/* ================= helpers ================= */

function isOutOfRange(
  date: Date,
  start: Date | null,
  end: Date | null
) {
  if (start && date < start) return true;
  if (end && date > end) return true;
  return false;
}

function push(ev: any, date: Date, map: Map<string, string[]>) {
  const dow = date.getDay();
  if (dow === 0 || dow === 6) return; // skip weekend

  const summary = clean(ev.summary || '');
  if (isHoliday(summary)) return;

  const key = date.toISOString().slice(0, 10);
  let line = summary;

  // ใส่เวลา ถ้าไม่ใช่ all-day
  if (ev.start && ev.end && ev.datetype !== 'date') {
    const sh = ev.start.getHours().toString().padStart(2, '0');
    const sm = ev.start.getMinutes().toString().padStart(2, '0');
    const eh = ev.end.getHours().toString().padStart(2, '0');
    const em = ev.end.getMinutes().toString().padStart(2, '0');
    line += `\n${sh}:${sm}-${eh}:${em}`;
  }

  if (!map.has(key)) map.set(key, []);
  map.get(key)!.push(line);
}
