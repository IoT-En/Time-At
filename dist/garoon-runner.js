"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAutomation = runAutomation;
const test_1 = require("@playwright/test");
//import { readICS } from './utils/ics-reader';
const ics_reader_1 = require("./utils/ics-reader");
const fs = __importStar(require("fs"));
// ================= MAIN =================
async function runAutomation(opts) {
    const { username, password, icsPath, startDate, endDate } = opts;
    const records = (0, ics_reader_1.readICS)(icsPath, startDate, endDate);
    // 🔥 ใส่ตรงนี้เลย
    console.log('=== readICS result ===');
    records.forEach(r => {
        console.log(`${r.year}-${r.month}-${r.day}`, 'remark =', JSON.stringify(r.remark));
    });
    const logs = [];
    if (records.length === 0) {
        return 'No WFH records found in selected date range';
    }
    const browser = await test_1.chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
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
                await page.goto('https://grn.mat.co.th/scripts/cbgrn/grn.exe/workflow/send_form?cid=630&fid=2411', { waitUntil: 'load' });
                await page.waitForSelector('#item_56407_year', { timeout: 10000 });
                // date
                await page.selectOption('#item_56407_year', r.year);
                await page.selectOption('#item_56407_month', r.month);
                //await page.waitForTimeout(200);
                await page.waitForFunction(({ day }) => {
                    const sel = document.querySelector('#item_56407_day');
                    if (!sel)
                        return false;
                    return Array.from(sel.options).some(o => o.value === day);
                }, { day: r.day });
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
                    const el = document.querySelector(sel);
                    if (el)
                        el.value = '';
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
            }
            catch (err) {
                logs.push({
                    date: dateLabel,
                    status: 'FAILED',
                    error: err.message,
                });
            }
        }
    }
    finally {
        await browser.close();
    }
    // ===== EXPORT CSV =====
    const csv = 'Date,Status,Error\n' +
        logs
            .map(l => `${l.date},${l.status},"${l.error ?? ''}"`)
            .join('\n');
    fs.writeFileSync('./result.csv', csv);
    return logs;
}
