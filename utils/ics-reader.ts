import * as ical from 'node-ical';

export type RecordItem = {
  year: string;
  month: string;
  day: string;
  remark: string;
};

/* ================= HELPERS ================= */

function clean(text: string) {
  return (text || '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalize(text: string) {
  return clean(text).toLowerCase();
}

function isHoliday(summary: string) {
  const s = normalize(summary);
  return s.includes('leave') || s.includes('holiday') || s.includes('sick');
}

function isWFH(summary: string) {
  return normalize(summary).startsWith('wfh');
}

function isOffSite(summary: string) {
  const s = normalize(summary);
  return s.startsWith('off-site') || s.startsWith('off site');
}

function dateKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function isApplicationTest(summary: string) {
  return summary.toLowerCase().startsWith('application & test');
}

/* ================= MAIN ================= */

export function readICS(
  path: string,
  startDate?: string,
  endDate?: string
): RecordItem[] {

  const data = ical.parseFile(path);

  const startLimit = startDate ? new Date(startDate) : null;
  const endLimit = endDate ? new Date(endDate) : null;

  /** 🔥 key = yyyy-m-d , value = RecordItem */
  const dailyMap = new Map<string, RecordItem>();

  for (const k in data) {
    const ev: any = data[k];
    if (ev.type !== 'VEVENT') continue;

    if (ev.rrule) {
      const until = ev.rrule.options.until || new Date('2099-12-31');

      // const dates = ev.rrule.between(ev.start, until, true);
      const rruleEnd = endLimit && endLimit < until ? endLimit : until;

      const dates = ev.rrule.between(
        startLimit ?? ev.start,
        rruleEnd,
        true
      );

      for (const d of dates) {
        push(ev, d, dailyMap, startLimit, endLimit);
      }
    } else {
      //push(ev, ev.start, dailyMap, startLimit, endLimit);
      // 🔥 FIX Off-Site single-day with time
      const start = new Date(ev.start);
      push(ev, start, dailyMap, startLimit, endLimit);
    }
  }

  return Array.from(dailyMap.values()).sort(
    (a, b) =>
      new Date(`${a.year}-${a.month}-${a.day}`).getTime() -
      new Date(`${b.year}-${b.month}-${b.day}`).getTime()
  );
}

/* ================= PUSH ================= */

function push(
  ev: any,
  date: Date,
  map: Map<string, RecordItem>,
  startLimit: Date | null,
  endLimit: Date | null
) {
  // weekend
  const dow = date.getDay();
  if (dow === 0 || dow === 6) return;
  if (startLimit && date < startLimit) return;
  if (endLimit && date > endLimit) return;


  const summary = clean(ev.summary || '');

  const isWFHEvent = isWFH(summary);
  const isOffSiteEvent = isOffSite(summary);
  const isAppTestEvent = isApplicationTest(summary);

  // ❌ ถ้าไม่ใช่ WFH / Off-Site / AppTest → ตัดทิ้ง
  if (!isWFHEvent && !isOffSiteEvent && !isAppTestEvent) return;

  const key = dateKey(date);

  // เวลา
  let line = summary;
  if (ev.start && ev.end && ev.datetype !== 'date') {
    const sh = ev.start.getHours().toString().padStart(2, '0');
    const sm = ev.start.getMinutes().toString().padStart(2, '0');
    const eh = ev.end.getHours().toString().padStart(2, '0');
    const em = ev.end.getMinutes().toString().padStart(2, '0');
    line += `\n${sh}:${sm}-${eh}:${em}`;
  }

  // -------- create / merge --------

  if (!map.has(key)) {
    // ❗ สร้างเฉพาะวันที่มี WFH หรือ Off-Site เท่านั้น
    if (!isWFHEvent && !isOffSiteEvent) return;

    map.set(key, {
      year: date.getFullYear().toString(),
      month: (date.getMonth() + 1).toString(),
      day: date.getDate().toString(),
      remark: isWFHEvent
        ? `WFH:\n${line}`
        : `Off-Site:\n${line}`
    });
    return;
  }

  const day = map.get(key)!;

  // merge WFH
  if (isWFHEvent && !day.remark.includes(line)) {
    day.remark += `\n\nWFH:\n${line}`;
  }

  // merge Off-Site
  if (isOffSiteEvent && !day.remark.includes(line)) {
    day.remark += `\n\nOff-Site:\n${line}`;
  }

  // merge App & Test → เฉพาะวันที่มี WFH
  if (isAppTestEvent && day.remark.includes('WFH:')) {
    if (!day.remark.includes(line)) {
      day.remark += `\n${line}`;
    }
  }
}



