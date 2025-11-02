/*
 * Copyright (c) LLC "Centr Distribyucii"
 * All rights reserved.
 */

import React from "react";
import {useScheduleStore} from "@/app/store/scheduleStore";
import {usePlaylistStore} from "@/app/store/playlistStore";

const DAYS_OF_WEEK = [
    "SUNDAY",
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
] as const;

function useMinuteTickKey() {
    const [minuteTickKey, setMinuteTickKey] = React.useState(
        () => Math.floor(Date.now() / 60_000)
    );

    React.useEffect(() => {
        const intervalId = setInterval(
            () => setMinuteTickKey(Math.floor(Date.now() / 60_000)),
            60_000
        );
        return () => clearInterval(intervalId);
    }, []);

    return minuteTickKey;
}

const hhmmssToMinutes = (hhmmss: string) => {
    const [hours, minutes] = hhmmss.split(":").map(Number);
    return (hours || 0) * 60 + (minutes || 0);
};

export function useCurrentPlayingPlaylist(screenId: string) {
    const scheduledCalendarMap = useScheduleStore((s) => s.scheduledCalendarMap);
    const playlistItems = usePlaylistStore((s) => s.playlistItems);
    const minuteTickKey = useMinuteTickKey();

    return React.useMemo(() => {
        const nowDate = new Date();
        const nowTotalMinutes = nowDate.getHours() * 60 + nowDate.getMinutes();
        const todayIsoDate = `${nowDate.getFullYear()}-${String(
            nowDate.getMonth() + 1
        ).padStart(2, "0")}-${String(nowDate.getDate()).padStart(2, "0")}`;


        const isNowWithinRange = (startTime: string, endTime: string) => {
            const startMinutes = hhmmssToMinutes(startTime);
            const endMinutes = hhmmssToMinutes(endTime);
            return endMinutes < startMinutes
                ? nowTotalMinutes >= startMinutes || nowTotalMinutes < endMinutes
                : nowTotalMinutes >= startMinutes && nowTotalMinutes < endMinutes;
        };

        type Candidate = {
            playlistId: string;
            priority: number;
            startTime: string;
        };

        const candidates: Candidate[] = [];

        (scheduledCalendarMap[screenId] ?? []).forEach((block) => {
            if (
                block.startDate === todayIsoDate &&
                isNowWithinRange(block.startTime, block.endTime)
            ) {
                if (block.playlistIds && block.playlistIds[0]) {
                    candidates.push({
                        playlistId: block.playlistIds[0],
                        priority: block.priority ?? 1,
                        startTime: block.startTime,
                    });
                }
            }
        });

        if (!candidates.length) return null;

        candidates.sort(
            (left, right) =>
                right.priority - left.priority ||
                hhmmssToMinutes(left.startTime) - hhmmssToMinutes(right.startTime)
        );

        const currentPlaylist =
            playlistItems.find((p) => p.id === candidates[0].playlistId) || null;

        return currentPlaylist;
    }, [scheduledCalendarMap, playlistItems, screenId, minuteTickKey]);
}