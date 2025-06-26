'use client'
import {create} from 'zustand'
import {immer} from 'zustand/middleware/immer'
import {FileItem, GroupData, ScreenData} from "@/public/types/interfaces"
import {getValueInStorage} from "@/app/API/localStorage"
import {connectWebSocket, sendConfirmPairing} from '../API/ws'
import {StateCreator} from 'zustand'
import axios from "axios";

interface ScreensState {
    allScreens: ScreenData[]
    filteredScreens: ScreenData[]
    groups: GroupData[]

    isCreatingGroup: boolean
    newGroupName: string
    selectedForNewGroup: string[]
    currentQuery: string
    currentGroupFilter: string

    startCreateGroup: () => void
    cancelCreateGroup: () => void
    toggleNewGroupScreen: (screenId: string) => void
    saveGroup: () => void
    setNewGroupName: (name: string) => void
    filterScreens: (query: string, groupId: string) => void
    assignGroupsToScreen: (screenId: string, newGroupIds: string[]) => void
    addScreen: (screen: ScreenData) => void

    addPairingConfirm: (code: string) => Promise<void>

    getScreens: () => Promise<void>

    delScreen: (screenId: string) => Promise<void>

    connectWsForScreen: () => Promise<void>

    errorMessage: string | null
    setError: (msg: string | null) => void
}

const createScreensStore: StateCreator<ScreensState, [['zustand/immer', never]], [], ScreensState> = (set, get) => ({
    allScreens: [
        //{id: 'screen1', name: 'Экран 1', online: true, groupIds: [] as string[]},
//         {id: 'screen2', name: 'Экран 2', online: false, groupIds: [] as string[]},
//         {id: 'screen3', name: 'Экран 3', online: true, groupIds: [] as string[]},
//         {id: 'screen4', name: 'Экран 4', online: false, groupIds: [] as string[]},
    ] as ScreenData [],
    filteredScreens: [],
    groups: [],

    isCreatingGroup: false,
    newGroupName: '',
    selectedForNewGroup: [],
    currentQuery: '',
    currentGroupFilter: 'all',

    errorMessage: null,
    setError: (msg) => {
        set(state => {
            state.errorMessage = msg
        })
    },

    startCreateGroup: () => {
        set(state => {
            state.isCreatingGroup = true
            state.newGroupName = ''
            state.selectedForNewGroup = []
        })
    },

    cancelCreateGroup: () => {
        set(state => {
            state.isCreatingGroup = false
            state.newGroupName = ''
            state.selectedForNewGroup = []
        })
    },

    toggleNewGroupScreen: (screenId) => {
        set(state => {
            const idx = state.selectedForNewGroup.indexOf(screenId)
            if (idx >= 0) state.selectedForNewGroup.splice(idx, 1)
            else state.selectedForNewGroup.push(screenId)
        })
    },

    saveGroup: () => {
        set(state => {
            const name = state.newGroupName.trim()
            if (!name || state.selectedForNewGroup.length === 0) return

            const newId = `group${state.groups.length + 1}`
            state.groups.push({id: newId, name})

            state.allScreens.forEach(screen => {
                if (state.selectedForNewGroup.includes(screen.id)) {
                    // Инициализируем массив, если его нет
                    if (!Array.isArray(screen.groupIds)) {
                        screen.groupIds = []
                    }
                    screen.groupIds.push(newId)
                }
            })

            state.isCreatingGroup = false
            state.newGroupName = ''
            state.selectedForNewGroup = []
        })
        get().filterScreens(get().currentQuery, get().currentGroupFilter)
    },

    setNewGroupName: (name) => {
        set(state => {
            state.newGroupName = name
        })
    },

    filterScreens: (query, groupId) => {
        set(state => {
            state.currentQuery = query
            state.currentGroupFilter = groupId

            state.filteredScreens = state.allScreens.filter(screen => {
                const matchesName = screen.name.toLowerCase().includes(query.toLowerCase())
                const matchesGroup = groupId === 'all'
                    ? true
                    : groupId === 'nogroup'
                        ? screen.groupIds.length === 0
                        : screen.groupIds.includes(groupId)
                return matchesName && matchesGroup
            })
        })
    },

    assignGroupsToScreen: (screenId, newGroupIds) => {
        set(state => {
            const screen = state.allScreens.find(s => s.id === screenId)
            if (screen) {
                screen.groupIds = [...newGroupIds]
            }
        })
        get().filterScreens(get().currentQuery, get().currentGroupFilter)
    },

    addScreen: (screen) => {
        if (!Array.isArray(screen.groupIds)) {
            screen.groupIds = []
        }
        set(state => {
            state.allScreens.push(screen)
        })
        get().filterScreens(get().currentQuery, get().currentGroupFilter)
    },

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


    getScreens: async () => {
        try {
            const SERVER = process.env.NEXT_PUBLIC_SERVER_URL
            const userId = getValueInStorage("userId")
            const accessToken = getValueInStorage("accessToken")

            if (!userId || !accessToken) {
                get().setError("Не хватает данных для загрузки экранов. Пожалуйста, войдите в систему заново.")
                return
            }

            const res = await axios.get(`${SERVER}screens/owned/${userId}`,
                {headers: {Authorization: `Bearer ${accessToken}`}}
            )


            const screens: ScreenData[] = await res.data


            set(state => {
                state.filteredScreens = screens;
                state.allScreens = screens;
            })
        } catch (error: any) {
            console.error("Ошибка при загрузке экранов:", error)
            get().setError(error?.response?.data?.message || "Не удалось получить список экранов")
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
            }
        } catch (error: any) {
            console.error("Ошибка при удалении экрана:", error)
            get().setError(error?.response?.data?.message || "Не удалось удалить экран")
        }
    },

    connectWsForScreen: async () => {
        try {
            connectWebSocket((action, payload) => {

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


