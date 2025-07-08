'use client'
import {create} from 'zustand'
import {immer} from 'zustand/middleware/immer'
import {FileItem, GroupData, ScreenData} from "@/public/types/interfaces"
import {getValueInStorage} from "@/app/API/localStorage"
import {connectWebSocket, sendConfirmPairing} from '../API/ws'
import {StateCreator} from 'zustand'
import axios from "axios";
import {useScheduleStore} from "@/app/store/scheduleStore";

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
    addPairingConfirm: (code: string) => Promise<void>

    errorMessage: string | null
    setError: (msg: string | null) => void
}

const createScreensStore: StateCreator<ScreensState, [['zustand/immer', never]], [], ScreensState> = (set, get) => ({

    allScreens: [],
    filteredScreens: [],
    groups: [],

    isCreatingGroup: false,
    newGroupName: '',
    selectedForNewGroup: [],

    currentQuery: '',
    currentGroupFilter: 'all',

    errorMessage: null,
    setError: msg => set(s => {
        s.errorMessage = msg
    }),

    startCreateGroup: () => set(s => {
        s.isCreatingGroup = true
        s.newGroupName = ''
        s.selectedForNewGroup = []
    }),

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
        // WebSocket pairing payload должен содержать уже screen.groupId
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

            if (!userId || !accessToken) {
                get().setError("Не хватает данных для загрузки экранов. Пожалуйста, войдите в систему заново.")
                return
            }

            const res = await axios.get(`${SERVER}screens/owned`,
                {headers: {Authorization: `Bearer ${accessToken}`}}
            )

            const screens: ScreenData[] = res.data

            console.log("Экраны", screens)


            set(state => {
                state.filteredScreens = screens;
                state.allScreens = screens;
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
            const userId = getValueInStorage("userId");
            const accessToken = getValueInStorage("accessToken");

            if (!userId || !accessToken) {
                get().setError("Не удалось удалить экран: отсутствуют данные пользователя или токен.")
                return
            }

            const data = {userId, screenId};

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
                });
                await useScheduleStore.getState().getSchedule()

            }
        } catch (error: any) {
            console.error("Ошибка при удалении экрана:", error)
            get().setError(error?.response?.data?.message || "Не удалось удалить экран")
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

            // 1) Создать новую группу
            const createRes = await axios.post(
                `${SERVER}screen-groups`,
                {name, description: ''},
                {headers: {Authorization: `Bearer ${token}`}}
            )
            const group: GroupData = createRes.data

            // 2) Добавить выбранные экраны в эту группу
            await axios.post(
                `${SERVER}screen-groups/${group.id}/adds`,
                selectedForNewGroup,
                {headers: {Authorization: `Bearer ${token}`}}
            )

            // 3) Локально обновить:
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
            })
            // пересчитать фильтр
            get().filterScreens(get().currentQuery, get().currentGroupFilter)

        } catch (e: any) {
            console.error('Ошибка создания группы:', e)
            get().setError(e?.response?.data?.message || 'Не удалось создать группу')
        }
    },

    // ==== WS PAIRING ====

    addPairingConfirm: async (code) => {
        try {
            const userId = getValueInStorage("userId")

            if (!userId) {
                get().setError("Пользователь не авторизован. Пожалуйста, войдите в систему.")
                return
            }

            sendConfirmPairing(code, userId)
        } catch (error: any) {
            console.error("Ошибка при подтверждении пары:", error)
            get().setError(error?.message || "Не удалось подтвердить код экрана")
        }
    },

    connectWsForScreen: async () => {
        try {
            connectWebSocket(`pairing`, (action, payload) => {

                switch (action) {
                    case 'PAIRING_CONFIRMED':

                        console.log("PAIRING_CONFIRMEDfsafasafsfas")

                        const screen: ScreenData = payload;

                        console.log("screen", screen)

                        set(state => {

                            state.allScreens.push(screen);

                            state.filteredScreens.push(screen);
                        });
                        break;

                    case 'ERROR':
                        console.error("Ошибка:", payload.message);
                        get().setError(payload.message || "Неизвестная ошибка");
                        break;

                    default:
                        console.warn("Неизвестный action:", action);
                }
            });

        } catch (e: any) {
            console.error("Ошибка при удалении экрана:", e);
        }
    }


})

// Сам store
export const useScreensStore = create<ScreensState>()(immer(createScreensStore))


