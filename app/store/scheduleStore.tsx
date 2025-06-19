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
type ByScreen<T> = Record<string, T[]>

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
    scheduledFixedMap: ByScreen<ScheduledBlock>
    scheduledCalendarMap: ByScreen<ScheduledBlock>
    addBlock: () => void
    removeBlock: (screenId: string, b: ScheduledBlock) => void

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
            scheduledFixedMap: {},
            scheduledCalendarMap: {},
            selectedDate: zero,
            currentWeek: getCurrentWeekByDate(zero),
            isFixedSchedule: false,
            isRecurring: true,
            isShowBackground: false,
            priority: 1,

            hoveredBlock: null as ScheduledBlock | null,
            setHoveredBlock: (b: ScheduledBlock | null) => set(s => {
                s.hoveredBlock = b
            }),


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

            // Блоки расписания
            addBlock: () => {
                const {
                    selectedScreens,
                    currentWeek,
                    startTime,
                    endTime,
                    selectedPlaylist,
                    isFixedSchedule,
                } = get()
                if (!selectedScreens.length) return

                selectedScreens.forEach(screenId => {
                    // инициализируем, если ещё нет
                    const mapKey = isFixedSchedule ? 'scheduledFixedMap' : 'scheduledCalendarMap'
                    set(s => {
                        if (!(s as any)[mapKey][screenId]) {
                            (s as any)[mapKey][screenId] = []
                        }
                    })

                    // для каждого выбранного дня
                    get().selectedDays.forEach(dayShort => {
                        const dateObj = parseDayToDate(dayShort, currentWeek)
                        const isoDate = dateObj.toISOString().slice(0, 10)
                        const ruIndex = RU_DAYS.indexOf(dayShort)
                        const dow = WEEK_DAYS[ruIndex]

                        const b: ScheduledBlock = {
                            dayOfWeek: dow,
                            startDate: isFixedSchedule ? null : isoDate,
                            endDate: isFixedSchedule ? null : isoDate,
                            startTime: normalizeTime(startTime) + ':00',
                            endTime: normalizeTime(endTime) + ':00',
                            playlistId: selectedPlaylist,
                        }

                        set(s => {
                            ;(s as any)[mapKey][screenId].push(b)
                        })
                    })
                })
            },

            removeBlock: (screenId, block) => {
                const mapKey = get().isFixedSchedule ? 'scheduledFixedMap' : 'scheduledCalendarMap'
                set(s => {
                    const arr = (s as any)[mapKey][screenId] || []
                    const idx = arr.findIndex((b: ScheduledBlock) =>
                        b.dayOfWeek === block.dayOfWeek &&
                        b.startTime === block.startTime &&
                        b.endTime === block.endTime &&
                        b.playlistId === block.playlistId
                    )
                    if (idx >= 0) arr.splice(idx, 1)
                })
            },


            sendSchedule: async () => {
                const {
                    selectedScreens,
                    isFixedSchedule,
                    isRecurring,
                    priority,
                    selectedDate,
                    scheduledFixedMap,
                    scheduledCalendarMap
                } = get()

                const SERVER = process.env.NEXT_PUBLIC_SERVER_URL
                const token = typeof window !== 'undefined'
                    ? localStorage.getItem('accessToken')
                    : null

                // выбираем нужную мапу
                const map = isFixedSchedule
                    ? scheduledFixedMap
                    : scheduledCalendarMap

                // собираем все слоты по выбранным экранам
                const allSlots = selectedScreens.flatMap(id => map[id] ?? [])

                // дедуплицируем по всем полям
                const uniqueSlots = Array.from(
                    new Map(
                        allSlots.map(b => [
                            `${b.dayOfWeek}|${b.startDate}|${b.startTime}|${b.endTime}|${b.playlistId}`,
                            b
                        ])
                    ).values()
                )

                const payload = {
                    screenIds: selectedScreens,
                    groupIds: [] as string[],
                    startDate: isFixedSchedule
                        ? null
                        : selectedDate.toISOString().slice(0, 10),
                    endDate: null,
                    isRecurring,
                    priority,
                    timeSlots: uniqueSlots
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

            /////////////////////////////////////////////////////////

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
        }
    })
)