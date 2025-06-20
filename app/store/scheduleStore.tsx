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
    scheduleId: string | null

    // --- Блоки расписания ---
    scheduledFixedMap: ByScreen<ScheduledBlock>
    scheduledCalendarMap: ByScreen<ScheduledBlock>
    addBlock: () => void
    removeBlock: (screenId: string, b: ScheduledBlock) => void

    // — приоритет
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

    // --- Ховер для блока в таблице ---
    hoveredBlock: ScheduledBlock | null
    setHoveredBlock: (b: ScheduledBlock | null) => void

    // --- Как показывать ---
    isShowBackground: boolean
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


    // --- Прочие экшены (дата, фиксированный режим, фон) ---
    onDateSelected: (d: Date) => void
    toggleFixedSchedule: () => void
    togglePlayRecurring: () => void
    toggleShowBackground: () => void

    setStartTime: (t: string) => void
    setEndTime: (t: string) => void

    sendSchedule: () => Promise<void>
    getSchedule: (id: string) => Promise<void>
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
            scheduleId: null,

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
                    scheduledFixedMap,
                    scheduledCalendarMap,
                    scheduleId
                } = get()

                const SERVER = process.env.NEXT_PUBLIC_SERVER_URL
                const token = typeof window !== 'undefined'
                    ? localStorage.getItem('accessToken')
                    : null

                // Выбираем ту мапу, где лежат слоты
                const map = isFixedSchedule
                    ? scheduledFixedMap
                    : scheduledCalendarMap

                const fixedSlots = selectedScreens.flatMap(screenId =>
                    (scheduledFixedMap[screenId] ?? []).map(b => ({
                        dayOfWeek: b.dayOfWeek,
                        startDate: null,
                        endDate: null,
                        startTime: b.startTime.slice(0, 5),
                        endTime: b.endTime.slice(0, 5),
                        playlistId: b.playlistId,
                        screenId
                    }))
                )
                const calendarSlots = selectedScreens.flatMap(screenId =>
                    (scheduledCalendarMap[screenId] ?? []).map(b => ({
                        dayOfWeek: b.dayOfWeek,
                        startDate: b.startDate!,
                        endDate: b.endDate!,
                        startTime: b.startTime.slice(0, 5),
                        endTime: b.endTime.slice(0, 5),
                        playlistId: b.playlistId,
                        screenId
                    }))
                )

                const allSlots = [...fixedSlots, ...calendarSlots]


                const uniqueSlots = Array.from(
                    new Map(
                        allSlots.map(s => [
                            `${s.screenId}|${s.dayOfWeek}|${s.startDate}|${s.startTime}|${s.endTime}|${s.playlistId}`,
                            s
                        ])
                    ).values()
                )

                //тело
                const payload = {
                    startDate: null,
                    // isFixedSchedule ? null : selectedDate.toISOString().slice(0, 10),
                    endDate: null,
                    // isFixedSchedule ? null : selectedDate.toISOString().slice(0, 10),
                    isRecurring,
                    priority,
                    timeSlots: uniqueSlots
                }

                try {
                    if (scheduleId) {
                        const res = await axios.put(
                            `${SERVER}schedule/${scheduleId}`,
                            {id: scheduleId, ...payload},
                            {headers: {Authorization: `Bearer ${token}`}}
                        )
                        console.log('Schedule updated:', res.data)

                    } else {
                        const res = await axios.post(
                            `${SERVER}schedule`,
                            payload,
                            {headers: {Authorization: `Bearer ${token}`}}
                        )
                        set(s => {
                            s.scheduleId = res.data.id
                        })
                        console.log('Schedule added:', res.data)
                    }
                } catch (e: any) {
                    console.error('Error save schedule:', e.response?.data || e.message)
                }
            },


            getSchedule: async (scheduleId: string) => {
                const SERVER = process.env.NEXT_PUBLIC_SERVER_URL
                const token = typeof window !== 'undefined'
                    ? localStorage.getItem('accessToken')
                    : null


                const {data} = await axios.get<{
                    id: string
                    startDate: string
                    endDate: string
                    priority: number
                    recurring: boolean
                    timeSlots: Array<{
                        dayOfWeek: ScheduledBlock['dayOfWeek']
                        startDate: string | null
                        endDate: string | null
                        startTime: string  // "HH:MM:SS"
                        endTime: string    // "HH:MM:SS"
                        playlistId: string
                        screenId: string
                    }>
                }>(
                    `${SERVER}schedule/${scheduleId}`,
                    {headers: {Authorization: `Bearer ${token}`}}
                )

                console.log(`Received schedule`, data)

                // Очистим старые карты
                set(s => {
                    s.scheduledFixedMap = {}
                    s.scheduledCalendarMap = {}
                })

                // Соберём уникальные screenId
                const screens = new Set<string>()
                data.timeSlots.forEach(slot => {
                    screens.add(slot.screenId)
                    const mapKey = slot.startDate === null
                        ? 'scheduledFixedMap'
                        : 'scheduledCalendarMap'

                    set(s => {
                        if (!(s as any)[mapKey][slot.screenId]) {
                            (s as any)[mapKey][slot.screenId] = []
                        }
                        // Добавляем слот в карту
                        ;(s as any)[mapKey][slot.screenId].push({
                            dayOfWeek: slot.dayOfWeek,
                            startDate: slot.startDate,
                            endDate: slot.endDate,
                            startTime: slot.startTime,
                            endTime: slot.endTime,
                            playlistId: slot.playlistId
                        } as ScheduledBlock)
                    })
                })

                // Устанавливаем остальное состояние
                set(s => {
                    s.scheduleId = data.id
                    s.selectedScreens = Array.from(screens)
                    s.isRecurring = data.recurring
                    s.priority = data.priority
                })
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