/*
 * Copyright (c) LLC "Centr Distribyucii"
 * All rights reserved.
 */

export const fmtPct = (n?: number) => (n == null ? '—' : `${n.toFixed(1)} %`);
export const fmtC = (n?: number) => (n == null ? '—' : `${n.toFixed(1)} °C`);
export const fmtVer = (s?: string) => s ?? '—';

type LastSeenOpts = {
    timeZone?: 'local' | 'utc' | string; // 'Europe/Moscow', 'Asia/Almaty', …
    showTz?: boolean;                    // показывать приписку про TZ
};

export function formatLastSeen(
    iso?: string,
    locale = navigator.language,
    opts: LastSeenOpts = {timeZone: 'local', showTz: true}
): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;

    // Выбираем TZ: local (по умолчанию) или конкретная
    const tz =
        !opts.timeZone || opts.timeZone === 'local'
            ? undefined
            : opts.timeZone === 'utc'
                ? 'UTC'
                : opts.timeZone;

    const nice = new Intl.DateTimeFormat(locale, {
        dateStyle: 'medium',
        timeStyle: 'medium',
        timeZone: tz,
    }).format(d);

    // Относительное время (оставляем как есть)
    const now = new Date();
    const diffSec = Math.round((d.getTime() - now.getTime()) / 1000);
    const abs = Math.abs(diffSec);
    let rel = '';
    if ('RelativeTimeFormat' in Intl) {
        const rtf = new Intl.RelativeTimeFormat(locale, {numeric: 'auto'});
        if (abs < 60) rel = rtf.format(Math.trunc(diffSec), 'second');
        else if (abs < 3600) rel = rtf.format(Math.trunc(diffSec / 60), 'minute');
        else if (abs < 86400) rel = rtf.format(Math.trunc(diffSec / 3600), 'hour');
        else rel = rtf.format(Math.trunc(diffSec / 86400), 'day');
    }

    // Подпись тайм-зоны
    let tzLabel = '';
    if (opts.showTz !== false) {
        if (tz && tz !== 'UTC') {
            tzLabel = ` (${tz})`;
        } else if (tz === 'UTC') {
            tzLabel = ' (UTC)';
        } else {
            const offMin = -d.getTimezoneOffset();
            const sign = offMin >= 0 ? '+' : '-';
            const hh = String(Math.floor(Math.abs(offMin) / 60)).padStart(2, '0');
            const mm = String(Math.abs(offMin) % 60).padStart(2, '0');
            tzLabel = ` (UTC${sign}${hh}:${mm})`;
        }
    }

    return `${nice}`;
}
