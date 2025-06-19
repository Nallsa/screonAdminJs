'use client'
import {create} from 'zustand'
import {immer} from 'zustand/middleware/immer'
import {FileItem, GroupData, ScreenData} from "@/public/types/interfaces"
import {getValueInStorage} from "@/app/API/localStorage"
import {sendConfirmPairing} from '../API/ws'
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


}

// Тип creator с поддержкой immer
const createScreensStore: StateCreator<ScreensState, [['zustand/immer', never]], [], ScreensState> = (set, get) => ({
    allScreens: [] as ScreenData [],
    filteredScreens: [],
    groups: [],

    isCreatingGroup: false,
    newGroupName: '',
    selectedForNewGroup: [],
    currentQuery: '',
    currentGroupFilter: 'all',

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
        set(state => {
            state.allScreens.push(screen)
        })
        get().filterScreens(get().currentQuery, get().currentGroupFilter)
    },

    addPairingConfirm: async (code) => {
        try {
            const userId = getValueInStorage("userId")
            sendConfirmPairing(code, userId)
        } catch (error) {
            console.log("error", error)
        }
    },


    getScreens: async () => {
        try {
            const SERVER = process.env.NEXT_PUBLIC_SERVER_URL

            const userId = getValueInStorage("userId")
            const accessToken = getValueInStorage("accessToken")

            console.log(accessToken)

            const res = await axios.get(`${SERVER}screens/owned/${userId}`,
                {headers: {Authorization: `Bearer ${accessToken}`}}
            )


            const screens: ScreenData[] = await res.data




            set(state => {
                state.filteredScreens = screens;
                state.allScreens = screens;
            })

        } catch (e: any) {
        }


    }
})

// Сам store
export const useScreensStore = create<ScreensState>()(immer(createScreensStore))


