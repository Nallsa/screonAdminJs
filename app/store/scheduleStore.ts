'use client'

import {create} from 'zustand'
import {immer} from 'zustand/middleware/immer'
import {
    getCurrentWeekByDate,
    parseDayToDate,
    normalizeTime, RU_DAYS, WEEK_DAYS
} from '@/app/lib/scheduleUtils'
import {PlaylistItem, ScheduledBlock, ScreenData, TypeMode} from "@/public/types/interfaces";
import axios from "axios";
import {SERVER_URL} from "@/app/API/api";
import {getValueInStorage} from "@/app/API/localStorage";
import {connectWebSocket} from "@/app/API/ws";
import {usePlaylistStore} from "@/app/store/playlistStore";
import {useOrganizationStore} from "@/app/store/organizationStore";


// типы
export type ShowMode = 'once' | 'cycle'
export type AdShowMode = 'minutes' | 'hours' | 'specific'

type ByScreen<T> = Record<string, T[]>

export type EmergencyAdmin = {
    emergencyId: string
    playlistId: string
    isRecursing: boolean
    screens: string[]
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

    successMessage: string | null,
    setSuccess: (msg: string | null) => void,
    errorMessage: string | null
    setError: (msg: string | null) => void

    sendSchedule: () => Promise<void>
    getSchedule: () => Promise<void>

    addEditedBlock: (screenId: string, block: ScheduledBlock) => void


    // === emergency  ===
    active: EmergencyAdmin[]
    error: string | null
    start: (args: { playlistId: string; screensId: string[]; isRecursing: boolean }) => void
    cancel: (emergencyId: string) => void
    getByOrganization: (orgId: string) => void
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
                    // payload может быть либо корнем с {status, message}, либо самим DTO
                    const status = (payload as any)?.status;
                    if (status && status !== 'success') {
                        set(s => {
                            s.errorMessage = (payload as any)?.message ?? 'Ошибка при сохранении расписания';
                        });
                        return;
                    }
                    const dto = (payload as any)?.payload ?? payload; // ScheduleRuleDTO
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
                        if (/^\d{2}:\d{2}:\d{2}$/.test(s)) return s;     // HH:mm:ss — оставляем
                        if (/^\d{2}:\d{2}$/.test(s)) return s + ':00';   // HH:mm → добавим секунды
                        return s;                                        // что-то иное — не трогаем
                    };
                    const asBool = (v: any) => {
                        if (typeof v === 'boolean') return v;
                        if (typeof v === 'number') return v !== 0;
                        if (typeof v === 'string') return ['true', '1', 'yes'].includes(v.trim().toLowerCase());
                        return false;
                    };

                    // Нормализация всех слотов из всех правил
                    const normalizedAll: ScheduledBlock[] = [];
                    let meta = {
                        id: null as string | null,
                        startDate: null as string | null,
                        endDate: null as string | null,
                        isRecurring: false
                    };

                    for (const rule of rules) {
                        // метаданные (берём из первого правила — если нужно, можно мёржить умнее)
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

                        for (const slot of arr) {
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
                            });
                        }
                    }

                    // Записываем в стор
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
                                b.startTime === slot.startTime &&
                                b.endTime === slot.endTime &&
                                b.playlistId === slot.playlistId &&
                                b.priority === slot.priority &&
                                b.type === slot.type &&
                                b.isRecurring === slot.isRecurring
                            );
                            if (!exists) s[mapKey][slot.screenId].push(slot);
                        }

                        // обязательно восстановить выбранные экраны — иначе таблица пустая
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
                            s.errorMessage = payload?.message || 'Не удалось получить экстренные'
                        })
                        break
                    }

                    const asBool = (v: any): boolean => {
                        if (typeof v === 'boolean') return v
                        if (typeof v === 'string') {
                            const t = v.trim().toLowerCase()
                            return t === 'true' || t === '1' || t === 'yes'
                        }
                        if (typeof v === 'number') return v !== 0
                        return false
                    }

                    const raw = unwrap<any[]>(payload)
                    const listRaw = Array.isArray(raw) ? raw : []

                    const list = listRaw
                        // иногда в payload проскакивают посторонние объекты — отфильтруем
                        .filter((it: any) => it && (it.playlistId || it.emergencyId || it.emrgencyId))
                        .map((it: any): EmergencyAdmin => {
                            // поддерживаем разные варианты имени флага
                            const recSrc = it.recursing ?? it.isRecursing ?? it.isRecurring ?? it.loop ?? it.recurring
                            return {
                                emergencyId: it.emergencyId || it.emrgencyId, // опечатка бэка
                                playlistId: it.playlistId,
                                isRecursing: asBool(recSrc),
                                screens: Array.isArray(it.screens) ? it.screens
                                    : (Array.isArray(it.screensId) ? it.screensId : []),
                            }
                        })

                    set(s => {
                        s.active = list
                    })
                    break
                }

                case 'emergencyStart': {
                    const asBool = (v: any): boolean => {
                        if (typeof v === 'boolean') return v
                        if (typeof v === 'string') return v.trim().toLowerCase() === 'true' || v === '1'
                        if (typeof v === 'number') return v !== 0
                        return false
                    }

                    const p = (payload as any)?.payload ?? payload
                    if (p?.emergencyId) {
                        set(s => {
                            s.successMessage = 'Экстренный показ запущен'
                            s.active = [
                                {
                                    emergencyId: p.emergencyId,
                                    playlistId: p.playlistId,
                                    isRecursing: asBool(p.isRecursing ?? p.recursing ?? p.isRecurring),
                                    screens: [],
                                },
                                ...s.active.filter(e => e.emergencyId !== p.emergencyId),
                            ]
                        })
                        if (lastOrgId) get().getByOrganization(lastOrgId)
                    } else {
                        set(s => {
                            s.errorMessage = (payload as any)?.message || 'Не удалось запустить экстренный показ'
                        })
                    }
                    break
                }

                case 'emergencyCancel': {
                    const ok = (payload && typeof payload === 'object' && !!(payload as any).emergencyId)
                        || ((payload as any)?.status === 'success')
                    if (ok) {
                        const emgId = (payload as any)?.emergencyId
                        set(s => {
                            s.successMessage = 'Экстренный показ завершён'
                        })
                        if (emgId) {
                            set(s => {
                                s.active = s.active.filter(e => e.emergencyId !== emgId)
                            })
                        } else if (lastOrgId) {
                            get().getByOrganization(lastOrgId)
                        }
                    } else {
                        set(s => {
                            s.errorMessage = (payload as any)?.message || 'Не удалось отменить экстренный показ'
                        })
                    }
                    break
                }
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

                // берём уже посчитанное
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
                    };
                    if (!newBlocksByScreen[screenId]) newBlocksByScreen[screenId] = [];
                    newBlocksByScreen[screenId].push(block);
                }

                const startMin = hhmmToMinutes(playlistStart)
                const endMin = hhmmToMinutes(playlistEnd)


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

                // setSuccess(`Добавлено ${newBlocks.length} …`);

                // selectedScreens.forEach(screenId => {
                //     const mapKey = isFixedSchedule
                //         ? 'scheduledFixedMap'
                //         : 'scheduledCalendarMap'
                //     set(s => {
                //         if (!s[mapKey][screenId]) s[mapKey][screenId] = []
                //         s[mapKey][screenId].push(...newBlocks)
                //     })
                // })
                //

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


            sendSchedule: async () => {

                if (!ws || ws.readyState !== WebSocket.OPEN) {
                    console.warn('WS[schedule] not connected or not open');
                    return;
                }

                const {
                    selectedScreens,
                    isFixedSchedule,
                    isRecurring,
                    scheduleId,
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
                        priority: b.priority,
                        screenId,
                        type: b.type
                    }))
                })

                const userId = typeof window !== 'undefined'
                    ? localStorage.getItem('userId')
                    : null


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
                const chunks = chunkArray(slots, CHUNK_SIZE)
                const totalChunks = chunks.length
                if (totalChunks === 0) return

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

            // по-умолчанию реклама выключена, но режим выбираем минуты
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

// ===== emergency  =====
            active: [],
            error: null,


            start: ({playlistId, screensId, isRecursing}) => {
                const ts = new Date().toISOString()
                console.log(`[${ts}] emergencyStart →`, {playlistId, screensId, isRecursing})
                if (!ws || ws.readyState !== WebSocket.OPEN) {
                    console.warn('WS[schedule] not connected or not open');
                    return;
                }
                set(s => {
                    s.successMessage = null;
                    s.errorMessage = null
                })

                ws.send(JSON.stringify({
                    action: 'emergencyStart',
                    data: {playlistId, screensId, isRecursing}
                }))
            },

            cancel: (emergencyId: string) => {
                if (!ws || ws.readyState !== WebSocket.OPEN) {
                    console.warn('WS[schedule] not connected or not open');
                    return;
                }
                set(s => {
                    s.successMessage = null;
                    s.errorMessage = null
                })
                ws.send(JSON.stringify({action: 'emergencyCancel', data: {emergencyId}}))
            },

            getByOrganization: (orgId: string) => {
                if (!ws || ws.readyState !== WebSocket.OPEN) {
                    console.warn('WS[schedule] not connected or not open');
                    return;
                }
                lastOrgId = orgId
                ws.send(JSON.stringify({action: 'getEmergencyByOrganization', data: {orgId}}))
            },
        }
    })
)