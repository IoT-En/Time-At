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
// ---------- Utils ----------
function pad(n) {
    return String(n).padStart(2, '0');
}
function normalize(text) {
    if (!text)
        return '';
    return text.replace(/\s+/g, ' ').trim();
}
function isMeeting(start, end) {
    const hours = (end.getTime() - start.getTime()) / 36e5;
    return hours > 0 && hours <= 4;
}
// ---------- Main ----------
function readICS(path) {
    const data = ical.parseFile(path);
    const results = [];
    for (const key in data) {
        const ev = data[key];
        if (ev.type !== 'VEVENT')
            continue;
        const start = ev.start;
        const end = ev.end;
        // ===== Skip weekend =====
        const dayOfWeek = start.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6)
            continue;
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
