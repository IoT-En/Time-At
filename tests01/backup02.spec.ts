import { test } from '@playwright/test';
import * as fs from 'fs';
import * as ical from 'node-ical';

// ================= TYPES =================
type WorkRecord = {
  year: string;
  month: string;
  day: string;
  remark: string;
};

// ================= CONFIG =================
const GAROON_URL = 'https://grn.mat.co.th/scripts/cbgrn/grn.exe';
const FORM_URL = 'https://grn.mat.co.th/scripts/cbgrn/grn.exe/workflow/send_form?cid=630&fid=2411';

const USERNAME = 'pattapon';
const PASSWORD = 'passw0rd';

const ICS_PATH = './data/schedule(2).ics';
const CSV_RESULT = './result.csv';

// ================= UTILS =================
function cleanText(text: string) {
  if (!text) return '';
  return text.replace(/https?:\/\/\S+/g, '').trim();
}

function isHoliday(summary: string) {
  const s = summary.toLowerCase();
  return s.includes('holiday') || s.includes('leave') || s.includes('sick');
}

function isWFH(summary: string) {
  return summary.toLowerCase().includes('wfh');
}

// ================= ICS PARSER =================
function readICS(path: string): WorkRecord[] {
  const data = ical.parseFile(path);

  const map = new Map<string, string[]>();

  for (const key in data) {
    const ev: any = data[key];
    if (ev.type !== 'VEVENT') continue;

    const start = ev.start as Date;

    // skip weekend
    const dow = start.getDay();
    if (dow === 0 || dow === 6) continue;

    const summary = cleanText(ev.summary ?? '');

    // skip holiday
    if (isHoliday(summary)) continue;

    // only WFH
    if (!isWFH(summary)) continue;

    const y = start.getFullYear();
    const m = start.getMonth() + 1;
    const d = start.getDate();

    const dateKey = `${y}-${m}-${d}`;

    let line = summary;

    if (ev.start && ev.end && ev.datetype !== 'date') {
      const sh = start.getHours().toString().padStart(2, '0');
      const sm = start.getMinutes().toString().padStart(2, '0');
      const eh = ev.end.getHours().toString().padStart(2, '0');
      const em = ev.end.getMinutes().toString().padStart(2, '0');
      line += `\n${sh}:${sm}-${eh}:${em}`;
    }

    if (!map.has(dateKey)) map.set(dateKey, []);
    map.get(dateKey)!.push(line);
  }

  const results: WorkRecord[] = [];

  for (const [dateKey, remarks] of map.entries()) {
    const [y, m, d] = dateKey.split('-');

    results.push({
      year: y,
      month: m,
      day: d,
      remark: remarks.join('\n\n'),
    });
  }

  return results.sort(
    (a, b) =>
      new Date(`${a.year}-${a.month}-${a.day}`).getTime() -
      new Date(`${b.year}-${b.month}-${b.day}`).getTime()
  );
}

// ================= CSV =================
function exportCSV(records: any[]) {
  const header = 'Date,Status,Remark\n';
  const lines = records
    .map(r => `${r.date},${r.status},"${r.remark.replace(/\"/g, '"')}"`)
    .join('\n');

  fs.writeFileSync(CSV_RESULT, header + lines);
}

// ================= TEST =================
test('Garoon WFH Automation from ICS', async ({ page }) => {
  const records = readICS(ICS_PATH);
  const logs: any[] = [];

  // ===== LOGIN =====
  await page.goto(GAROON_URL, { waitUntil: 'networkidle' });

  await page.getByRole('textbox', { name: 'Login name' }).fill(USERNAME);
  await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Login' }).click();

  await page.waitForLoadState('networkidle');

  // ===== LOOP EACH DAY =====
  for (const r of records) {
    const dateLabel = `${r.year}-${r.month}-${r.day}`;

    try {
      await page.goto(FORM_URL);
      await page.waitForSelector('#item_56407_year');

      await page.selectOption('#item_56407_year', r.year);
      await page.selectOption('#item_56407_month', r.month);
      await page.waitForTimeout(200);
      await page.selectOption('#item_56407_day', r.day);

      // WFH fixed time
      await page.selectOption('#item_56408', '09');
      await page.selectOption('#item_56409', '00');
      await page.selectOption('#item_56410', '18');
      await page.selectOption('#item_56411', '00');

      await page.fill('textarea[name="item_56412"]', r.remark);

      await page.getByRole('button', { name: 'Save as draft' }).click();
      await page.waitForLoadState('networkidle');

      logs.push({
        date: dateLabel,
        status: 'SUCCESS',
        remark: r.remark,
      });
    } catch (err: any) {
      logs.push({
        date: dateLabel,
        status: 'FAILED',
        remark: err.message,
      });
    }
  }

  exportCSV(logs);

  console.table(logs);
});
