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
import {connectWebSocket} from "@/app/API/ws";


// типы
export type ShowMode = 'once' | 'cycle' | 'repeatInterval'
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

    startDate: string | null
    endDate: string | null

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
    pauseMinutes: number
    intervalMinutes: number
    setShowMode: (m: ShowMode) => void
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

    addEditedBlock: (screenId: string, block: ScheduledBlock) => void
}

export const useScheduleStore = create<ScheduleState, [["zustand/immer", never]]>(
    immer((set, get) => {
        const today = new Date()
        const zero = new Date(today.getFullYear(), today.getMonth(), today.getDate())


        const ws = connectWebSocket('schedule', (action, payload) => {
            switch (action) {
                case 'create':
                case 'update':
                    if ('error' in payload) {
                        set(s => {
                            s.errorMessage = payload.error
                        });
                    } else {
                        set(s => {
                            s.scheduleId = payload.id;
                            s.successMessage = action === 'create'
                                ? 'Расписание создано'
                                : 'Расписание обновлено';
                        });
                    }
                    break;

                case 'getByUserId':
                    if (payload.__status === 'error') {
                        set(s => {
                            s.errorMessage = payload.message
                        })
                        break
                    }

                    set(s => {
                        s.scheduledFixedMap = {}
                        s.scheduledCalendarMap = {}
                        s.isRecurring = Boolean(payload.isRecurring)
                        s.startDate = payload.startDate
                        s.endDate = payload.endDate
                        s.scheduleId = payload.id

                        const screens = new Set<string>()

                        const slots = Array.isArray(payload.timeSlots) ? payload.timeSlots : [];
                        for (const slot of slots) {
                            screens.add(slot.screenId)
                            const mapKey =
                                slot.repeatIntervalMinutes != null || slot.durationMinutes != null
                                    ? 'scheduledCalendarMap'
                                    : slot.startDate === null
                                        ? 'scheduledFixedMap'
                                        : 'scheduledCalendarMap';
                            if (!s[mapKey][slot.screenId]) s[mapKey][slot.screenId] = [];
                            s[mapKey][slot.screenId].push({
                                dayOfWeek: slot.dayOfWeek,
                                startDate: slot.startDate,
                                endDate: slot.endDate,
                                startTime: slot.startTime + ':00',
                                endTime: slot.endTime + ':00',
                                playlistId: slot.playlistId,
                                isRecurring: slot.isRecurring,
                                priority: slot.priority,
                                repeatIntervalMinutes: slot.repeatIntervalMinutes,
                                durationMinutes: slot.durationMinutes,
                            });
                        }
                        s.selectedScreens = Array.from(screens);
                    });
                    break;
            }
        });

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

            startDate: null,
            endDate: null,

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
                    selectedDays,
                    priority,
                    isRecurring,
                    showMode,
                    pauseMinutes,
                    intervalMinutes
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
                            isRecurring: showMode === 'cycle',
                            ...(showMode === 'repeatInterval'
                                    ? {
                                        repeatIntervalMinutes: pauseMinutes,
                                        durationMinutes: intervalMinutes,
                                        priority: 100
                                    }
                                    : {
                                        priority
                                    }
                            )
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

            addEditedBlock: (screenId, block) => {
                const mapKey = get().isFixedSchedule
                    ? 'scheduledFixedMap'
                    : 'scheduledCalendarMap'
                set(s => {
                    if (!(s as any)[mapKey][screenId]) {
                        (s as any)[mapKey][screenId] = []
                    }
                    ;(s as any)[mapKey][screenId].push(block)
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
                const {
                    selectedScreens,
                    isFixedSchedule,
                    isRecurring,
                    scheduleId,
                    pauseMinutes,
                    intervalMinutes,
                    showMode
                } = get()

                const slots = selectedScreens.flatMap(screenId => {
                    const blocks = ((isFixedSchedule
                        ? get().scheduledFixedMap
                        : get().scheduledCalendarMap)[screenId] || [])
                    return blocks.map(b => ({
                        dayOfWeek: b.dayOfWeek,
                        startDate: isFixedSchedule ? null : b.startDate,
                        endDate: isFixedSchedule ? null : b.endDate,
                        startTime: b.startTime.slice(0, 5),
                        endTime: b.endTime.slice(0, 5),
                        playlistId: b.playlistId,
                        isRecurring: b.isRecurring,
                        repeatIntervalMinutes: b.repeatIntervalMinutes,
                        durationMinutes: b.durationMinutes,
                        priority: b.priority,
                        screenId
                    }))
                })

                const userId = typeof window !== 'undefined'
                    ? localStorage.getItem('userId')
                    : null

                const payload = {
                    startTime: null,
                    endTime: null,
                    isRecurring,
                    timeSlots: slots,
                    userId: userId,

                }

                if (scheduleId) {
                    ws.send(JSON.stringify({action: 'update', data: payload}))
                } else {
                    ws.send(JSON.stringify({action: 'create', data: payload}))
                }
            },

            getSchedule: async () => {
                const userId = typeof window !== 'undefined'
                    ? localStorage.getItem('userId')
                    : null
                if (!userId) {
                    set(s => {
                        s.errorMessage = 'UserId отсутствует';
                    })
                    return
                }
                ws.send(JSON.stringify({action: 'getByUserId', userId}))
            },

            // sendSchedule: async () => {
            //
            //     const accessToken = getValueInStorage("accessToken")
            //
            //
            //     set(s => {
            //         s.errorMessage = null
            //     })
            //
            //     const {
            //         selectedScreens,
            //         isFixedSchedule,
            //         isRecurring,
            //         priority,
            //         scheduledFixedMap,
            //         scheduledCalendarMap,
            //         scheduleId,
            //         pauseMinutes,
            //         intervalMinutes,
            //         showMode,
            //     } = get()
            //     const SERVER = process.env.NEXT_PUBLIC_SERVER_URL
            //     const userId = typeof window !== 'undefined' ? localStorage.getItem("userId") : null
            //
            //     const slots = selectedScreens.flatMap(screenId => {
            //         const blocks = (isFixedSchedule ? scheduledFixedMap : scheduledCalendarMap)[screenId] ?? [];
            //         return blocks.map(b => ({
            //             dayOfWeek: b.dayOfWeek,
            //             startTime: b.startTime.slice(0, 5),
            //             endTime: b.endTime.slice(0, 5),
            //             playlistId: b.playlistId,
            //             screenId,
            //
            //             // берём именно из блока
            //             isRecurring: b.isRecurring,
            //             startDate: isFixedSchedule ? null : b.startDate,
            //             endDate: isFixedSchedule ? null : b.endDate,
            //
            //             // поля интервала могут быть undefined
            //             repeatIntervalMinutes: b.repeatIntervalMinutes,
            //             durationMinutes: b.durationMinutes,
            //
            //             // приоритет тоже из блока
            //             priority: b.priority,
            //         }));
            //     });
            //
            //
            //     const uniqueSlots = Array.from(new Map(slots.map(s => [
            //         `${s.screenId}|${s.dayOfWeek}|${s.startDate}|${s.startTime}|${s.endTime}|${s.playlistId}`, s
            //     ])).values())
            //
            //     const payload = {startDate: null, endDate: null, isRecurring, timeSlots: slots}
            //
            //     console.log('slots:', slots)
            //     console.log('payload:', payload)
            //
            //     try {
            //         if (scheduleId) {
            //             await axios.put(`${SERVER}schedule/${scheduleId}`, {...payload, userId},
            //                 {headers: {Authorization: `Bearer ${accessToken}`}})
            //             get().setSuccess('Расписание успешно обновлено');
            //
            //         } else {
            //             const res = await axios.post(`${SERVER}schedule`, {...payload, userId},
            //                 {headers: {Authorization: `Bearer ${accessToken}`}})
            //             set(s => {
            //                 s.scheduleId = res.data.id
            //             })
            //             get().setSuccess('Расписание успешно сохранено');
            //         }
            //     } catch (e: any) {
            //         console.error('Error save schedule:', e)
            //         const serverMsg = e?.response?.data?.message
            //         const ruMsg = 'Не удалось сохранить расписание'
            //         const finalMsg = serverMsg
            //             ? `${serverMsg}. ${ruMsg}`
            //             : ruMsg
            //
            //         get().setError(finalMsg)
            //     }
            // },
            //
            // getSchedule: async () => {
            //     const accessToken = getValueInStorage("accessToken");
            //     const SERVER = process.env.NEXT_PUBLIC_SERVER_URL;
            //
            //     try {
            //         const {data} = await axios.get<{
            //             id: string
            //             startDate: string
            //             endDate: string
            //             isRecurring: boolean
            //             timeSlots: Array<{
            //                 dayOfWeek: string
            //                 startDate: string | null
            //                 endDate: string | null
            //                 startTime: string
            //                 endTime: string
            //                 playlistId: string
            //                 screenId: string
            //                 isRecurring: boolean
            //                 priority: number
            //                 repeatIntervalMinutes?: number
            //                 durationMinutes?: number
            //             }>
            //         }>(`${SERVER}schedule/user`, {
            //             headers: {Authorization: `Bearer ${accessToken}`}
            //         });
            //
            //         console.log('getSchedule response data:', data)
            //         console.log('timeSlots:', data.timeSlots)
            //         // Сбрасываем карту
            //         set(s => {
            //             s.scheduledFixedMap = {};
            //             s.scheduledCalendarMap = {};
            //             s.isRecurring = data.isRecurring ?? false;
            //             s.startDate = data.startDate;
            //             s.endDate = data.endDate;
            //             s.scheduleId = data.id;
            //         });
            //
            //         // Заполняем
            //         const screens = new Set<string>();
            //         data.timeSlots.forEach(slot => {
            //             screens.add(slot.screenId);
            //             const mapKey =
            //                 (slot.repeatIntervalMinutes != null || slot.durationMinutes != null)
            //                     ? 'scheduledCalendarMap'
            //                     : slot.startDate === null
            //                         ? 'scheduledFixedMap'
            //                         : 'scheduledCalendarMap';
            //
            //             set(s => {
            //                 if (!s[mapKey][slot.screenId]) s[mapKey][slot.screenId] = [];
            //                 s[mapKey][slot.screenId].push({
            //                     dayOfWeek: slot.dayOfWeek as ScheduledBlock['dayOfWeek'],
            //                     startDate: slot.startDate,
            //                     endDate: slot.endDate,
            //                     startTime: slot.startTime + ':00',
            //                     endTime: slot.endTime + ':00',
            //                     playlistId: slot.playlistId,
            //                     isRecurring: Boolean(slot.isRecurring),
            //                     priority: slot.priority,
            //                     repeatIntervalMinutes: slot.repeatIntervalMinutes ?? 0,
            //                     durationMinutes: slot.durationMinutes ?? 0,
            //                 });
            //             });
            //         });
            //
            //         set(s => {
            //             s.selectedScreens = Array.from(screens);
            //         });
            //     } catch (e: any) {
            //         set(s => {
            //             s.errorMessage = e.response?.data?.message || 'Ошибка загрузки';
            //         });
            //     }
            // },

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
            pauseMinutes: 50,
            intervalMinutes: 10,

            setShowMode: (m: ShowMode) => set(s => {
                s.showMode = m;
                s.isRecurring = (m === 'cycle');
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
