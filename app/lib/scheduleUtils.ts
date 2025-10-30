/*
 * Copyright (c) LLC "Centr Distribyucii"
 * All rights reserved.
 */

import {ScheduledBlock} from "@/public/types/interfaces";

export const RU_DAYS = ["ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ", "ВС"]
export const RU_DAY_INDEX: Record<string, number> = {
    ПН: 0, ВТ: 1, СР: 2, ЧТ: 3, ПТ: 4, СБ: 5, ВС: 6
}

export const WEEK_DAYS: ScheduledBlock['dayOfWeek'][] = [
    'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'
]

export function getCurrentWeekByDate(date: Date): Date[] {
    const jsDay = date.getDay() // 0=ВС,1=ПН...
    const mondayOffset = jsDay === 0 ? -6 : 1 - jsDay
    const monday = new Date(date)
    monday.setDate(date.getDate() + mondayOffset)
    return Array.from({length: 7}, (_, i) => {
        const d = new Date(monday)
        d.setDate(monday.getDate() + i)
        return d
    })
}

export function parseDayToDate(shortName: string, week: Date[]): Date {
    const idx = RU_DAY_INDEX[shortName] ?? 0
    return week[idx] ?? week[0]
}

export function normalizeTime(input: string): string {
    const [h = "0", m = "0"] = input.split(':')
    const hh = h.padStart(2, '0')
    const mm = m.padStart(2, '0')
    return `${hh}:${mm}`
}

export function generateTimeSlots(start: string, end: string, step: number): string[] {
    const [h0, m0] = start.split(':').map(Number)
    const [h1, m1] = end.split(':').map(Number)
    let hour = h0, minute = m0
    const result: string[] = []
    while (hour < h1 || (hour === h1 && minute <= m1)) {
        result.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`)
        minute += step
        if (minute >= 60) {
            minute -= 60;
            hour += 1
        }
    }
    return result
}

export function timeToMinutes(t: string): number {
    const [h, m] = t.split(':').map(Number)
    return h * 60 + m
}

export function dateToIsoLocal(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

export const hhmmOrHmsToMinutes = (t: string): number => {
    // принимает "HH:MM" или "HH:MM:SS"
    const s = t.trim();
    const [hh, mm] = s.split(':').slice(0, 2).map(n => parseInt(n, 10));
    if (hh === 24 && (mm ?? 0) === 0) return 1440;      // поддержка 24:00[:00]
    return (hh * 60) + (mm || 0);
};

export const normalizeRange = (startHHMM: string, endHHMM: string) => {
    // "00:00"–"00:00" трактуем как полный день [0, 1440]
    const isFullDay = startHHMM === '00:00' && endHHMM === '00:00';
    if (isFullDay) return {start: 0, end: 1440, isFullDay: true};
    const start = timeToMinutes(startHHMM);
    const end = timeToMinutes(endHHMM);
    return {start, end, isFullDay: false};
};