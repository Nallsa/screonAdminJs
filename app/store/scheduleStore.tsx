// app/store/scheduleStore.ts
'use client'

import {create} from 'zustand'
import {immer} from 'zustand/middleware/immer'
import {
    getCurrentWeekByDate,
    parseDayToDate,
    normalizeTime
} from '@/app/lib/scheduleUtils'
import {ScheduledBlock} from "@/public/types/interfaces";

interface ScheduleState {
    // state
    selectedDate: Date
    currentWeek: Date[]
    isFixedSchedule: boolean
    isPlayConstantly: boolean
    isShowBackground: boolean

    selectedPlaylist: string
    playlists: string[]
    startTime: string
    endTime: string
    selectedDays: string[]

    scheduledItemsFixed: ScheduledBlock[]
    scheduledItemsCalendar: ScheduledBlock[]
    hoveredBlock: ScheduledBlock | null

    // actions
    onDateSelected: (d: Date) => void
    toggleFixedSchedule: () => void
    togglePlayConstantly: () => void
    toggleShowBackground: () => void

    setSelectedPlaylist: (p: string) => void
    setStartTime: (t: string) => void
    setEndTime: (t: string) => void

    toggleDay: (day: string) => void
    addBlock: () => void
    removeBlock: (b: ScheduledBlock) => void

    setHoveredBlock: (b: ScheduledBlock | null) => void
}

export const useScheduleStore = create<ScheduleState>()(
    immer((set, get) => {
        const today = new Date()
        const zero = new Date(today.getFullYear(), today.getMonth(), today.getDate())
        return {
            selectedDate: zero,
            currentWeek: getCurrentWeekByDate(zero),
            isFixedSchedule: false,
            isPlayConstantly: true,
            isShowBackground: false,

            playlists: ["Плейлист 1", "Плейлист 2", "Плейлист 3"],
            selectedPlaylist: "Плейлист 1",
            startTime: "08:00",
            endTime: "18:00",
            selectedDays: [],

            scheduledItemsFixed: [],
            scheduledItemsCalendar: [],
            hoveredBlock: null,

            onDateSelected: (d) => set(s => {
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

            setSelectedPlaylist: p => set(s => {
                s.selectedPlaylist = p
            }),
            setStartTime: t => set(s => {
                s.startTime = normalizeTime(t)
            }),
            setEndTime: t => set(s => {
                s.endTime = normalizeTime(t)
            }),

            toggleDay: day => set(s => {
                const i = s.selectedDays.indexOf(day)
                if (i >= 0) s.selectedDays.splice(i, 1)
                else s.selectedDays.push(day)
            }),

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

            removeBlock: b => {
                set(s => {
                    const arr = s.isFixedSchedule
                        ? s.scheduledItemsFixed
                        : s.scheduledItemsCalendar
                    const idx = arr.findIndex(x =>
                        x.day === b.day && x.start === b.start &&
                        x.end === b.end && x.playlist === b.playlist
                    )
                    if (idx >= 0) arr.splice(idx, 1)
                })
            },

            setHoveredBlock: b => set(s => {
                s.hoveredBlock = b
            }),
        }
    })
)
