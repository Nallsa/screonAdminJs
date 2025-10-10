/*
 * Copyright (c) LLC "Centr Distribyucii"
 * All rights reserved.
 */

'use client'

import {create} from 'zustand'
import {immer} from 'zustand/middleware/immer'
import {
    getCurrentWeekByDate,
    parseDayToDate,
    normalizeTime, RU_DAYS, WEEK_DAYS, dateToIsoLocal
} from '@/app/lib/scheduleUtils'
import {
    BackgroundInfo,
    PlaylistItem,
    ScheduledBlock,
    ScreenData,
    TypeMode
} from "@/public/types/interfaces";
import axios from "axios";
import {SERVER_URL} from "@/app/API/api";
import {getValueInStorage} from "@/app/API/localStorage";
import {connectWebSocket} from "@/app/API/ws";
import {usePlaylistStore} from "@/app/store/playlistStore";
import {useOrganizationStore} from "@/app/store/organizationStore";
import {useScreensStore} from "@/app/store/screensStore";


// типы
export type ShowMode = 'once' | 'cycle'
export type AdShowMode = 'minutes' | 'hours' | 'specific'

type ByScreen<T> = Record<string, T[]>


export type Emergency = {
    emergencyId: string
    status: 'ACTIVE' | 'FINISHED' | string
    startedAt?: string
    screens: number
    playlistId?: string
    recurring?: boolean
    screensIds?: string[]
}

export type EmergencyScreenState = {
    emergencyId: string
    playlistId: string
    recurring: boolean
}

export type Scenario = {
    emergencyId: string
    name: string
    status: 'DRAFT' | 'ACTIVE' | 'STOPPED' | string
    recurring: boolean
    startedAt?: string
    screens: number
    screensIds?: string[]
    groups: { playlistId: string; screens: number }[]
}

function chunkArray<T>(arr: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += chunkSize) {
        chunks.push(arr.slice(i, i + chunkSize));
    }
    return chunks;
}

interface ScheduleState {
    selectedDate: Date
    currentWeek: Date[]
    isFixedSchedule: boolean
    isRecurring: boolean
    scheduleId: string | null

    scheduledFixedMap: ByScreen<ScheduledBlock>
    scheduledCalendarMap: ByScreen<ScheduledBlock>
    addBlock: (overrideScreens?: string[]) => void
    removeBlock: (screenId: string, b: ScheduledBlock) => void

    startDate: string | null
    endDate: string | null

    priority: number
    setPriority: (p: number) => void

    selectedScreens: string[]
    selectedGroup: string | null
    setSelectedGroup: (groupId: string | null) => void
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
    showMode: ShowMode,
    typeMode: TypeMode,
    advertisementShowMode: AdShowMode
    setShowMode: (m: ShowMode) => void
    setTypeMode: (m: TypeMode) => void
    setAdvertisementShowMode: (m: AdShowMode) => void


    advertisementIntervalMinutes: number
    setAdvertisementIntervalMinutes: (m: number) => void

    advertisementIntervalHours: number
    setAdvertisementIntervalHours: (h: number) => void

    advertisementSpecificTimes: string[]
    addAdvertisementSpecificTime: (t: string) => void
    removeAdvertisementSpecificTime: (t: string) => void


    onDateSelected: (d: Date) => void
    toggleFixedSchedule: () => void
    togglePlayRecurring: () => void
    toggleShowBackground: () => void

    setStartTime: (t: string) => void
    setEndTime: (t: string) => void

    // общие (для расписаний)
    successMessage: string | null
    setSuccess: (msg: string | null) => void
    errorMessage: string | null
    setError: (msg: string | null) => void

    //  экстренные/сценарии
    emgSuccessMessage: string | null
    setEmgSuccess: (msg: string | null) => void
    emgErrorMessage: string | null
    setEmgError: (msg: string | null) => void

    //  фон
    bgSuccessMessage: string | null
    setBgSuccess: (msg: string | null) => void
    bgErrorMessage: string | null
    setBgError: (msg: string | null) => void

    sendSchedule: () => Promise<void>
    getSchedule: () => Promise<void>

    addEditedBlock: (screenId: string, block: ScheduledBlock) => void
    clearAllSlots: () => void
    clearDaySlots: (day: Date, screenIds?: string[]) => void

    // === emergency  ===
    emergency: Emergency[]
    currentScreenEmergency: EmergencyScreenState | null

    start: (
        args:
            | { organizationId: string; recurring: boolean; assignments: { playlistId: string; screens: string[] }[] }
            | { organizationId: string; playlistId: string; screensId: string[]; isRecursing: boolean }
    ) => void
    cancel: (emergencyId: string) => void
    getByOrganization: (organizationId: string) => void

    // === scenarios ===
    scenarios: Scenario[]
    createScenario: (args: {
        organizationId: string
        name: string
        recurring: boolean
        assignments: { playlistId: string; screens: string[] }[]
    }) => Promise<void>
    startScenario: (scenarioId: string) => void
    cancelScenario: (scenarioId: string) => void

    busyEmergencyScreens: () => Set<string>;
    activeScenarioScreens: () => Set<string>;

    canStartEmergencyOn: (ids: string[]) => [boolean, string?];
    canStartScenarioOn: (ids: string[]) => [boolean, string?];

    // === background ===
    backgroundByBranch: Record<string, BackgroundInfo>
    resolveBackground: (branchId: string) => Promise<boolean>
    setBackground: (args: {
        branchId: string;
        orgId: string;
        playlistId: string,
        screenIds: string[]
    }) => Promise<boolean>
}

export const useScheduleStore = create<ScheduleState, [["zustand/immer", never]]>(
    immer((set, get) => {
        const today = new Date()
        const zero = new Date(today.getFullYear(), today.getMonth(), today.getDate())

        const isErrorPayload = (p: any) => p && typeof p === 'object' && (p.status === 'error' || p.__status === 'error')
        const unwrap = <T = any>(p: any): T => (p && typeof p === 'object' && Array.isArray((p as any).payload)) ? (p as any).payload : p
        let lastOrgId: string | null = null

        const ws = connectWebSocket('schedule', (action, payload) => {
            switch (action) {
                case 'create':
                case 'update': {
                    const status = (payload as any)?.status;
                    if (status && status !== 'success') {
                        set(s => {
                            s.errorMessage = (payload as any)?.message ?? 'Ошибка при сохранении расписания';
                        });
                        return;
                    }
                    const dto = (payload as any)?.payload ?? payload;
                    set(s => {
                        if (dto?.id) s.scheduleId = dto.id;
                        s.successMessage = action === 'create' ? 'Расписание создано' : 'Расписание обновлено';
                    });
                    break;
                }

                case 'getByBranchIds': {
                    const status = (payload as any)?.status;
                    if (status === 'error') {
                        set(s => {
                            s.errorMessage = (payload as any)?.message ?? 'Не удалось получить расписание филиала';
                        });
                        break;
                    }

                    // payload может прийти как строка/объект/массив
                    const raw = (payload as any)?.payload ?? payload;
                    const inner = typeof raw === 'string' ? JSON.parse(raw) : raw;
                    const rules: any[] = Array.isArray(inner) ? inner : [inner];

                    const toHms = (t: any) => {
                        if (t == null) return t;
                        const s = String(t);
                        if (/^\d{2}:\d{2}:\d{2}$/.test(s)) return s;
                        if (/^\d{2}:\d{2}$/.test(s)) return s + ':00';
                        return s;
                    };
                    const asBool = (v: any) => {
                        if (typeof v === 'boolean') return v;
                        if (typeof v === 'number') return v !== 0;
                        if (typeof v === 'string') return ['true', '1', 'yes'].includes(v.trim().toLowerCase());
                        return false;
                    };


                    const normalizedAll: ScheduledBlock[] = [];
                    let meta = {
                        id: null as string | null,
                        startDate: null as string | null,
                        endDate: null as string | null,
                        isRecurring: false
                    };

                    for (const rule of rules) {

                        if (!meta.id && rule?.id) {
                            meta.id = rule.id ?? null;
                            meta.startDate = rule.startDate ?? null;
                            meta.endDate = rule.endDate ?? null;
                            meta.isRecurring = asBool(rule.isRecurring ?? rule.recurring);
                        }

                        const rawSlots = rule?.timeSlots;
                        const arr: any[] =
                            typeof rawSlots === 'string' ? JSON.parse(rawSlots) :
                                Array.isArray(rawSlots) ? rawSlots : [];

                        const byId = new Map(useScreensStore.getState().allScreens.map(s => [s.id, s]));

                        for (const slot of arr) {
                            const screenId = slot.screenId as string;
                            const branchId = slot.branchId ?? byId.get(screenId)?.branchId ?? '';

                            normalizedAll.push({
                                dayOfWeek: slot.dayOfWeek,
                                startDate: slot.startDate ?? null,
                                endDate: slot.endDate ?? null,
                                startTime: toHms(slot.startTime)!,
                                endTime: toHms(slot.endTime)!,
                                playlistId: slot.playlistId,
                                isRecurring: asBool(slot.isRecurring ?? slot.recurring),
                                priority: Number(slot.priority ?? 1),
                                type: slot.type,
                                screenId: slot.screenId,
                                branchId,
                            });
                        }
                    }


                    set(s => {
                        if (!s.scheduledFixedMap) s.scheduledFixedMap = {};
                        if (!s.scheduledCalendarMap) s.scheduledCalendarMap = {};

                        s.isRecurring = meta.isRecurring;
                        s.startDate = meta.startDate;
                        s.endDate = meta.endDate;
                        s.scheduleId = meta.id;

                        for (const slot of normalizedAll) {
                            const mapKey = slot.startDate === null ? 'scheduledFixedMap' : 'scheduledCalendarMap';
                            if (!s[mapKey][slot.screenId]) s[mapKey][slot.screenId] = [];

                            const exists = s[mapKey][slot.screenId].some((b: ScheduledBlock) =>
                                b.dayOfWeek === slot.dayOfWeek &&
                                (b.startDate ?? null) === (slot.startDate ?? null) &&
                                (b.endDate ?? null) === (slot.endDate ?? null) &&
                                b.startTime === slot.startTime &&
                                b.endTime === slot.endTime &&
                                b.playlistId === slot.playlistId &&
                                b.priority === slot.priority &&
                                b.type === slot.type &&
                                b.isRecurring === slot.isRecurring &&
                                b.branchId === slot.branchId
                            );
                            if (!exists) s[mapKey][slot.screenId].push(slot);
                        }

                        // обязательно восстановить выбранные экраны
                        const screens = new Set<string>(s.selectedScreens);
                        normalizedAll.forEach(sl => screens.add(sl.screenId));
                        s.selectedScreens = Array.from(screens);
                    });

                    break;
                }

                // ===== emergency  =====
                case 'getEmergencyByOrganization': {
                    if (isErrorPayload(payload)) {
                        set(s => {
                            s.emgErrorMessage = (payload as any)?.message || 'Не удалось получить экстренные/сценарии'
                        })
                        break
                    }
                    const root = (payload as any)?.payload ?? payload

                    // --- legacy emergencies  ---
                    const legacyActive = Array.isArray(root?.legacyActive) ? root.legacyActive : []
                    const legacyList: Emergency[] = legacyActive.map((it: any) => {
                        const arr =
                            Array.isArray(it.screensId) ? it.screensId :
                                Array.isArray(it.screenIds) ? it.screenIds :
                                    Array.isArray(it.assignments)
                                        ? it.assignments.flatMap((g: any) => Array.isArray(g?.screens) ? g.screens : [])
                                        : []

                        return {
                            emergencyId: it.emergencyId ?? it.id ?? 'unknown',
                            status: it.status ?? 'ACTIVE',
                            startedAt: it.startedAt ?? it.started_at ?? undefined,
                            screens: arr.length || (typeof it.screens === 'number' ? it.screens : 0),
                            playlistId: it.playlistId,
                            recurring: Boolean(it.recurring ?? it.isRecurring),
                            screensIds: arr.length ? arr : undefined,
                        }
                    })

                    // --- scenarios  ---
                    const scnRaw = Array.isArray(root?.scenarios) ? root.scenarios : []
                    const scnList: Scenario[] = scnRaw.map((it: any) => {
                        const collected =
                            Array.isArray(it.screensIds) ? it.screensIds :
                                Array.isArray(it.screenIds) ? it.screenIds :
                                    Array.isArray(it.assignments)
                                        ? it.assignments.flatMap((g: any) => Array.isArray(g?.screens) ? g.screens : [])
                                        : []

                        return {
                            emergencyId: it.emergencyId ?? it.id ?? 'unknown',
                            name: it.name ?? 'Сценарий',
                            status: it.status ?? 'DRAFT',
                            recurring: Boolean(it.recurring ?? it.isRecurring),
                            startedAt: it.startedAt ?? it.started_at ?? undefined,
                            screens: collected.length || Number(it.screens ?? 0),
                            screensIds: collected.length ? collected : undefined,
                            groups: Array.isArray(it.groups)
                                ? it.groups.map((g: any) => ({
                                    playlistId: g.playlistId,
                                    screens: Number(g.screens ?? 0),
                                }))
                                : [],
                        }
                    })

                    set(s => {
                        s.emergency = legacyList
                        s.scenarios = scnList
                    })
                    break
                }


                case 'legacyEmergencyStart': {
                    const p = (payload as any)?.payload ?? payload
                    if (!p) {
                        set(s => {
                            s.emgErrorMessage = (payload as any)?.message || 'Не удалось запустить экстренный показ'
                        })
                        break
                    }

                    const toBool = (v: any) => typeof v === 'boolean' ? v
                        : typeof v === 'string' ? ['true', '1', 'yes'].includes(v.trim().toLowerCase())
                            : !!v


                    if (p.emergencyId && p.playlistId) {
                        set(s => {
                            s.currentScreenEmergency = {
                                emergencyId: p.emergencyId,
                                playlistId: p.playlistId,
                                recurring: toBool(p.isRecurring ?? p.recurring),
                            }
                            s.emgSuccessMessage = 'Экстренный показ запущен'
                        })
                    } else {
                        set(s => {
                            s.emgSuccessMessage = 'Экстренный показ запущен'
                        })
                    }


                    if (lastOrgId) get().getByOrganization(lastOrgId)
                    break
                }

                case 'emergencyStart': {
                    const p = (payload as any)?.payload ?? payload
                    if (!p) {
                        set(s => {
                            s.emgErrorMessage = (payload as any)?.message || 'Не удалось запустить'
                        })
                        break
                    }


                    if (p.playlistId && p.emergencyId) {
                        set(s => {
                            s.currentScreenEmergency = {
                                emergencyId: p.emergencyId,
                                playlistId: p.playlistId,
                                recurring: Boolean(p.isRecurring ?? p.recurring),
                            }
                            s.emgSuccessMessage = 'Запущено'
                        })
                    } else {
                        set(s => {
                            s.emgSuccessMessage = 'Запущено'
                        })
                    }

                    if (lastOrgId) get().getByOrganization(lastOrgId)
                    break
                }


                case 'emergencyCancel': {
                    const p = (payload as any)?.payload ?? payload
                    if (!p || p.status === 'error') {
                        set(s => {
                            s.emgErrorMessage = (payload as any)?.message || 'Не удалось отменить'
                        })
                        break
                    }
                    set(s => {
                        s.emgSuccessMessage = 'Экстренный показ завершён'
                    })

                    const emgId = p.emergencyId
                    if (emgId) {
                        set(s => {
                            s.emergency = s.emergency.filter(e => e.emergencyId !== emgId)
                        })
                    }
                    set(s => {
                        s.currentScreenEmergency = null
                    })

                    if (lastOrgId) get().getByOrganization(lastOrgId)
                    break
                }

                // ===== background =====

                case 'backgroundResolve': {
                    const root = (payload as any) ?? {}
                    const status = root.status ?? 'success'
                    const p = root.payload ?? root
                    const playlistId = p?.playlistId ?? null
                    const branchId = p?.branchId ?? root.data?.branchId ?? null

                    if (status === 'success' && branchId) {
                        set(s => {
                            s.backgroundByBranch ??= {}
                            s.backgroundByBranch[branchId] = {playlistId, configured: !!playlistId}
                            s.bgErrorMessage = null
                        })
                    } else {
                        // set(s => {
                        //     s.bgErrorMessage = root.message || 'Не удалось получить фоновый плейлист'
                        // })
                    }
                    break
                }

                case 'backgroundSet': {
                    const status = (payload as any)?.status ?? 'error'
                    const p = (payload as any)?.payload ?? payload
                    if (status !== 'success' || !p) {
                        set(s => {
                            s.errorMessage = (payload as any)?.message || 'Не удалось задать фоновый плейлист'
                        })
                        break
                    }

                    const branchId = p?.branchId
                    const playlistId = p?.playlistId ?? null

                    if (branchId) {
                        set(s => {
                            s.backgroundByBranch ??= {}
                            s.backgroundByBranch[branchId] = {playlistId, configured: true}
                            s.successMessage = 'Фоновый плейлист сохранён'
                        })
                    }
                    break
                }
            }
        })

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
            currentScreenEmergency: null,
            setPriority: (p) => set(s => {
                s.priority = p
            }),

            hoveredBlock: null,
            setHoveredBlock: (b) => set(s => {
                s.hoveredBlock = b
            }),

            selectedScreens: [],
            selectedGroup: null,

            toggleScreen: (id) => set(s => {
                const idx = s.selectedScreens.indexOf(id)
                if (idx >= 0) s.selectedScreens.splice(idx, 1)
                else s.selectedScreens.push(id)
            }),

            setSelectedGroup: (groupId) => set(s => {
                s.selectedGroup = groupId
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

            successMessage: null,
            errorMessage: null,
            setSuccess: msg => set(s => {
                s.successMessage = msg
            }),
            setError: msg => set(s => {
                s.errorMessage = msg
            }),

            addBlock: (overrideScreens) => {
                const playlistItems = usePlaylistStore.getState().playlistItems
                const screensStore = useScreensStore.getState();
                const byId = new Map(screensStore.allScreens.map(s => [s.id, s]));

                const {
                    selectedScreens,
                    currentWeek,
                    selectedDays,
                    selectedPlaylist,
                    isFixedSchedule,
                    startTime: playlistStart,
                    endTime: playlistEnd,
                    showMode,
                    typeMode,
                    advertisementIntervalMinutes,
                    advertisementIntervalHours,
                    advertisementSpecificTimes,
                    setError,
                    setSuccess,
                    advertisementShowMode
                } = get()

                const screens = overrideScreens ?? get().selectedScreens;


                const playlist = playlistItems.find(p => p.id === selectedPlaylist);
                if (!playlist) {
                    setError('Плейлист не выбран или не найден');
                    return;
                }

                const durationMin = Math.ceil(playlist.totalDurationSeconds / 60)

                console.log(durationMin, 'мин totalDurationMinutes');


                const newBlocks: ScheduledBlock[] = []
                const hhmmToMinutes = (hhmm: string) => {
                    const [h, m] = hhmm.split(':').map(Number);
                    return h * 60 + m;
                };
                const minutesToHhmmss = (min: number) => {
                    const h = Math.floor(min / 60);
                    const m = min % 60;
                    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:00`;
                };

                const newBlocksByScreen: Record<string, ScheduledBlock[]> = {};

                function pushSlot(
                    screenId: string,
                    dow: ScheduledBlock['dayOfWeek'],
                    isoDate: string,
                    startMin: number,
                    endMin: number
                ) {

                    const screen = byId.get(screenId);
                    if (!screen?.branchId) {
                        throw new Error(`У экрана ${screenId} нет branchId`);
                    }

                    const block: ScheduledBlock = {
                        screenId,
                        dayOfWeek: dow,
                        startDate: isFixedSchedule ? null : isoDate,
                        endDate: isFixedSchedule ? null : isoDate,
                        startTime: minutesToHhmmss(startMin),
                        endTime: minutesToHhmmss(endMin),
                        playlistId: selectedPlaylist,
                        type: typeMode,
                        isRecurring: typeMode === 'PLAYLIST' && showMode === 'cycle',
                        priority: typeMode === 'ADVERTISEMENT' ? 100 : get().priority,
                        branchId: screen.branchId,
                    };
                    if (!newBlocksByScreen[screenId]) newBlocksByScreen[screenId] = [];
                    newBlocksByScreen[screenId].push(block);
                }

                const startMin = hhmmToMinutes(playlistStart)
                let endMin = hhmmToMinutes(playlistEnd)


                const isFullDay = showMode === 'cycle' && playlistStart === '00:00' && playlistEnd === '00:00'
                if (isFullDay) endMin = 24 * 60


                for (const screenId of screens) {
                    for (const dayShort of selectedDays) {
                        const dateObj = parseDayToDate(dayShort, currentWeek)
                        const isoDate = dateObj.toISOString().slice(0, 10)
                        const dow = WEEK_DAYS[RU_DAYS.indexOf(dayShort)] as ScheduledBlock['dayOfWeek']

                        if (typeMode === 'PLAYLIST') {
                            if (showMode === 'cycle') {
                                // один блок на весь период от playlistStart до playlistEnd
                                pushSlot(screenId, dow, isoDate, startMin, endMin);
                            } else {
                                // один блок ровно длины плейлиста
                                pushSlot(screenId, dow, isoDate, startMin, startMin + durationMin);
                            }
                            continue;
                        }

                        switch (advertisementShowMode) {
                            case 'minutes': {
                                // «один раз»: начинаем с playlistStart и каждые N минут
                                // вставляем блокы длиной durationMin, пока не дойдём до playlistEnd
                                let cursor = startMin
                                while (cursor + durationMin <= endMin) {
                                    pushSlot(screenId, dow, isoDate, cursor, cursor + durationMin)
                                    cursor += advertisementIntervalMinutes
                                }
                                break
                            }

                            case 'hours': {
                                // «по часам»: то же самое, но шаг = N часов
                                let cursor = startMin
                                const step = advertisementIntervalHours * 60
                                while (cursor + durationMin <= endMin) {
                                    pushSlot(screenId, dow, isoDate, cursor, cursor + durationMin)
                                    cursor += step
                                }
                                break
                            }

                            case 'specific':
                                // «в конкретные часы»: берём каждый из заранее выбранных
                                advertisementSpecificTimes.forEach(hhmm => {
                                    const m = hhmmToMinutes(hhmm)
                                    if (m >= startMin && m + durationMin <= endMin) {
                                        pushSlot(screenId, dow, isoDate, m, m + durationMin)
                                    }
                                })
                                break


                            default:
                                console.warn('Unknown advertisement showMode', showMode)
                        }
                    }
                }

                const mapKey = get().isFixedSchedule ? 'scheduledFixedMap' : 'scheduledCalendarMap';
                for (const screenId of screens) {
                    set(s => {
                        if (!s[mapKey][screenId]) s[mapKey][screenId] = [];
                        const blocksForScreen = newBlocksByScreen[screenId] || [];
                        s[mapKey][screenId].push(...blocksForScreen);
                    });
                }

                let totalAdded = 0;
                for (const screenId of screens) {
                    const blocksForScreen = newBlocksByScreen[screenId] || [];
                    totalAdded += blocksForScreen.length;
                }

                setSuccess(`Добавлено ${totalAdded} ${typeMode === 'ADVERTISEMENT' ? 'рекламных' : 'обычных'} слотов`);
            },


            removeBlock: (screenId, block) => {
                const mapKey = get().isFixedSchedule ? 'scheduledFixedMap' : 'scheduledCalendarMap'
                set(s => {
                    const arr = (s as any)[mapKey][screenId] || []
                    const idx = arr.findIndex((b: ScheduledBlock) =>
                        b.dayOfWeek === block.dayOfWeek &&
                        b.startTime === block.startTime &&
                        b.endTime === block.endTime &&
                        b.playlistId === block.playlistId &&
                        //  b.priority   === block.priority &&
                        //   b.type       === block.type &&
                        //   b.isRecurring=== block.isRecurring &&
                        b.branchId === block.branchId)
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


            sendSchedule: async () => {

                if (!ws || ws.readyState !== WebSocket.OPEN) {
                    console.warn('WS[schedule] not connected or not open');
                    return;
                }

                const {
                    scheduledFixedMap,
                    scheduledCalendarMap,
                    isRecurring,
                    scheduleId,
                } = get();

                // соберём уникальный список экранов из обеих карт
                const screenIds = Array.from(
                    new Set([
                        ...Object.keys(scheduledCalendarMap || {}),
                    ])
                );
                const toHHmm = (t: string) => t.startsWith('24:00') ? '23:59' : t.slice(0, 5)

                // нормализация тайм-слотов для отправки
                const toSlots = (
                    blocks: ScheduledBlock[] | undefined,
                    fixed: boolean,
                    screenId: string
                ) =>
                    (blocks || []).map(b => ({
                        dayOfWeek: b.dayOfWeek,
                        startDate: fixed ? null : b.startDate,
                        endDate: fixed ? null : b.endDate,
                        startTime: toHHmm(b.startTime),
                        endTime: toHHmm(b.endTime),
                        playlistId: b.playlistId,
                        isRecurring: b.isRecurring,
                        priority: b.priority,
                        screenId,
                        type: b.type,
                        branchId: b.branchId,
                    }));

                // собираем слоты по всем экранам из обеих карт
                const slots: any[] = [];
                for (const sid of screenIds) {
                    slots.push(...toSlots(scheduledCalendarMap[sid], false, sid));
                }

                const branchIds =
                    (useOrganizationStore.getState?.().activeBranches ?? [])
                        .map(b => b.id)
                        .filter(Boolean)
                const payload = {
                    startDate: null,
                    endDate: null,
                    isRecurring,

                }

                console.log("id расписания", scheduleId)

                const CHUNK_SIZE = 20
                const chunks = slots.length ? chunkArray(slots, CHUNK_SIZE) : [[]];
                const totalChunks = chunks.length

                const actionName = scheduleId ? 'update' : 'create'


                for (let i = 0; i < totalChunks; i++) {
                    ws.send(JSON.stringify({
                        action: actionName,
                        data: {
                            ...payload,
                            ...(scheduleId ? {id: scheduleId, scheduleId} : {}),
                            timeSlots: chunks[i],
                            chunkIndex: i,
                            totalChunks,
                            branchIds,
                        }
                    }))
                }
            },

            getSchedule: async () => {
                if (!ws || ws.readyState !== WebSocket.OPEN) {
                    console.warn('WS[schedule] not connected or not open');
                    return;
                }

                const branchIds =
                    (useOrganizationStore.getState?.().activeBranches ?? [])
                        .map(b => b.id)
                        .filter(Boolean)
                if (branchIds.length === 0) {
                    set(s => {
                        s.errorMessage = 'Не выбран филиал (branchId)'
                    })
                    return
                }

                set(s => {
                    s.scheduledFixedMap = {}
                    s.scheduledCalendarMap = {}
                    s.selectedScreens = []
                })

                ws.send(JSON.stringify({
                    action: 'getByBranchIds',
                    branchIds
                }))
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
            typeMode: 'PLAYLIST',

            setShowMode: (m: ShowMode) => set(s => {
                s.showMode = m;
                s.isRecurring = (m === 'cycle');
            }),

            setTypeMode: (m: TypeMode) => set(s => {
                s.typeMode = m;
                s.isRecurring = (m === 'PLAYLIST');
            }),


            advertisementShowMode: 'minutes',
            setAdvertisementShowMode: m => set(s => {
                s.advertisementShowMode = m
            }),

            advertisementIntervalMinutes: 15,
            setAdvertisementIntervalMinutes: m => set(s => {
                s.advertisementIntervalMinutes = m
            }),

            advertisementIntervalHours: 1,
            setAdvertisementIntervalHours: h => set(s => {
                s.advertisementIntervalHours = h
            }),

            advertisementSpecificTimes: [],
            addAdvertisementSpecificTime: t => set(s => {
                if (!s.advertisementSpecificTimes.includes(t))
                    s.advertisementSpecificTimes.push(t)
            }),
            removeAdvertisementSpecificTime: t => set(s => {
                s.advertisementSpecificTimes = s.advertisementSpecificTimes.filter(x => x !== t)
            }),

            clearAllSlots: () => {
                set(s => {
                    s.scheduledFixedMap = {};
                    s.scheduledCalendarMap = {};
                });
            },

            clearDaySlots: (day, screenIds) => {
                set(s => {
                    const iso = dateToIsoLocal(day);

                    const DAY_ENUM = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] as const
                    const dowEnum = DAY_ENUM[day.getDay()] as ScheduledBlock['dayOfWeek']


                    const targets = screenIds && screenIds.length > 0
                        ? screenIds
                        : Array.from(new Set([
                            ...Object.keys(s.scheduledFixedMap || {}),
                            ...Object.keys(s.scheduledCalendarMap || {}),
                        ]))

                    for (const sid of targets) {
                        if (s.isFixedSchedule) {
                            if (s.scheduledFixedMap[sid]) {
                                s.scheduledFixedMap[sid] = s.scheduledFixedMap[sid].filter(b => b.dayOfWeek !== dowEnum)
                            }
                        } else {
                            if (s.scheduledCalendarMap[sid]) {
                                s.scheduledCalendarMap[sid] = s.scheduledCalendarMap[sid].filter(b => (b.startDate ?? '').slice(0, 10) !== iso)
                            }
                        }
                    }
                })
            },


// ============================ emergency =============================
            emergency: [],
            scenarios: [],

            emgSuccessMessage: null,
            emgErrorMessage: null,
            setEmgSuccess: msg => set(s => {
                s.emgSuccessMessage = msg
            }),
            setEmgError: msg => set(s => {
                s.emgErrorMessage = msg
            }),

            start: (args) => {
                const ts = new Date().toISOString()
                console.log(`[${ts}] legacyEmergencyStart →`, args)
                if (!ws || ws.readyState !== WebSocket.OPEN) {
                    console.warn('WS[schedule] not connected or not open');
                    return
                }
                set(s => {
                    s.emgSuccessMessage = null;
                    s.emgErrorMessage = null
                })


                const sendOne = (organizationId: string | undefined, playlistId: string, screensId: string[], recurring: boolean) => {
                    ws.send(JSON.stringify({
                        action: 'legacyEmergencyStart',
                        data: {
                            playlistId,
                            screensId,
                            isRecursing: recurring,
                            ...(organizationId ? {organizationId} : {})
                        }
                    }))
                }

                if ('assignments' in args) {
                    const org = args.organizationId
                    const rec = !!args.recurring
                    for (const asg of (args.assignments || [])) {
                        if (!asg?.playlistId || !Array.isArray(asg?.screens) || asg.screens.length === 0) continue
                        sendOne(org, asg.playlistId, asg.screens, rec)
                    }
                } else {
                    sendOne(args.organizationId, args.playlistId, args.screensId, !!args.isRecursing)
                }
            },

            cancel: (emergencyId: string) => {
                if (!ws || ws.readyState !== WebSocket.OPEN) {
                    console.warn('WS[schedule] not connected or not open');
                    return
                }
                set(s => {
                    s.emgSuccessMessage = null;
                    s.emgErrorMessage = null
                })
                ws.send(JSON.stringify({action: 'emergencyCancel', data: {emergencyId}}))
            },

            getByOrganization: (organizationId: string) => {
                if (!ws || ws.readyState !== WebSocket.OPEN) {
                    console.warn('WS[schedule] not connected or not open');
                    return
                }
                lastOrgId = organizationId
                ws.send(JSON.stringify({action: 'getEmergencyByOrganization', data: {orgId: organizationId}}))
            },

            createScenario: async ({organizationId, name, recurring, assignments}) => {
                try {
                    const accessToken = getValueInStorage("accessToken")

                    const res = await axios.post(`${SERVER_URL}schedule/emergency-scenarios`, {
                            organizationId, recurring, name, assignments
                        },
                        {headers: {Authorization: `Bearer ${accessToken}`}})

                    const dto = await res.data
                    set(s => {
                        s.emgSuccessMessage = 'Сценарий создан'
                    })
                    if (organizationId) get().getByOrganization(organizationId)
                } catch (e: any) {
                    set(s => {
                        s.emgErrorMessage = `Не удалось создать сценарий: ${e?.message ?? e}`
                    })
                }
            },

            startScenario: (scenarioId: string) => {
                const wsInst = ws
                if (!wsInst || wsInst.readyState !== WebSocket.OPEN) {
                    console.warn('WS[schedule] not connected or not open')
                    return
                }
                set(s => {
                    s.emgSuccessMessage = null;
                    s.emgErrorMessage = null
                })
                wsInst.send(JSON.stringify({action: 'emergencyStart', data: {scenarioId}}))
            },

            cancelScenario: (scenarioId: string) => {
                const wsInst = ws
                if (!wsInst || wsInst.readyState !== WebSocket.OPEN) {
                    console.warn('WS[schedule] not connected or not open')
                    return
                }
                set(s => {
                    s.emgSuccessMessage = null;
                    s.emgErrorMessage = null
                })
                wsInst.send(JSON.stringify({action: 'emergencyCancel', data: {emergencyId: scenarioId}}))
            },


            busyEmergencyScreens: (): Set<string> => {
                const set = new Set<string>()
                for (const a of get().emergency) {
                    if (!a) continue
                    const any = a as any
                    if (Array.isArray(any.screenIds)) any.screenIds.forEach((x: string) => set.add(x))
                    else if (Array.isArray(any.screensIds)) any.screensIds.forEach((x: string) => set.add(x))
                    else if (Array.isArray(any.assignments)) any.assignments.forEach((g: any) => (g?.screens || []).forEach((x: string) => set.add(x)))
                }
                return set
            },

            activeScenarioScreens: (): Set<string> => {
                const set = new Set<string>()
                for (const s of get().scenarios) {
                    if (s?.status !== 'ACTIVE') continue
                    const any = s as any
                    const collected =
                        Array.isArray(any.screensIds) ? any.screensIds :
                            Array.isArray(any.screenIds) ? any.screenIds :
                                Array.isArray(any.assignments) ? any.assignments.flatMap((g: any) => Array.isArray(g?.screens) ? g.screens : []) :
                                    []
                    collected.forEach((x: string) => set.add(x))
                }
                return set
            },

            canStartEmergencyOn: (ids: string[]): [boolean, string?] => {
                const busyEmg = get().busyEmergencyScreens()
                if (ids.some(id => busyEmg.has(id)))
                    return [false, 'Нельзя запустить экстренное — часть экранов уже занята другим экстренным']
                const busyScn = get().activeScenarioScreens()
                if (ids.some(id => busyScn.has(id)))
                    return [false, 'Нельзя запустить экстренное — часть экранов занята активным сценарием']
                return [true]
            },

            canStartScenarioOn: (ids: string[]): [boolean, string?] => {
                const busyEmg = get().busyEmergencyScreens()
                if (ids.some(id => busyEmg.has(id)))
                    return [false, 'Нельзя запустить сценарий — экраны заняты экстренным']
                const busyScn = get().activeScenarioScreens()
                if (ids.some(id => busyScn.has(id)))
                    return [false, 'Нельзя запустить сценарий — экраны заняты другим сценарием']
                return [true]
            },

// ============================ background ==================================
            backgroundByBranch: {},

            bgSuccessMessage: null,
            bgErrorMessage: null,
            setBgSuccess: msg => set(s => {
                s.bgSuccessMessage = msg
            }),
            setBgError: msg => set(s => {
                s.bgErrorMessage = msg
            }),

            // получить актуальный фон для филиала
            resolveBackground: async (branchId) => {

                const wsInst = ws
                if (!wsInst || wsInst.readyState !== WebSocket.OPEN) {
                    console.warn('WS[schedule] not connected or not open')
                    return false
                }

                return await new Promise<boolean>((resolve) => {
                    let done = false
                    const cleanup = () => {
                        done = true;
                        wsInst.removeEventListener('message', onMsg);
                        clearTimeout(t)
                    }

                    const onMsg = (ev: MessageEvent) => {
                        try {
                            const root = JSON.parse(ev.data)
                            if (root?.action !== 'backgroundResolve') return
                            cleanup()

                            const status = root?.status ?? 'success'
                            const p = root?.payload ?? root
                            const playlistId = p?.playlistId ?? null
                            if (status === 'success') {
                                set(s => {
                                    s.backgroundByBranch ??= {}
                                    s.backgroundByBranch[branchId] = {playlistId, configured: !!playlistId}
                                    s.bgErrorMessage = null
                                })
                                resolve(true)
                            } else {
                                set(s => {
                                    s.bgErrorMessage = root?.message || 'Не удалось получить фоновый плейлист'
                                })
                                resolve(false)
                            }
                        } catch {
                        }
                    }

                    wsInst.addEventListener('message', onMsg)
                    const t = setTimeout(() => {
                        if (!done) {
                            cleanup();
                            resolve(false)
                        }
                    }, 10000)


                    wsInst.send(JSON.stringify({action: 'backgroundResolve', data: {branchId}}))
                })
            },

            // сохранить фон для филиала
            setBackground: async ({branchId, orgId, playlistId, screenIds}) => {
                const wsInst = ws
                if (!wsInst || wsInst.readyState !== WebSocket.OPEN) {
                    console.warn('WS[schedule] not connected or not open')
                    return false
                }

                return await new Promise<boolean>((resolve) => {
                    let done = false
                    const cleanup = () => {
                        done = true;
                        wsInst.removeEventListener('message', onMsg);
                        clearTimeout(t)
                    }

                    const onMsg = (ev: MessageEvent) => {
                        try {
                            const root = JSON.parse(ev.data)
                            if (root?.action !== 'backgroundSet') return
                            cleanup()

                            const status = root?.status ?? 'error'
                            const p = root?.payload ?? root
                            if (status === 'success') {
                                const bId = p?.branchId ?? branchId
                                const plId = p?.playlistId ?? playlistId
                                set(s => {
                                    s.backgroundByBranch ??= {}
                                    s.backgroundByBranch[bId] = {playlistId: plId, configured: true}
                                    s.bgSuccessMessage = 'Фоновый плейлист сохранён'
                                    s.bgErrorMessage = null
                                })
                                resolve(true)
                            } else {
                                set(s => {
                                    s.bgErrorMessage = root?.message || 'Не удалось задать фоновый плейлист'
                                })
                                resolve(false)
                            }
                        } catch {
                        }
                    }

                    wsInst.addEventListener('message', onMsg)
                    const t = setTimeout(() => {
                        if (!done) {
                            cleanup();
                            set(s => {
                                s.errorMessage = 'Таймаут ответа backgroundSet'
                            });
                            resolve(false)
                        }
                    }, 10000)


                    wsInst.send(JSON.stringify({
                        action: 'backgroundSet',
                        data: {playlistId, orgId, branchId, screenIds}
                    }))
                })
            },

        }
    })
)