import React from "react";
import {useScheduleStore} from "@/app/store/scheduleStore";
import {usePlaylistStore} from "@/app/store/playlistStore";

const DOW = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] as const;

function useMinuteKey() {
    const [k, setK] = React.useState(() => Math.floor(Date.now() / 60000));
    React.useEffect(() => {
        const id = setInterval(() => setK(Math.floor(Date.now() / 60000)), 60_000);
        return () => clearInterval(id);
    }, []);
    return k;
}

const toMin = (hhmmss: string) => {
    const [hh, mm] = hhmmss.split(':').map(Number);
    return (hh || 0) * 60 + (mm || 0);
};

export function useCurrentPlayingPlaylist(screenId: string) {
    const scheduledFixedMap = useScheduleStore(s => s.scheduledFixedMap);
    const scheduledCalendarMap = useScheduleStore(s => s.scheduledCalendarMap);
    const playlists = usePlaylistStore(s => s.playlistItems);
    const minuteKey = useMinuteKey();

    return React.useMemo(() => {
        const now = new Date();
        const nowM = now.getHours() * 60 + now.getMinutes();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const dow = DOW[now.getDay()];

        const inRange = (a: string, b: string) => {
            const s = toMin(a), e = toMin(b);
            return e < s ? (nowM >= s || nowM < e) : (nowM >= s && nowM < e);
        };

        const cand: Array<{ playlistId: string; priority: number; startTime: string }> = [];

        (scheduledCalendarMap[screenId] ?? []).forEach(b => {
            if (b.startDate === today && inRange(b.startTime, b.endTime)) {
                cand.push({playlistId: b.playlistId, priority: b.priority ?? 1, startTime: b.startTime});
            }
        });
        (scheduledFixedMap[screenId] ?? []).forEach(b => {
            if (b.dayOfWeek === dow && inRange(b.startTime, b.endTime)) {
                cand.push({playlistId: b.playlistId, priority: b.priority ?? 1, startTime: b.startTime});
            }
        });

        if (!cand.length) return null;

        cand.sort((x, y) => (y.priority - x.priority) || (toMin(x.startTime) - toMin(y.startTime)));
        const pl = playlists.find(p => p.id === cand[0].playlistId) || null;
        return pl;
    }, [scheduledFixedMap, scheduledCalendarMap, playlists, screenId, minuteKey]);
}