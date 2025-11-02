/*
 * Copyright (c) LLC "Centr Distribyucii"
 * All rights reserved.
 */

'use client'
import React, {useEffect, useMemo, useState} from 'react'
import {Form, Button, Dropdown, InputGroup, Card, Col, Row, ListGroup} from 'react-bootstrap'
import {
    getCurrentWeekByDate, hhmmOrHmsToMinutes,
    normalizeRange,
    parseDayToDate,
    RU_DAYS,
    timeToMinutes,
    WEEK_DAYS
} from '@/app/lib/scheduleUtils'
import {useScheduleStore} from '@/app/store/scheduleStore'
import {motion, LayoutGroup, AnimatePresence} from 'framer-motion'
import {usePlaylistStore} from "@/app/store/playlistStore";
import {useScreensStore} from "@/app/store/screensStore";
import {WarningModal} from "@/app/components/Common/WarningModal";
import {useRouter} from "next/navigation";
import DatePicker from "react-datepicker";
import {ru} from 'date-fns/locale'
import WhenToShowCard from "@/app/components/Schedule/Settings/WhenToShowCard";
import TypeOfTimeSlot from "@/app/components/Schedule/Settings/ShowMode/TypeOfTimeSlot";
import HowToShowCard from "@/app/components/Schedule/Settings/ShowMode/HowToShowCard";
import WhatToShowCard from "@/app/components/Schedule/Settings/WhatToShowCard";
import WhereToShowCard from "@/app/components/Schedule/Settings/WhereToShowCard";
import SectionsSelection from "@/app/components/Schedule/Settings/ScreenSelection/SectionsSelectionCard";
import {ZoneIndex} from "@/public/types/interfaces";

export default function ScheduleSettingsPanel() {
    const {
        selectedDate,
        onDateSelected,
        isFixedSchedule,
        startTime,
        endTime,
        selectedDays,
        selectedScreens,
        scheduledFixedMap,
        scheduledCalendarMap,
        addBlock,
        priority,
        typeMode,
        advertisementShowMode,
        advertisementIntervalMinutes,
        advertisementIntervalHours,
        advertisementSpecificTimes,
        selectedGroup,
        setSelectedGroup,
        getZoneAssignments
    } = useScheduleStore()


    const {allScreens, groups} = useScreensStore()
    const {playlistItems} = usePlaylistStore()
    const [noScreensModal, setNoScreensModal] = useState(false)
    const [noPlaylistsModal, setNoPlaylistsModal] = useState(false)
    const [pendingTime, setPendingTime] = useState<string>('08:00')
    const [open, setOpen] = useState(true)
    const router = useRouter();

    useEffect(() => {
        onDateSelected(new Date())
    }, [onDateSelected])

    useEffect(() => {
        setOpen(true)
    }, [])

    const handleScreensToggle = (e: React.MouseEvent) => {
        if (allScreens.length === 0) {
            e.preventDefault()
            setNoScreensModal(true)
        }
    }

    const handlePlaylistToggle = (e: React.MouseEvent) => {
        if (playlistItems.length === 0) {
            e.preventDefault()
            setNoPlaylistsModal(true)
        }
    }

    const playlistById = useMemo(
        () => new Map(playlistItems.map(p => [p.id, p])),
        [playlistItems]
    );

    const getTargetScreens = () =>
        (selectedGroup
            ? allScreens.filter(s => s.groupId === selectedGroup).map(s => s.id)
            : selectedScreens);

    const isScreenZonesComplete = (screenId: string) => {
        const {count, zonePlaylists} = getZoneAssignments(screenId);
        for (let z = 0; z < count; z++) {
            if (!zonePlaylists[z as ZoneIndex]) return false;
        }
        return true;
    };

    const getScreenPlaylistIds = (screenId: string): string[] => {
        const {count, zonePlaylists} = getZoneAssignments(screenId);
        return Array.from({length: count}, (_, i) => zonePlaylists[i as ZoneIndex])
            .filter(Boolean) as string[];
    };

    const getScreenMaxDurationMin = (screenId: string): number => {
        const ids = getScreenPlaylistIds(screenId);
        let maxMin = 0;
        for (const id of ids) {
            const pl = playlistById.get(id);
            if (pl) {
                const mins = Math.ceil((pl.totalDurationSeconds || 0) / 60);
                if (mins > maxMin) maxMin = mins;
            }
        }
        return maxMin;
    };

    const targetScreens = getTargetScreens();
    const zonesOkForAllScreens = targetScreens.length > 0 && targetScreens.every(isScreenZonesComplete);


    const handleAdd = () => {
        // базовые проверки
        if (selectedScreens.length === 0 && !selectedGroup) {
            window.alert('Выберите хотя бы один экран');
            return;
        }
        if (selectedDays.length === 0) {
            window.alert('Выберите хотя бы один день');
            return;
        }

        const {start: rangeStart, end: rangeEnd} = normalizeRange(startTime, endTime);

        const screensToAdd = getTargetScreens();


        // проверка зон и сбор длительностей по экранам
        const maxDurationByScreen = new Map<string, number>();
        for (const sid of screensToAdd) {
            if (!isScreenZonesComplete(sid)) {
                const {count, zonePlaylists} = getZoneAssignments(sid);
                const name = allScreens.find(s => s.id === sid)?.name ?? sid;
                const missing = Array.from({length: count}, (_, i) => i as ZoneIndex)
                    .filter(z => !zonePlaylists[z])
                    .map(z => `Зона ${z + 1}`).join(', ');
                window.alert(`Экран «${name}» разделён на ${count} секции.\nНазначьте плейлисты для всех секций. Пустые: ${missing}.`);
                return;
            }
            const maxMin = getScreenMaxDurationMin(sid);
            // если показ разово или реклама — длительность должна быть > 0
            if ((typeMode === 'PLAYLIST' && startTime !== '00:00' && endTime !== '00:00') || typeMode === 'ADVERTISEMENT') {
                if (maxMin <= 0) {
                    const name = allScreens.find(s => s.id === sid)?.name ?? sid;
                    window.alert(`На экране «${name}» длительность плейлистов = 0 мин. Проверьте содержимое плейлистов.`);
                    return;
                }
            }
            maxDurationByScreen.set(sid, maxMin);
        }

        // спец-проверки для рекламы — интервалы против max длительности по экрану
        if (typeMode === 'ADVERTISEMENT') {
            for (const sid of screensToAdd) {
                const durationMin = maxDurationByScreen.get(sid)!;
                if (advertisementShowMode === 'minutes' && advertisementIntervalMinutes < durationMin) {
                    const name = allScreens.find(s => s.id === sid)?.name ?? sid;
                    window.alert(`На экране «${name}» интервал между показами (${advertisementIntervalMinutes} мин) меньше максимальной длительности выбранных плейлистов (${durationMin} мин).`);
                    return;
                }
                if (advertisementShowMode === 'hours' && advertisementIntervalHours * 60 < durationMin) {
                    const name = allScreens.find(s => s.id === sid)?.name ?? sid;
                    window.alert(`На экране «${name}» интервал между показами (${advertisementIntervalHours} ч) меньше максимальной длительности (${durationMin} мин).`);
                    return;
                }
            }
        }

        // проверки конфликтов для PLAYLIST
        if (typeMode === 'PLAYLIST') {
            for (const screenId of screensToAdd) {
                const existing = (isFixedSchedule ? scheduledFixedMap[screenId] ?? [] : scheduledCalendarMap[screenId] ?? []);
                for (const dayShort of selectedDays) {
                    const week = getCurrentWeekByDate(selectedDate);
                    const dateObj = parseDayToDate(dayShort, week);
                    const isoDate = dateObj.toISOString().slice(0, 10);
                    const dowKey = WEEK_DAYS[RU_DAYS.indexOf(dayShort)];

                    const conflict = existing.find(b => {
                        if (isFixedSchedule) {
                            if (b.dayOfWeek !== dowKey) return false;
                        } else {
                            if (b.startDate !== isoDate) return false;
                        }
                        const existStart = hhmmOrHmsToMinutes(b.startTime);
                        const existEnd = hhmmOrHmsToMinutes(b.endTime);
                        if (!(rangeStart < existEnd && existStart < rangeEnd)) return false;
                        if (b.priority !== priority) return false;
                        return true;
                    });

                    if (conflict) {
                        const name = allScreens.find(s => s.id === screenId)?.name ?? screenId;
                        window.alert(`На экране «${name}» уже есть слот с приоритетом ${priority} в ${dayShort} с ${conflict.startTime} до ${conflict.endTime}.`);
                        return;
                    }
                }
            }
        }

        // проверки конфликтов для ADVERTISEMENT
        if (typeMode === 'ADVERTISEMENT') {
            type Candidate = { screenId: string; date: string; start: number; end: number };
            const candidates: Candidate[] = [];

            for (const screenId of screensToAdd) {
                const durationMin = maxDurationByScreen.get(screenId)!;
                for (const dayShort of selectedDays) {
                    const week = getCurrentWeekByDate(selectedDate);
                    const dateObj = parseDayToDate(dayShort, week);
                    const isoDate = dateObj.toISOString().slice(0, 10);

                    if (advertisementShowMode === 'minutes') {
                        let cursor = rangeStart;
                        while (cursor + durationMin <= rangeEnd) {
                            candidates.push({screenId, date: isoDate, start: cursor, end: cursor + durationMin});
                            cursor += advertisementIntervalMinutes;
                        }
                    } else if (advertisementShowMode === 'hours') {
                        let cursor = rangeStart;
                        const step = advertisementIntervalHours * 60;
                        while (cursor + durationMin <= rangeEnd) {
                            candidates.push({screenId, date: isoDate, start: cursor, end: cursor + durationMin});
                            cursor += step;
                        }
                    } else {
                        advertisementSpecificTimes.forEach(hhmm => {
                            const m = hhmmOrHmsToMinutes(hhmm);
                            if (m >= rangeStart && m + durationMin <= rangeEnd) {
                                candidates.push({screenId, date: isoDate, start: m, end: m + durationMin});
                            }
                        });
                    }
                }
            }

            for (const {screenId, date, start, end} of candidates) {
                const existing = (isFixedSchedule ? scheduledFixedMap[screenId] ?? [] : scheduledCalendarMap[screenId] ?? [])
                    .filter(b => b.priority === 100);
                const conflict = existing.find(b => {
                    const sameDay = isFixedSchedule ? b.dayOfWeek === WEEK_DAYS[RU_DAYS.indexOf(date.slice(8, 10))] : b.startDate === date;
                    if (!sameDay) return false;
                    const existStart = timeToMinutes(b.startTime);
                    const existEnd = timeToMinutes(b.endTime);
                    return (start < existEnd && existStart < end);
                });
                if (conflict) {
                    const name = allScreens.find(s => s.id === screenId)?.name ?? screenId;
                    window.alert(`На экране «${name}» рекламный слот пересекается с ${conflict.startTime}–${conflict.endTime} в ${date}.`);
                    return;
                }
            }
        }


        // Всё чисто — добавляем
        addBlock(screensToAdd);
    };


    return (
        <>
            <LayoutGroup>
                <motion.div
                    layout
                    style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 16,
                        alignItems: 'center',
                        justifyContent: 'space-around',
                    }}
                >

                    {!isFixedSchedule && (
                        <motion.div layout>
                            <DatePicker
                                selected={selectedDate}
                                onChange={date => onDateSelected(date!)}
                                inline
                                dateFormat="dd.MM.yyyy"
                                locale={ru}
                            />
                        </motion.div>

                    )}

                    <motion.div layout>
                        <WhenToShowCard/>
                    </motion.div>


                    <motion.div layout>
                        <Card>
                            <TypeOfTimeSlot/>
                            <HowToShowCard/>
                        </Card>
                    </motion.div>
                    <motion.div layout>
                        <Card>
                            <Card.Header>Приоритет</Card.Header>
                            <Card.Body>

                                <WhatToShowCard onNoPlaylistsClick={handlePlaylistToggle}/>


                            </Card.Body>

                            <Card.Header className="border-top">Где показывать</Card.Header>
                            <Card.Body>
                                <div
                                    className="d-flex flex-column justify-content-lg-evenly align-content-center gap-3">

                                    <WhereToShowCard onNoScreensClick={handleScreensToggle}/>

                                    <div className="d-grid">
                                        <Button
                                            variant="success"
                                            onClick={handleAdd}
                                            disabled={targetScreens.length === 0 || selectedDays.length === 0 || !zonesOkForAllScreens}
                                            className="w-100"
                                        >
                                            Добавить
                                        </Button>
                                    </div>
                                </div>
                            </Card.Body>
                        </Card>
                    </motion.div>

                    <motion.div layout>

                        <SectionsSelection/>

                    </motion.div>


                </motion.div>
            </LayoutGroup>


            <WarningModal
                show={noScreensModal}
                title="Нет экранов"
                message="У вас ещё не добавлено ни одного экрана."
                buttonText="Перейти к экранам"
                onClose={() => {
                    setNoScreensModal(false)
                    router.push('/screens')
                }}
            />

            <WarningModal
                show={noPlaylistsModal}
                title="Нет плейлистов"
                message="У вас ещё нет созданных плейлистов."
                buttonText="Перейти к плейлистам"
                onClose={() => {
                    setNoPlaylistsModal(false)
                    router.push('/playlists')
                }}
            />
        </>
    )
}

