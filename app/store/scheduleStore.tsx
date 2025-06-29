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
import {SERVER_URL} from "@/app/API/api";
import {getValueInStorage} from "@/app/API/localStorage";


// типы
type ShowMode = 'cycle' | 'interval'
type ByScreen<T> = Record<string, T[]>

interface ScheduleState {
    selectedDate: Date
    currentWeek: Date[]
    isFixedSchedule: boolean
    isRecurring: boolean
    scheduleId: string | null

    scheduledFixedMap: ByScreen<ScheduledBlock>
    scheduledCalendarMap: ByScreen<ScheduledBlock>
    addBlock: () => void
    removeBlock: (screenId: string, b: ScheduledBlock) => void

    priority: number
    setPriority: (p: number) => void

    selectedScreens: string[]
    toggleScreen: (screenId: string) => void

    selectedPlaylist: string
    setSelectedPlaylist: (plId: string) => void

    startTime: string
    endTime: string
    selectedDays: string[]
    toggleDay: (day: string) => void

    hoveredBlock: ScheduledBlock | null
    setHoveredBlock: (b: ScheduledBlock | null) => void

    isShowBackground: boolean
    showMode: ShowMode
    cycleMinutes: number
    pauseMinutes: number
    intervalMinutes: number
    setShowMode: (m: ShowMode) => void
    setCycleMinutes: (m: number) => void
    setPauseMinutes: (m: number) => void
    setIntervalMinutes: (m: number) => void

    maxPerDay: number
    maxPerHour: number
    maxTotalDuration: number
    setMaxPerDay: (n: number) => void
    setMaxPerHour: (n: number) => void
    setMaxTotalDuration: (n: number) => void

    onDateSelected: (d: Date) => void
    toggleFixedSchedule: () => void
    togglePlayRecurring: () => void
    toggleShowBackground: () => void

    setStartTime: (t: string) => void
    setEndTime: (t: string) => void

    successMessage: string | null,
    setSuccess: (msg: string | null) => void,
    errorMessage: string | null
    setError: (msg: string | null) => void

    sendSchedule: () => Promise<void>
    getSchedule: () => Promise<void>


}

export const useScheduleStore = create<ScheduleState, [["zustand/immer", never]]>(
    immer((set, get) => {
        const today = new Date()
        const zero = new Date(today.getFullYear(), today.getMonth(), today.getDate())

        return {
            scheduledFixedMap: {},
            scheduledCalendarMap: {},
            selectedDate: zero,
            currentWeek: getCurrentWeekByDate(zero),
            isFixedSchedule: false,
            isRecurring: true,
            isShowBackground: false,
            priority: 1,
            scheduleId: null,

            setPriority: (p) => set(s => {
                s.priority = p
            }),

            hoveredBlock: null,
            setHoveredBlock: (b) => set(s => {
                s.hoveredBlock = b
            }),

            selectedScreens: [],
            toggleScreen: id => set(s => {
                const idx = s.selectedScreens.indexOf(id)
                if (idx >= 0) s.selectedScreens.splice(idx, 1)
                else s.selectedScreens.push(id)
            }),

            selectedPlaylist: '',
            setSelectedPlaylist: plId => set(s => {
                s.selectedPlaylist = plId
            }),

            startTime: '08:00',
            endTime: '18:00',
            selectedDays: [],
            toggleDay: day => set(s => {
                const idx = s.selectedDays.indexOf(day)
                if (idx >= 0) s.selectedDays.splice(idx, 1)
                else s.selectedDays.push(day)
            }),

            addBlock: () => {
                const {
                    selectedScreens,
                    currentWeek,
                    startTime,
                    endTime,
                    selectedPlaylist,
                    isFixedSchedule,
                    selectedDays
                } = get()
                if (!selectedScreens.length) return
                const mapKey = isFixedSchedule ? 'scheduledFixedMap' : 'scheduledCalendarMap'

                selectedScreens.forEach(screenId => {
                    set(s => {
                        if (!(s as any)[mapKey][screenId]) (s as any)[mapKey][screenId] = []
                    })
                    selectedDays.forEach(dayShort => {
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
                            (s as any)[mapKey][screenId].push(b)
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
                        b.playlistId === block.playlistId)
                    if (idx >= 0) arr.splice(idx, 1)
                })
            },

            successMessage: null,
            errorMessage: null,
            setSuccess: msg => set(s => {
                s.successMessage = msg
            }),
            setError: msg => set(s => {
                s.errorMessage = msg
            }),

            sendSchedule: async () => {
                set(s => {
                    s.errorMessage = null
                })

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
                const userId = typeof window !== 'undefined' ? localStorage.getItem("userId") : null

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
                const uniqueSlots = Array.from(new Map(allSlots.map(s => [
                    `${s.screenId}|${s.dayOfWeek}|${s.startDate}|${s.startTime}|${s.endTime}|${s.playlistId}`, s
                ])).values())

                const payload = {startDate: null, endDate: null, isRecurring, priority, timeSlots: uniqueSlots}

                try {
                    if (scheduleId) {
                        await axios.put(`${SERVER}schedule/${scheduleId}`, {...payload, userId})
                        get().setSuccess('Расписание успешно обновлено');

                    } else {
                        const res = await axios.post(`${SERVER}schedule`, {...payload, userId})
                        set(s => {
                            s.scheduleId = res.data.id
                        })
                        get().setSuccess('Расписание успешно сохранено');
                    }
                } catch (e: any) {
                    console.error('Error save schedule:', e)
                    const serverMsg = e?.response?.data?.message
                    const ruMsg = 'Не удалось сохранить расписание'
                    const finalMsg = serverMsg
                        ? `${serverMsg}. ${ruMsg}`
                        : ruMsg

                    get().setError(finalMsg)
                }
            },

            getSchedule: async () => {
                set(s => {
                    s.errorMessage = null
                })
                try {
                    const SERVER = process.env.NEXT_PUBLIC_SERVER_URL
                    const userId = getValueInStorage("userId")
                    const accessToken = getValueInStorage("accessToken")

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
                        `${SERVER}schedule/${userId}`,
                        {headers: {Authorization: `Bearer ${accessToken}`}}
                    )

                    set(s => {
                        s.scheduledFixedMap = {};
                        s.scheduledCalendarMap = {}
                    })

                    const screens = new Set<string>()
                    data?.timeSlots?.forEach((slot: any) => {
                        screens.add(slot.screenId)
                        const mapKey = slot.startDate === null ? 'scheduledFixedMap' : 'scheduledCalendarMap'
                        set((s: any) => {
                            if (!(s[mapKey][slot.screenId])) s[mapKey][slot.screenId] = []
                            s[mapKey][slot.screenId].push({
                                dayOfWeek: slot.dayOfWeek,
                                startDate: slot.startDate,
                                endDate: slot.endDate,
                                startTime: slot.startTime,
                                endTime: slot.endTime,
                                playlistId: slot.playlistId
                            })
                        })
                    })
                    set(s => {
                        s.selectedScreens = Array.from(screens);
                        s.isRecurring = data.recurring;
                        s.priority = data.priority
                        s.scheduleId = data.id
                    })

                } catch (e: any) {
                    console.error('Error load schedule:', e)

                    const serverMsg = e?.response?.data?.message
                    const ruMsg = 'Не удалось загрузить расписание'
                    const finalMsg = serverMsg
                        ? `${serverMsg}. ${ruMsg}`
                        : ruMsg

                    get().setError(finalMsg)
                }
            },

            onDateSelected: d => set(s => {
                s.selectedDate = d;
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
