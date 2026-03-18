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
exports.readICS = readICS;
const ical = __importStar(require("node-ical"));
function clean(text) {
    return (text || '').replace(/https?:\/\/\S+/g, '').trim();
}
function isHoliday(summary) {
    const s = summary.toLowerCase();
    return s.includes('leave') || s.includes('holiday') || s.includes('sick');
}
function readICS(path) {
    const data = ical.parseFile(path);
    const map = new Map();
    for (const k in data) {
        const ev = data[k];
        if (ev.type !== 'VEVENT')
            continue;
        if (ev.rrule) {
            const until = ev.rrule.options.until || new Date('2099-12-31');
            const dates = ev.rrule.between(ev.start, until, true);
            for (const d of dates)
                push(ev, d, map);
        }
        else {
            push(ev, ev.start, map);
        }
    }
    const results = [];
    for (const [date, titles] of map.entries()) {
        // ต้องมี WFH อย่างน้อย 1 รายการ
        if (!titles.some(t => t.toLowerCase().includes('wfh')))
            continue;
        const d = new Date(date);
        results.push({
            year: d.getFullYear().toString(),
            month: (d.getMonth() + 1).toString(),
            day: d.getDate().toString(),
            remark: titles.join('\n\n')
        });
    }
    return results.sort((a, b) => new Date(`${a.year}-${a.month}-${a.day}`).getTime() -
        new Date(`${b.year}-${b.month}-${b.day}`).getTime());
}
function push(ev, date, map) {
    const dow = date.getDay();
    if (dow === 0 || dow === 6)
        return;
    const summary = clean(ev.summary || '');
    if (isHoliday(summary))
        return;
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
    if (!map.has(key))
        map.set(key, []);
    map.get(key).push(line);
}
