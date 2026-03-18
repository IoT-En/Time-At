import { chromium } from '@playwright/test';
//import { readICS } from './utils/ics-reader';
import { readICS } from './utils/ics-reader';
import * as fs from 'fs';

// ================= TYPES =================
type RunOptions = {
  username: string;
  password: string;
  icsPath: string;
  startDate?: string;
  endDate?: string;
};

type LogItem = {
  date: string;
  status: 'SUCCESS' | 'FAILED';
  error?: string;
};

// ================= MAIN =================
export async function runAutomation(opts: RunOptions) {
  const { username, password, icsPath, startDate, endDate } = opts;

  const records = readICS(icsPath, startDate, endDate);
  // 🔥 ใส่ตรงนี้เลย
  console.log('=== readICS result ===');

  records.forEach(r => {
    console.log(
      `${r.year}-${r.month}-${r.day}`,
      'remark =',
      JSON.stringify(r.remark)
    );
  });
  const logs: LogItem[] = [];

  if (records.length === 0) {
    return 'No WFH records found in selected date range';
  }

  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();

  try {
    // ===== LOGIN =====
    await page.goto('https://grn.mat.co.th/scripts/cbgrn/grn.exe', {
      waitUntil: 'networkidle',
    });

    await page.getByRole('textbox', { name: 'Login name' }).fill(username);
    await page.getByRole('textbox', { name: 'Password' }).fill(password);
    await page.getByRole('button', { name: 'Login' }).click();
    await page.waitForLoadState('networkidle');

    // ===== LOOP EACH DAY =====
    for (const r of records) {
      const dateLabel = `${r.year}-${r.month}-${r.day}`;

      try {
        await page.goto(
          'https://grn.mat.co.th/scripts/cbgrn/grn.exe/workflow/send_form?cid=630&fid=2411',
          { waitUntil: 'load' }
        );

        await page.waitForSelector('#item_56407_year', { timeout: 10000 });

        // date
        await page.selectOption('#item_56407_year', r.year);
        await page.selectOption('#item_56407_month', r.month);
        //await page.waitForTimeout(200);
        await page.waitForFunction(
          ({ day }) => {
            const sel = document.querySelector<HTMLSelectElement>('#item_56407_day');
            if (!sel) return false;
            return Array.from(sel.options).some(o => o.value === day);
          },
          { day: r.day }
        );

        // แล้วค่อยเลือก
        await page.selectOption('#item_56407_day', r.day);

        await page.selectOption('#item_56407_day', r.day);

        // fixed WFH time
        await page.selectOption('#item_56408', '09');
        await page.selectOption('#item_56409', '00');
        await page.selectOption('#item_56410', '18');
        await page.selectOption('#item_56411', '00');

        // remark
        //await page.fill('textarea[name="item_56412"]', r.remark);
        const remarkSelector = 'textarea[name="item_56412"]';
        // clear แบบ force
        await page.evaluate((sel) => {
          const el = document.querySelector(sel) as HTMLTextAreaElement;
          if (el) el.value = '';
        }, remarkSelector);

        // fill ใหม่
        await page.fill(remarkSelector, r.remark);

        // 🔥 trigger change ให้ Garoon รับรู้
        await page.dispatchEvent(remarkSelector, 'change');
        await page.dispatchEvent(remarkSelector, 'blur');

        // save
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'load' }),

          page.getByRole('button', { name: 'Save as draft' }).click(),

          await page.waitForTimeout(200)
        ]);

        // sanity check
        if (!page.url().includes('workflow')) {
          throw new Error('Draft not saved (no redirect)');
        }

        // await page.getByRole('button', { name: 'Save as draft' }).click();
        // await page.waitForLoadState('networkidle');

        logs.push({ date: dateLabel, status: 'SUCCESS' });
      } catch (err: any) {
        logs.push({
          date: dateLabel,
          status: 'FAILED',
          error: err.message,
        });
      }
    }
  } finally {
    await browser.close();
  }

  // ===== EXPORT CSV =====
  const csv =
    'Date,Status,Error\n' +
    logs
      .map(l => `${l.date},${l.status},"${l.error ?? ''}"`)
      .join('\n');

  fs.writeFileSync('./result.csv', csv);

  return logs;
}
