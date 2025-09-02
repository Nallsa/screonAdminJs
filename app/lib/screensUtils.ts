// хэлперы для модалки статуса
export const fmtPct = (n?: number) => (n == null ? '—' : `${n.toFixed(1)} %`);
export const fmtC = (n?: number) => (n == null ? '—' : `${n.toFixed(1)} °C`);
export const fmtVer = (s?: string) => s ?? '—';


export function formatLastSeen(iso?: string, locale = navigator.language): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;

    const dtf = new Intl.DateTimeFormat(locale, {
        dateStyle: 'medium',
        timeStyle: 'medium',
    });
    const nice = dtf.format(d);

    // относительное время
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
    } else {
        rel = abs < 60 ? `${abs} с назад`
            : abs < 3600 ? `${Math.trunc(abs / 60)} мин назад`
                : abs < 86400 ? `${Math.trunc(abs / 3600)} ч назад`
                    : `${Math.trunc(abs / 86400)} дн назад`;
    }

    // таймзона пользователя (UTC±hh:mm)
    const tzOffsetMin = -d.getTimezoneOffset();
    const sign = tzOffsetMin >= 0 ? '+' : '-';
    const hh = String(Math.floor(Math.abs(tzOffsetMin) / 60)).padStart(2, '0');
    const mm = String(Math.abs(tzOffsetMin) % 60).padStart(2, '0');


    return `${nice} (UTC${sign}${hh}:${mm})`;
}