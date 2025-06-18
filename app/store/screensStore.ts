'use client'
import {create} from 'zustand'
import {immer} from 'zustand/middleware/immer'
import {FileItem, GroupData, ScreenData} from "@/public/types/interfaces";
import axios from "axios";
import {getValueInStorage} from "@/app/API/localStorage";
import {promises} from "node:dns";
import {sendConfirmPairing} from '../API/ws';

interface ScreensState {
    allScreens: ScreenData[]
    filteredScreens: ScreenData[]
    groups: GroupData[]

    // UI-состояния
    isCreatingGroup: boolean
    newGroupName: string
    selectedForNewGroup: string[]
    currentQuery: string
    currentGroupFilter: string

    // методы
    startCreateGroup: () => void
    cancelCreateGroup: () => void
    toggleNewGroupScreen: (screenId: string) => void
    saveGroup: () => void
    setNewGroupName: (name: string) => void
    filterScreens: (query: string, groupId: string) => void
    assignGroupsToScreen: (screenId: string, newGroupIds: string[]) => void

    addScreen: (screen: ScreenData) => void

    addPairingConfirm: (code: string) => Promise<void>

}

export const useScreensStore = create<ScreensState>()(
    immer((set, get) => ({

        allScreens: [
            {id: 'screen1', name: 'Экран 1', online: true, groupIds: [] as string[]},
            {id: 'screen2', name: 'Экран 2', online: false, groupIds: [] as string[]},
            {id: 'screen3', name: 'Экран 3', online: true, groupIds: [] as string[]},
            {id: 'screen4', name: 'Экран 4', online: false, groupIds: [] as string[]},
        ],
        filteredScreens: [] as ScreenData[],
        groups: [] as GroupData[],

        isCreatingGroup: false,
        newGroupName: '',
        selectedForNewGroup: [] as string[],
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

                // Назначаем всем выбранным экранам этот groupId
                state.allScreens.forEach(screen => {
                    if (state.selectedForNewGroup.includes(screen.id)) {
                        screen.groupIds.push(newId)
                    }
                })

                // Сброс UI-состояний
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
                    const matchesName = screen.name
                        .toLowerCase()
                        .includes(query.toLowerCase())
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
    }))
)
