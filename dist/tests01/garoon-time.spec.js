"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
(0, test_1.test)('Garoon Time Attendance - Edge (Headed)', async ({ page }) => {
    // เปิด Edge (Chromium) ให้เห็น
    await page.goto('https://grn.mat.co.th/scripts/cbgrn/grn.exe', {
        waitUntil: 'networkidle'
    });
    // ===== LOGIN =====
    await page.getByRole('textbox', { name: 'Login name' }).fill('pattapon');
    await page.getByRole('textbox', { name: 'Password' }).fill('passw0rd');
    await page.getByRole('button', { name: 'Login' }).click();
    await page.waitForLoadState('networkidle');
    // Now page is guaranteed to be alive
    await page.goto('https://grn.mat.co.th/scripts/cbgrn/grn.exe/workflow/send_form?cid=630&fid=2411');
    // ===== กรอก Time Attendance =====
    // Year
    await page.selectOption('#item_56407_year', '2025');
    // Month (Dec = 12)
    await page.selectOption('#item_56407_month', '12');
    // รอให้ Day refresh หลัง onchange
    await page.waitForTimeout(300);
    // Day
    await page.selectOption('#item_56407_day', '16');
    // ===== Time In =====
    await page.selectOption('#item_56408', '09'); // Hour In
    await page.selectOption('#item_56409', '00'); // Minute In
    // ===== Time Out =====
    await page.selectOption('#item_56410', '18'); // Hour Out
    await page.selectOption('#item_56411', '00'); // Minute Out
    // ===== Remark =====
    await page.fill('textarea[name="item_56412"]', 'DEM Morning Meeting / NX Toolkit');
    // 🔎 รอปุ่มขึ้นก่อน
    await (0, test_1.expect)(page.getByRole('button', { name: 'Save as draft' })).toBeVisible();
    // Save draft
    await page.getByRole('button', { name: 'Save as draft' }).click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);
});
