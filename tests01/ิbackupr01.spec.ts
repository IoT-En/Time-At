import { test, expect } from '@playwright/test';
import { readICS } from '../utils/ics-reader';

test('Garoon Time Attendance - Edge (Headed)', async ({ page }) => {

  // ===== OPEN =====
  await page.goto('https://grn.mat.co.th/scripts/cbgrn/grn.exe', {
    waitUntil: 'networkidle',
  });

  // ===== LOGIN =====
  await page.getByRole('textbox', { name: 'Login name' }).fill('pattapon');
  await page.getByRole('textbox', { name: 'Password' }).fill('passw0rd');

  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle' }),
    page.getByRole('button', { name: 'Login' }).click(),
  ]);

  // ===== GO TO FORM =====
  await page.goto(
    'https://grn.mat.co.th/scripts/cbgrn/grn.exe/workflow/send_form?cid=630&fid=2411',
    { waitUntil: 'networkidle' }
  );

  // ===== LOAD ICS =====
  const records = readICS('./data/schedule.ics');

  // ===== FILL FORM =====
  for (const r of records) {

    await page.selectOption('#item_56407_year', r.year);
    await page.selectOption('#item_56407_month', r.month);
    await page.waitForTimeout(200);
    await page.selectOption('#item_56407_day', r.day);

    await page.selectOption('#item_56408', '09');
    await page.selectOption('#item_56409', '00');

    await page.selectOption('#item_56410', '18');
    await page.selectOption('#item_56411', '00');

    await page.fill(
      'textarea[name="item_56412"]',
      r.remark
    );

    const saveBtn = page.getByRole('button', { name: 'Save as draft' });
    await expect(saveBtn).toBeVisible();

    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle' }),
      saveBtn.click(),
    ]);
  }

  await page.waitForTimeout(3000);
});
