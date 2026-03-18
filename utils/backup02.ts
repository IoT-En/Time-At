import * as ical from 'node-ical';

type RecordItem = {
  year: string;
  month: string;
  day: string;
  remark: string;
};

export function readICS(path: string): RecordItem[] {
  const data = ical.parseFile(path);
  const map = new Map<string, string[]>();

  for (const k in data) {
    const ev: any = data[k];
    if (ev.type !== 'VEVENT') continue;

    if (ev.rrule) {
      const until = ev.rrule.options.until || new Date('2099-12-31');
      const dates = ev.rrule.between(ev.start, until, true);

      for (const d of dates) push(ev, d, map);
    } else {
      push(ev, ev.start, map);
    }
  }

  const results: RecordItem[] = [];

  for (const [date, titles] of map.entries()) {
    if (!titles.some(t => t.toLowerCase().includes('wfh'))) continue;

    const d = new Date(date);

    results.push({
      year: d.getFullYear().toString(),
      month: (d.getMonth() + 1).toString(),
      day: d.getDate().toString(),
      remark: titles.join(' | ')
    });
  }

  return results;
}

function push(ev: any, date: Date, map: Map<string,string[]>) {
  const dow = date.getDay();
  if (dow === 0 || dow === 6) return;

  const key = date.toISOString().slice(0,10);

  if (!map.has(key)) map.set(key, []);
  map.get(key)!.push(ev.summary || '');
}
