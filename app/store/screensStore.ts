/*
 * Copyright (c) LLC "Centr Distribyucii"
 * All rights reserved.
 */

'use client'
import {create} from 'zustand'
import {immer} from 'zustand/middleware/immer'
import {FileItem, GroupData, LiveStatus, ScreenData, UpdateInfoDto} from "@/public/types/interfaces"
import {getValueInStorage} from "@/app/API/localStorage"
import {connectWebSocket, sendConfirmPairing, sendUnpairScreen} from '../API/ws'
import {StateCreator} from 'zustand'
import axios from "axios";
import {useScheduleStore} from "@/app/store/scheduleStore";
import {useOrganizationStore} from "@/app/store/organizationStore";
import {useLicenseStore} from "@/app/store/licenseStore";


export type StatusEntry = LiveStatus & {
    screenId: string;
    receivedAt: number;
};

interface ScreensState {
    allScreens: ScreenData[]
    filteredScreens: ScreenData[]
    groups: GroupData[]

    // для формы создания группы
    isCreatingGroup: boolean
    newGroupName: string
    selectedForNewGroup: string[]

    startCreateGroup: () => void
    cancelCreateGroup: () => void
    setNewGroupName: (name: string) => void
    toggleNewGroupScreen: (screenId: string) => void

    currentQuery: string
    currentGroupFilter: string

    // CRUD группы
    getGroups: () => Promise<void>
    saveGroup: () => Promise<void>

    // CRUD экранов
    getScreens: () => Promise<void>
    addScreen: (screen: ScreenData) => void
    delScreen: (screenId: string) => Promise<void>
    updateScreenName: (screenId: string, newName: string) => void
    assignGroupToScreen: (screenId: string, groupId: string | null) => Promise<void>

    // фильтрация и утилиты
    filterScreens: (query: string, groupId: string) => void

    // WS pairing
    connectWsForScreen: () => Promise<void>
    addPairingConfirm: (code: string, licenseKey: string, branchId?: string) => Promise<void>
    unpairScreen: (screenId: string) => Promise<void>;


    //Status
    statusByScreen: Record<string, StatusEntry>;
    setStatusForScreen: (screenId: string, st: LiveStatus) => void;
    isScreenOnline: (screenId: string) => boolean;

    sendGetStatus: (screenId: string) => Promise<void>;
    requestStatusesForAll: () => Promise<void>;

    startAutoStatusPolling: (intervalMs?: number) => void;
    stopAutoStatusPolling: () => void;

    latestPlayerVersionName: string | null
    latestPlayerVersionFetchedAt: number | null

    getLatestPlayerVersionName: (opts?: {
        app?: string; channel?: string; versionCode?: number; sdk?: number;
    }) => Promise<void>

    needsUpdate: (screenId: string) => boolean

    //errors
    errorMessage: string | null
    setError: (msg: string | null) => void

    successMessage: string | null,
    setSuccess: (msg: string | null) => void,

    selectedScreen: ScreenData | null;
    successConnectScreen: boolean;

    setSelectedScreen: (screen: ScreenData) => void;

    remoteRegister: () => Promise<void>;
    sendTextEvent: (value: string) => Promise<void>;
    sendKeyClick: (key: string) => Promise<void>;
}

const createScreensStore: StateCreator<ScreensState, [['zustand/immer', never]], [], ScreensState> = (set, get) => {


    const REPLY_WINDOW_MS = 4000;
    const pendingStatusReqs: Array<{ screenId: string; ts: number }> = [];

    const POLL_DEFAULT_MS = 300_000;
    let pollTimer: any = null;

    function markStatusRequested(screenId: string) {
        const now = Date.now();
        pendingStatusReqs.push({ screenId, ts: now });
        while (pendingStatusReqs.length && now - pendingStatusReqs[0].ts > REPLY_WINDOW_MS) pendingStatusReqs.shift();
    }

    // ==== WS для статусов ====
    const statusWs = connectWebSocket('status', (actionIn, payloadIn) => {
        const raw = payloadIn;
        const payload = raw?.payload ?? raw;

        if (!payload.screenId) return;

        const status = (payload.status ?? payload.networkState ?? payload.network_state)?.toLowerCase?.();

        get().setStatusForScreen(String(payload.screenId), {
            status,
            temperature: payload.temperature,
            cpuLoad: payload.cpuLoad ?? payload.cpu_load,
            ramUsage: payload.ramUsage ?? payload.ram_usage,
            playerVersion: payload.playerVersion ?? payload.player_version,
            lastSeenAt: payload.lastSeenAt ?? payload.last_seen_at,
            orientation: payload.orientation,
            isRealTime: payload.isRealTime === true,
        });
    });

    const pairingWs = connectWebSocket('pairing', (action, payload) => {
        const getMsg = () =>
            payload?.message ??
            payload?.error ??
            payload?.reason ??
            (typeof payload === 'string' ? payload : null);

        switch (action) {
            // ==== ПРЕЖНИЕ кейсы ПЭЙРИНГА ====
            case 'PAIRING_CONFIRMED': {
                console.log("PAIRING_CONFIRMED");

                const screen: ScreenData = payload;
                console.log("screen", screen);

                const licDeps = useLicenseStore.getState();
                licDeps.getLicense();

                set(state => {
                    state.allScreens.push(screen);
                    state.filteredScreens.push(screen);
                    state.successMessage = 'Экран успешно добавлен';
                    state.errorMessage = null;
                });
                break;
            }

            case 'SCREEN_UNPAIRED': {
                const sid = payload?.screenId ?? payload?.id;

                set(state => {
                    state.allScreens = state.allScreens.filter(s => s.id !== sid);
                    state.filteredScreens = state.filteredScreens.filter(s => s.id !== sid);
                    state.successMessage = 'Экран удалён';
                    state.errorMessage = null;
                });

                useScheduleStore.getState().getSchedule();
                break;
            }

            // ==== REMOTE-ответы по тому же каналу ====
            case 'REMOTE_REGISTERED':
            case 'REMOTE_READY':
            case 'REMOTE_OK': {
                set(s => {
                    s.successConnectScreen = true;
                });
                break;
            }

            case 'ERROR': {
                // это и ошибка pairing, и ошибка remote — текст общий
                const msg = getMsg() ?? 'Не удалось выполнить операцию с экраном';
                get().setError(msg);
                break;
            }
        }
    });

    // helper: подождать, пока сокет откроется
    const waitOpen = (ws: WebSocket) =>
        ws.readyState === WebSocket.OPEN
            ? Promise.resolve()
            : new Promise<void>(resolve => {
                const h = () => {
                    ws.removeEventListener('open', h);
                    resolve();
                };
                ws.addEventListener('open', h, { once: true });
            });

    // общий helper для REMOTE_EVENT (аналог sendRemoteEvent в Kotlin)
    async function sendRemoteEvent(payload: Record<string, any>) {
        try {
            if (!pairingWs) {
                get().setError("Нет соединения с сервером. Повторите позже.");
                return;
            }

            if (pairingWs.readyState !== WebSocket.OPEN) {
                await waitOpen(pairingWs);
            }

            const req = {
                action: "REMOTE_EVENT",
                payload,
            };

            console.log("send REMOTE_EVENT", req);
            pairingWs.send(JSON.stringify(req));
        } catch (e: any) {
            console.error("Ошибка REMOTE_EVENT:", e);
            get().setError(e?.message || "Не удалось отправить команду на экран");
        }
    }


    return {
        allScreens: [],
        filteredScreens: [],
        groups: [],

        isCreatingGroup: false,
        newGroupName: '',
        selectedForNewGroup: [],

        currentQuery: '',
        currentGroupFilter: 'all',

        statusByScreen: {},

        errorMessage: null,
        successMessage: null,


        setError: msg => set(s => {
            s.errorMessage = msg
        }),
        setSuccess: msg => set(s => {
            s.successMessage = msg
        }),

        startCreateGroup: () => {
            const {activeBranches} = useOrganizationStore.getState?.() ?? {
                activeBranches: [] as Array<{
                    id: string
                }>
            }

            if (activeBranches.length > 1) {
                get().setError("Чтобы создать группу, выберите один филиал в настройках организации")
                return
            }

            set(s => {
                s.isCreatingGroup = true
                s.newGroupName = ''
                s.selectedForNewGroup = []
            })
        }
        ,

        cancelCreateGroup: () => set(s => {
            s.isCreatingGroup = false
            s.newGroupName = ''
            s.selectedForNewGroup = []
        }),

        setNewGroupName: (name: string) => set(s => {
            s.newGroupName = name
        }),

        toggleNewGroupScreen: (screenId: string) => set(s => {
            const idx = s.selectedForNewGroup.indexOf(screenId)
            if (idx >= 0) s.selectedForNewGroup.splice(idx, 1)
            else s.selectedForNewGroup.push(screenId)
        }),

        // ==== ФИЛЬТРАЦИЯ ====
        filterScreens: (query, groupId) => {
            set(s => {
                s.currentQuery = query
                s.currentGroupFilter = groupId

                s.filteredScreens = s.allScreens.filter(scr => {
                    const byName = scr.name.toLowerCase().includes(query.toLowerCase())
                    if (!byName) return false

                    if (groupId === 'all') return true
                    if (groupId === 'nogroup') return scr.groupId === null

                    return scr.groupId === groupId
                })
            })
        },

        // ==== ЭКРАНЫ ====

        addScreen: screen => {
            set(s => {
                s.allScreens.push({...screen, groupId: screen.groupId ?? null})
                s.filteredScreens.push({...screen, groupId: screen.groupId ?? null})
            })
            get().filterScreens(get().currentQuery, get().currentGroupFilter)
        },


        getScreens: async () => {
            try {
                const SERVER = process.env.NEXT_PUBLIC_SERVER_URL
                const userId = getValueInStorage("userId")
                const accessToken = getValueInStorage("accessToken")

                console.log(accessToken)

                const {activeBranches} = useOrganizationStore.getState?.() ?? {
                    activeBranches: [] as Array<{
                        id: string
                    }>
                }

                if (!userId || !accessToken) {
                    get().setError("Не хватает данных для загрузки экранов. Пожалуйста, войдите в систему заново.")
                    return
                }

                // if (activeBranches.length < 1) {
                //     get().setError("У вас не выбран(ы) филиал(ы)")
                // }

                const branchIds = Array.isArray(activeBranches) ? activeBranches.map(b => b.id) : []

                const res = await axios.post(
                    `${SERVER}screens/owned`,
                    {branchIds},
                    {headers: {Authorization: `Bearer ${accessToken}`}},
                )

                const screens: ScreenData[] = res.data

                console.log("Экраны", screens)

                set(state => {
                    state.filteredScreens = screens;
                    state.allScreens = screens;
                })

                await get().getLatestPlayerVersionName({
                    app: 'player',
                    channel: 'stable',
                    versionCode: 1,
                    sdk: 21,
                })
            } catch (error: any) {
                console.error("Ошибка при загрузке экранов:", error)
                get().setError(error?.response?.data?.message || "Не удалось получить список экранов")
            }
        },

        updateScreenName: async (screenId, newName) => {
            try {
                const SERVER = process.env.NEXT_PUBLIC_SERVER_URL
                const token = getValueInStorage('accessToken')
                if (!token) throw new Error('Нет токена')

                // сам запрос на сервер
                await axios.put(
                    `${SERVER}screens/${screenId}`,
                    {name: newName},
                    {headers: {Authorization: `Bearer ${token}`}}
                )

                // если всё ок — обновляем локальный стейт
                set(state => {
                    const scr = state.allScreens.find(s => s.id === screenId)
                    if (scr) scr.name = newName
                })
                // пересчитаем фильтр
                get().filterScreens(get().currentQuery, get().currentGroupFilter)
            } catch (e: any) {
                console.error('Ошибка обновления имени экрана:', e)
                get().setError(e?.response?.data?.message || 'Не удалось обновить имя экрана')
            }
        },


        delScreen: async (screenId) => {
            try {
                const SERVER = process.env.NEXT_PUBLIC_SERVER_URL;
                const actorUserId = getValueInStorage("userId");
                const accessToken = getValueInStorage("accessToken");

                const {activeBranches} = useOrganizationStore.getState?.() ?? {
                    activeBranches: [] as Array<{
                        id: string
                    }>
                }
                const actorRole = useOrganizationStore.getState?.().role ?? ''
                const actorOrgId = getValueInStorage('organizationId')
                const actorBranchId = activeBranches[0].id

                if (!actorUserId || !accessToken) {
                    get().setError("Не удалось удалить экран: отсутствуют данные пользователя или токен.")
                    return
                }

                const data = {screenId, actorUserId, actorRole, actorOrgId, actorBranchId};

                const res = await axios.delete(`${SERVER}screens/unpair`, {
                    data: data,
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                });

                if (res.status === 200) {
                    set(state => {
                        state.allScreens = state.allScreens.filter(screen => screen.id !== screenId);
                        state.filteredScreens = state.filteredScreens.filter(screen => screen.id !== screenId);
                        state.successMessage = 'Экран удалён';
                        state.errorMessage = null;
                    });
                    await useScheduleStore.getState().getSchedule()

                }
            } catch (error: any) {
                console.error("Ошибка при удалении экрана:", error)
                get().setError(error?.response?.data?.message || "Не удалось удалить экран")
            }
        },

        unpairScreen: async (screenId: string) => {
            try {
                const actorUserId = getValueInStorage("userId");
                const actorOrgId = getValueInStorage("organizationId") ?? null;
                const actorRole = useOrganizationStore.getState?.().role ?? '';
                const activeBranches = useOrganizationStore.getState?.().activeBranches ?? [];
                const actorBranchId = activeBranches?.[0]?.id ?? null;

                if (!actorUserId) {
                    get().setError("Пользователь не авторизован");
                    return;
                }

                sendUnpairScreen({
                    screenId,
                    actorUserId,
                    actorRole,
                    actorOrgId,
                    actorBranchId,
                });
            } catch (e: any) {
                console.error("Ошибка при отправке UNPAIR_SCREEN:", e);
                get().setError(e?.message || "Не удалось отвязать экран");
            }
        },

        // ==== ГРУППЫ ====

        assignGroupToScreen: async (screenId, groupId) => {
            try {
                const SERVER = process.env.NEXT_PUBLIC_SERVER_URL
                const token = getValueInStorage('accessToken')
                if (!token) throw new Error('Нет токена')

                if (groupId) {
                    await axios.post(
                        `${SERVER}screen-groups/${groupId}/adds`,
                        [screenId],
                        {headers: {Authorization: `Bearer ${token}`}}
                    )
                }

                set(s => {
                    const scr = s.allScreens.find(x => x.id === screenId)
                    if (scr) scr.groupId = groupId
                    s.successMessage = 'Информация об экране обновлена';
                    s.errorMessage = null;
                })
                get().filterScreens(get().currentQuery, get().currentGroupFilter)

            } catch (e: any) {
                console.error('Ошибка назначения группы:', e)
                get().setError(e?.response?.data?.message || 'Не удалось обновить группу')
            }
        },

        getGroups: async () => {
            try {
                const SERVER = process.env.NEXT_PUBLIC_SERVER_URL
                const token = getValueInStorage('accessToken')
                if (!token) throw new Error('Нет токена')

                const response = await axios.get<GroupData[]>(
                    `${SERVER}screen-groups`,
                    {headers: {Authorization: `Bearer ${token}`}}
                )
                const groups = response.data

                set(s => {
                    s.groups = groups as GroupData[]
                })
            } catch (e: any) {
                console.error('Ошибка загрузки групп:', e)
                get().setError(e?.response?.data?.message || 'Не удалось получить группы')
            }
        },

        saveGroup: async () => {
            const {newGroupName, selectedForNewGroup} = get()
            const name = newGroupName.trim()
            if (!name || selectedForNewGroup.length === 0) return

            try {
                const SERVER = process.env.NEXT_PUBLIC_SERVER_URL
                const token = getValueInStorage('accessToken')
                if (!token) throw new Error('Нет токена')

                //  Создать новую группу
                const createRes = await axios.post(
                    `${SERVER}screen-groups`,
                    {name, description: ''},
                    {headers: {Authorization: `Bearer ${token}`}}
                )
                const group: GroupData = createRes.data

                //  Добавить выбранные экраны в эту группу
                await axios.post(
                    `${SERVER}screen-groups/${group.id}/adds`,
                    selectedForNewGroup,
                    {headers: {Authorization: `Bearer ${token}`}}
                )

                //  Локально обновить:
                set(s => {
                    s.groups.push(group)
                    // у каждого добавленного экрана записать его groupId
                    s.allScreens = s.allScreens.map(screen =>
                        selectedForNewGroup.includes(screen.id)
                            ? {...screen, groupId: group.id}
                            : screen
                    )
                    // сброс формы
                    s.isCreatingGroup = false
                    s.newGroupName = ''
                    s.selectedForNewGroup = []
                    s.successMessage = 'Группа создана';
                    s.errorMessage = null;
                })
                // пересчитать фильтр
                get().filterScreens(get().currentQuery, get().currentGroupFilter)

            } catch (e: any) {
                console.error('Ошибка создания группы:', e)
                get().setError(e?.response?.data?.message || 'Не удалось создать группу')
            }
        },

        // ==== WS PAIRING ====

        addPairingConfirm: async (code, licenseKey, branchId) => {
            try {
                const userId = getValueInStorage("userId")
                if (!userId) {
                    get().setError("Пользователь не авторизован. Пожалуйста, войдите в систему.")
                    return
                }

                sendConfirmPairing(code, licenseKey, userId, branchId || null)
            } catch (error: any) {
                console.error("Ошибка при подтверждении пары:", error)
                get().setError(error?.message || "Не удалось подтвердить код экрана")
            }
        },

        connectWsForScreen: async () => {
            try {
                if (!pairingWs) {
                    get().setError("Нет WebSocket соединения для pairing");
                    return;
                }
                if (pairingWs.readyState !== WebSocket.OPEN) {
                    await waitOpen(pairingWs);
                }
            } catch (e: any) {
                console.error("Ошибка при соединении с экраном:", e);
                get().setError(e?.message || "Не удалось подключиться к серверу");
            }
        },
        //====================STATUS==================

        latestPlayerVersionName: null,
        latestPlayerVersionFetchedAt: null,

        needsUpdate: (screenId) => {
            const latest = get().latestPlayerVersionName?.trim();
            const pv = get().statusByScreen[screenId]?.playerVersion?.trim();
            if (!latest || !pv) return false;
            return pv !== latest;
        },

        setStatusForScreen: (screenId, st) =>
            set(s => {
                s.statusByScreen[screenId] = {
                    ...s.statusByScreen[screenId],
                    ...st,
                    screenId,
                    receivedAt: Date.now(),
                };
            }),

        isScreenOnline: (screenId) => {
            const e = get().statusByScreen[screenId];
            if (!e || !e.status) return false;
            const s = String(e.status).toLowerCase();
            return s === 'online' || s === 'connected' || s === 'ok';
        },

        startAutoStatusPolling: (intervalMs = POLL_DEFAULT_MS) => {
            if (typeof window === 'undefined') return;
            if (pollTimer) return;
            get().requestStatusesForAll();
            pollTimer = setInterval(() => {
                get().requestStatusesForAll();
            }, intervalMs);
        },

        stopAutoStatusPolling: () => {
            if (pollTimer) {
                clearInterval(pollTimer);
                pollTimer = null;
            }
        },

        sendGetStatus: async (screenId) => {
            if (!statusWs) return;
            const waitOpen = (ws: WebSocket) => ws.readyState === WebSocket.OPEN
                ? Promise.resolve()
                : new Promise<void>(r => {
                    const h = () => {
                        ws.removeEventListener('open', h);
                        r();
                    };
                    ws.addEventListener('open', h, {once: true});
                });

            if (statusWs.readyState !== WebSocket.OPEN) await waitOpen(statusWs);

            markStatusRequested(screenId);
            statusWs.send(JSON.stringify({action: 'GET_STATUS', screenId}));
        },

        requestStatusesForAll: async () => {
            const ids = get().allScreens.map(s => s.id);
            await Promise.all(
                ids.map((id, i) =>
                    new Promise<void>(res =>
                        setTimeout(async () => {
                            await get().sendGetStatus(id);
                            res();
                        }, i * 300)
                    )
                )
            );
        },

        getLatestPlayerVersionName: async (opts) => {
            try {
                const SERVER = process.env.NEXT_PUBLIC_SERVER_URL

                const app = opts?.app ?? 'player'
                const channel = opts?.channel ?? 'stable'
                const versionCode = opts?.versionCode ?? 1
                const sdk = opts?.sdk ?? 21

                const {data} = await axios.get<UpdateInfoDto>(`${SERVER}updates`, {
                    params: {app, channel, versionCode, sdk},
                })

                set(s => {
                    s.latestPlayerVersionName = data.versionName?.trim() || null
                    s.latestPlayerVersionFetchedAt = Date.now() // можно оставить/игнорировать
                })
            } catch (error: any) {
                if (process.env.NODE_ENV !== 'production') {
                    console.warn('Не удалось получить последнюю версию плеера', error)
                }
            }
        },


        // Console remote

        selectedScreen: null,
        successConnectScreen: false,

        setSelectedScreen: (screen) => {
            set(s => {
                s.selectedScreen = screen;
                s.successConnectScreen = false;  // сбрасываем флаг при смене экрана
            });
            void get().remoteRegister();
        },

        // ====== remoteRegister
        remoteRegister: async () => {
            try {
                const screen = get().selectedScreen;
                if (!screen?.id) {
                    get().setError("Сначала выберите экран");
                    return;
                }

                if (!pairingWs) {
                    get().setError("Нет соединения с сервером. Повторите позже.");
                    return;
                }

                if (pairingWs.readyState !== WebSocket.OPEN) {
                    await waitOpen(pairingWs);
                }

                const req = {
                    action: "REMOTE_REGISTER",
                    payload: {
                        screenId: screen.id,
                    },
                };

                console.log("send REMOTE_REGISTER", req);
                pairingWs.send(JSON.stringify(req));
            } catch (e: any) {
                console.error("Ошибка REMOTE_REGISTER:", e);
                get().setError(e?.message || "Не удалось: " + (e?.message ?? ""));
            }
        },

        // ---------- TEXT event ---------- //
        sendTextEvent: async (value: string) => {
            const v = value.trim();
            if (!v) return;

            const payload = {
                eventType: "TEXT",
                value: v,
            };
            await sendRemoteEvent(payload);
        },

        // ---------- KEY CLICK event ---------- //
        sendKeyClick: async (key: string) => {
            const payload = {
                eventType: "KEY",
                key,
                action: "CLICK",
            };
            await sendRemoteEvent(payload);
        },
    }
}
export const useScreensStore = create<ScreensState>()(immer(createScreensStore))


