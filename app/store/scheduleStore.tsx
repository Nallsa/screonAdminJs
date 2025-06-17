'use client'

import {create} from 'zustand'
import {immer} from 'zustand/middleware/immer'
import {
    getCurrentWeekByDate,
    parseDayToDate,
    normalizeTime
} from '@/app/lib/scheduleUtils'
import {PlaylistItem, ScheduledBlock, ScreenData} from "@/public/types/interfaces";

type ShowMode = 'cycle' | 'interval'

interface ScheduleState {
    // --- Основные параметры расписания ---
    selectedDate: Date
    currentWeek: Date[]
    isFixedSchedule: boolean
    isPlayConstantly: boolean
    isShowBackground: boolean

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
    togglePlayConstantly: () => void
    toggleShowBackground: () => void

    setStartTime: (t: string) => void
    setEndTime: (t: string) => void
}

export const useScheduleStore = create<ScheduleState>()(
    immer((set, get) => {
        const today = new Date()
        const zero = new Date(today.getFullYear(), today.getMonth(), today.getDate())

        return {
            // Основные параметры расписания
            selectedDate: zero,
            currentWeek: getCurrentWeekByDate(zero),
            isFixedSchedule: false,
            isPlayConstantly: true,
            isShowBackground: false,

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
            scheduledItemsFixed: [],
            scheduledItemsCalendar: [],
            addBlock: () => {
                const {
                    selectedDays, currentWeek,
                    startTime, endTime,
                    selectedPlaylist, isFixedSchedule
                } = get()
                if (!selectedDays.length) return

                selectedDays.forEach(dayShort => {
                    const dayDate = parseDayToDate(dayShort, currentWeek)
                    const block: ScheduledBlock = {
                        day: dayDate.toISOString().slice(0, 10),
                        start: normalizeTime(startTime),
                        end: normalizeTime(endTime),
                        playlist: selectedPlaylist
                    }
                    set(s => {
                        if (isFixedSchedule) s.scheduledItemsFixed.push(block)
                        else s.scheduledItemsCalendar.push(block)
                    })
                })
            },
            removeBlock: b => set(s => {
                const arr = s.isFixedSchedule
                    ? s.scheduledItemsFixed
                    : s.scheduledItemsCalendar
                const idx = arr.findIndex(x =>
                    x.day === b.day &&
                    x.start === b.start &&
                    x.end === b.end &&
                    x.playlist === b.playlist
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
            togglePlayConstantly: () => set(s => {
                s.isPlayConstantly = !s.isPlayConstantly
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