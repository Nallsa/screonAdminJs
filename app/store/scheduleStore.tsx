'use client'

import {create} from 'zustand'
import {immer} from 'zustand/middleware/immer'
import {
    getCurrentWeekByDate,
    parseDayToDate,
    normalizeTime, RU_DAYS, WEEK_DAYS
} from '@/app/lib/scheduleUtils'
import {PlaylistItem, ScheduledBlock, ScreenData} from "@/public/types/interfaces";
import axios from "axios";

type ShowMode = 'cycle' | 'interval'

interface ScheduleState {
    // --- Основные параметры расписания ---
    selectedDate: Date
    currentWeek: Date[]
    isFixedSchedule: boolean
    isRecurring: boolean
    isShowBackground: boolean

    // — приоритет (если понадобится) —
    priority: number
    setPriority: (p: number) => void

    // --- Выбор экранов ---
    selectedScreens: string[]
    toggleScreen: (screenId: string) => void

    // --- Выбор плейлиста ---
    selectedPlaylist: string
    setSelectedPlaylist: (plId: string) => void

    // --- Временные рамки и дни ---
    startTime: string
    endTime: string
    selectedDays: string[]
    toggleDay: (day: string) => void

    // --- Как показывать ---
    showMode: ShowMode
    cycleMinutes: number
    pauseMinutes: number
    intervalMinutes: number
    setShowMode: (m: ShowMode) => void
    setCycleMinutes: (m: number) => void
    setPauseMinutes: (m: number) => void
    setIntervalMinutes: (m: number) => void

    // --- Ограничения ---
    maxPerDay: number
    maxPerHour: number
    maxTotalDuration: number
    setMaxPerDay: (n: number) => void
    setMaxPerHour: (n: number) => void
    setMaxTotalDuration: (n: number) => void

    // --- Блоки расписания ---
    scheduledItemsFixed: ScheduledBlock[]
    scheduledItemsCalendar: ScheduledBlock[]
    addBlock: () => void
    removeBlock: (b: ScheduledBlock) => void

    // --- Ховер для блока в таблице ---
    hoveredBlock: ScheduledBlock | null
    setHoveredBlock: (b: ScheduledBlock | null) => void

    // --- Прочие экшены (дата, фиксированный режим, фон) ---
    onDateSelected: (d: Date) => void
    toggleFixedSchedule: () => void
    togglePlayRecurring: () => void
    toggleShowBackground: () => void

    setStartTime: (t: string) => void
    setEndTime: (t: string) => void

    sendSchedule: () => Promise<void>
}

export const useScheduleStore = create<ScheduleState>()(
    immer((set, get) => {
        const today = new Date()
        const zero = new Date(today.getFullYear(), today.getMonth(), today.getDate())

        return {
            // Основные параметры расписания
            scheduledItemsFixed: [],
            scheduledItemsCalendar: [],
            selectedDate: zero,
            currentWeek: getCurrentWeekByDate(zero),
            isFixedSchedule: false,
            isRecurring: true,
            isShowBackground: false,
            priority: 1,


            sendSchedule: async () => {
                const {
                    selectedScreens,
                    isFixedSchedule,
                    isRecurring,
                    priority,
                    selectedDate,
                    scheduledItemsFixed,
                    scheduledItemsCalendar
                } = get()

                const SERVER = process.env.NEXT_PUBLIC_SERVER_URL
                const token = typeof window !== 'undefined'
                    ? localStorage.getItem('accessToken')
                    : null


                const source = isFixedSchedule
                    ? scheduledItemsFixed
                    : scheduledItemsCalendar


                const timeSlots = source.map(b => ({
                    dayOfWeek: b.dayOfWeek,
                    startDate: b.startDate,
                    endDate: b.endDate,
                    startTime: b.startTime,
                    endTime: b.endTime,
                    playlistId: b.playlistId
                }))

                const payload = {
                    screenIds: selectedScreens,
                    groupIds: [] as string[],
                    startDate: isFixedSchedule
                        ? null
                        : selectedDate.toISOString().slice(0, 10),
                    endDate: null,
                    isRecurring,
                    priority,
                    timeSlots
                }

                try {
                    const res = await axios.post(
                        `${SERVER}schedule`,
                        payload,
                        {headers: {Authorization: `Bearer ${token}`}}
                    )
                    console.log('Schedule saved:', res.data)
                } catch (e: any) {
                    console.error('Error save schedule:', e.response?.data || e.message)
                }
            },


            // Выбор экранов
            selectedScreens: [],
            toggleScreen: id => set(s => {
                const idx = s.selectedScreens.indexOf(id)
                if (idx >= 0) s.selectedScreens.splice(idx, 1)
                else s.selectedScreens.push(id)
            }),

            // Выбор плейлиста
            selectedPlaylist: '',
            setSelectedPlaylist: plId => set(s => {
                s.selectedPlaylist = plId
            }),

            // Временные рамки и дни
            startTime: '08:00',
            endTime: '18:00',
            selectedDays: [],
            toggleDay: day => set(s => {
                const idx = s.selectedDays.indexOf(day)
                if (idx >= 0) s.selectedDays.splice(idx, 1)
                else s.selectedDays.push(day)
            }),

            // Как показывать
            showMode: 'cycle',
            cycleMinutes: 10,
            pauseMinutes: 50,
            intervalMinutes: 60,
            setShowMode: m => set(s => {
                s.showMode = m
            }),
            setCycleMinutes: m => set(s => {
                s.cycleMinutes = m
            }),
            setPauseMinutes: m => set(s => {
                s.pauseMinutes = m
            }),
            setIntervalMinutes: m => set(s => {
                s.intervalMinutes = m
            }),

            // Ограничения
            maxPerDay: 0,
            maxPerHour: 0,
            maxTotalDuration: 0,
            setMaxPerDay: n => set(s => {
                s.maxPerDay = n
            }),
            setMaxPerHour: n => set(s => {
                s.maxPerHour = n
            }),
            setMaxTotalDuration: n => set(s => {
                s.maxTotalDuration = n
            }),

            // Блоки расписания

            addBlock: () => {
                const {
                    selectedDays,
                    currentWeek,
                    startTime,
                    endTime,
                    selectedPlaylist,
                    isFixedSchedule
                } = get();
                if (!selectedDays.length) return;

                selectedDays.forEach(dayShort => {
                    const dateObj = parseDayToDate(dayShort, currentWeek);
                    const isoDate = dateObj.toISOString().slice(0, 10);

                    // находим порядковый номер дня в RU_DAYS
                    const ruIndex = RU_DAYS.indexOf(dayShort);
                    // для фиксированного берём из WEEK_DAYS по этому индексу
                    const dow = isFixedSchedule
                        ? WEEK_DAYS[ruIndex]
                        : WEEK_DAYS[dateObj.getDay() === 0 ? 6 : dateObj.getDay() - 1];

                    const block: ScheduledBlock = {
                        dayOfWeek: dow,
                        startDate: isFixedSchedule ? null : isoDate,
                        endDate: isFixedSchedule ? null : isoDate,
                        startTime: normalizeTime(startTime) + ':00',
                        endTime: normalizeTime(endTime) + ':00',
                        playlistId: selectedPlaylist
                    };

                    set(s => {
                        if (isFixedSchedule)
                            s.scheduledItemsFixed.push(block);
                        else
                            s.scheduledItemsCalendar.push(block);
                    });
                });
            },


            removeBlock: b => set(s => {
                const arr = s.isFixedSchedule
                    ? s.scheduledItemsFixed
                    : s.scheduledItemsCalendar

                const idx = arr.findIndex(x =>
                    x.dayOfWeek === b.dayOfWeek &&
                    x.startTime === b.startTime &&
                    x.endTime === b.endTime &&
                    x.playlistId === b.playlistId
                )
                if (idx >= 0) arr.splice(idx, 1)
            }),

            // Ховер для блока в таблице
            hoveredBlock: null,
            setHoveredBlock: b => set(s => {
                s.hoveredBlock = b
            }),

            //  Прочие экшены
            onDateSelected: d => set(s => {
                s.selectedDate = d
                s.currentWeek = getCurrentWeekByDate(d)
            }),
            toggleFixedSchedule: () => set(s => {
                s.isFixedSchedule = !s.isFixedSchedule
            }),
            togglePlayRecurring: () => set(s => {
                s.isRecurring = !s.isRecurring
            }),
            toggleShowBackground: () => set(s => {
                s.isShowBackground = !s.isShowBackground
            }),

            setStartTime: t => set(s => {
                s.startTime = normalizeTime(t)
            }),
            setEndTime: t => set(s => {
                s.endTime = normalizeTime(t)
            }),
        }
    })
)