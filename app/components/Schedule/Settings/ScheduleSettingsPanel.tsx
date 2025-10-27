/*
 * Copyright (c) LLC "Centr Distribyucii"
 * All rights reserved.
 */

'use client'
import React, {useEffect, useState} from 'react'
import {Form, Button, Dropdown, InputGroup, Card, Col, Row, ListGroup} from 'react-bootstrap'
import {getCurrentWeekByDate, parseDayToDate, RU_DAYS, timeToMinutes, WEEK_DAYS} from '@/app/lib/scheduleUtils'
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
import ScreenSelection from "@/app/components/Schedule/Settings/ScreenSelection/ScreenSelection";

export default function ScheduleSettingsPanel() {
    const {
        selectedDate,
        onDateSelected,
        isRecurring,
        togglePlayRecurring,
        isFixedSchedule,
        toggleFixedSchedule,
        setSelectedPlaylist,
        startTime,
        endTime,
        setStartTime,
        setEndTime,
        selectedDays,
        toggleDay,
        selectedScreens,
        toggleScreen,
        scheduledFixedMap,
        scheduledCalendarMap,
        addBlock,
        priority,
        setPriority,
        showMode,
        setShowMode,
        typeMode,
        setTypeMode,
        // рекламные:
        advertisementShowMode,
        setAdvertisementShowMode,
        advertisementIntervalMinutes,
        setAdvertisementIntervalMinutes,
        advertisementIntervalHours,
        setAdvertisementIntervalHours,
        advertisementSpecificTimes,
        addAdvertisementSpecificTime,
        removeAdvertisementSpecificTime,
        selectedGroup,
        setSelectedGroup
    } = useScheduleStore()

    const selectedPlaylist = useScheduleStore(s => s.selectedPlaylist)

    useEffect(() => {
        console.log(selectedPlaylist)

    }, [selectedPlaylist])

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
        setOpen(true) // показываем сразу после маунта
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


    const handleAdd = () => {
        // Базовые проверки
        if (!selectedPlaylist) {
            window.alert('Выберите, пожалуйста, плейлист');
            return;
        }
        if (selectedScreens.length === 0 && !selectedGroup) {
            window.alert('Выберите хотя бы один экран');
            return;
        }
        if (selectedDays.length === 0) {
            window.alert('Выберите хотя бы один день');
            return;
        }

        if (typeMode === 'ADVERTISEMENT') {
            const playlist = playlistItems.find(p => p.id === selectedPlaylist)!
            const durationMin = Math.ceil(playlist.totalDurationSeconds / 60)

            if (advertisementShowMode === 'minutes' && advertisementIntervalMinutes < durationMin) {
                window.alert(
                    `Интервал между показами ( ${advertisementIntervalMinutes} мин ) меньше общей длительности плейлиста ( ${durationMin} мин ).`
                )
                return
            }
            if (advertisementShowMode === 'hours' && advertisementIntervalHours * 60 < durationMin) {
                window.alert(
                    `Интервал между показами ( ${advertisementIntervalHours} ч = ${advertisementIntervalHours * 60} мин ) меньше общей длительности плейлиста ( ${durationMin} мин ).`
                )
                return
            }
        }

        const newStart = timeToMinutes(startTime);
        const newEnd = timeToMinutes(endTime);

        const screensToAdd = selectedGroup
            ? allScreens
                .filter(s => s.groupId === selectedGroup)
                .map(s => s.id)
            : selectedScreens;

        if (screensToAdd.length === 0) {
            window.alert('В группе нет экранов');
            return;
        }

        // Проверяем конфликты для обычных (PLAYLIST) слотов
        if (typeMode === 'PLAYLIST') {
            for (const screenId of screensToAdd) {
                const existing = (isFixedSchedule
                        ? scheduledFixedMap[screenId] ?? []
                        : scheduledCalendarMap[screenId] ?? []
                );

                for (const dayShort of selectedDays) {
                    const week = getCurrentWeekByDate(selectedDate);
                    const dateObj = parseDayToDate(dayShort, week);
                    const isoDate = dateObj.toISOString().slice(0, 10);
                    const dowKey = WEEK_DAYS[RU_DAYS.indexOf(dayShort)];

                    const conflict = existing.find(b => {
                        // Совпадение дня/даты
                        if (isFixedSchedule) {
                            if (b.dayOfWeek !== dowKey) return false;
                        } else {
                            if (b.startDate !== isoDate) return false;
                        }
                        // Пересечение по времени
                        const existStart = timeToMinutes(b.startTime);
                        const existEnd = timeToMinutes(b.endTime);
                        if (!(newStart < existEnd && existStart < newEnd)) return false;
                        // Совпадение приоритета
                        if (b.priority !== priority) return false;

                        return true;
                    });

                    if (conflict) {
                        const name = allScreens.find(s => s.id === screenId)?.name ?? screenId;
                        window.alert(
                            `На экране «${name}» уже есть слот с приоритетом ${priority} ` +
                            `в ${dayShort} с ${conflict.startTime} до ${conflict.endTime}.`
                        );
                        return;
                    }
                }
            }
        }

        // Проверяем конфликты для рекламных (ADVERTISEMENT) слотов
        if (typeMode === 'ADVERTISEMENT') {
            const playlist = playlistItems.find(p => p.id === selectedPlaylist)!

            type Candidate = { screenId: string; date: string; start: number; end: number };
            const durationMin = Math.ceil(playlist.totalDurationSeconds / 60)
            const candidates: Candidate[] = [];

            // Сбор «кандидатов» по выбранным экранам, дням и режиму рекламы
            for (const screenId of screensToAdd) {
                for (const dayShort of selectedDays) {
                    const week = getCurrentWeekByDate(selectedDate);
                    const dateObj = parseDayToDate(dayShort, week);
                    const isoDate = dateObj.toISOString().slice(0, 10);

                    if (advertisementShowMode === 'minutes') {
                        let cursor = newStart;
                        while (cursor + durationMin <= newEnd) {
                            candidates.push({screenId, date: isoDate, start: cursor, end: cursor + durationMin});
                            cursor += advertisementIntervalMinutes;
                        }
                    } else if (advertisementShowMode === 'hours') {
                        let cursor = newStart;
                        const step = advertisementIntervalHours * 60;
                        while (cursor + durationMin <= newEnd) {
                            candidates.push({screenId, date: isoDate, start: cursor, end: cursor + durationMin});
                            cursor += step;
                        }
                    } else {
                        // specific times
                        advertisementSpecificTimes.forEach(hhmm => {
                            const m = timeToMinutes(hhmm);
                            if (m >= newStart && m + durationMin <= newEnd) {
                                candidates.push({screenId, date: isoDate, start: m, end: m + durationMin});
                            }
                        });
                    }
                }
            }

            // Проверка каждого кандидата на пересечение с уже существующими рекламными слотами
            for (const {screenId, date, start, end} of candidates) {
                const existing = (isFixedSchedule
                        ? scheduledFixedMap[screenId] ?? []
                        : scheduledCalendarMap[screenId] ?? []
                ).filter(b => b.priority === 100);

                const conflict = existing.find(b => {
                    const sameDay = isFixedSchedule
                        ? b.dayOfWeek === WEEK_DAYS[RU_DAYS.indexOf(date.slice(8, 10))]
                        : b.startDate === date;
                    if (!sameDay) return false;
                    const existStart = timeToMinutes(b.startTime);
                    const existEnd = timeToMinutes(b.endTime);
                    return (start < existEnd && existStart < end);
                });

                if (conflict) {
                    const name = allScreens.find(s => s.id === screenId)?.name ?? screenId;
                    window.alert(
                        `На экране «${name}» рекламный слот пересекается с ` +
                        `${conflict.startTime}–${conflict.endTime} в ${date}.`
                    );
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
                            <Card.Header>Что показывать</Card.Header>
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
                                            disabled={(selectedScreens.length === 0 && !selectedGroup) || !selectedPlaylist}
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

                        <ScreenSelection/>

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

