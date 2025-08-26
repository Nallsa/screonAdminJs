// app/store/emergencyStore.ts
'use client'
import {create} from 'zustand'
import {immer} from 'zustand/middleware/immer'
import {connectWebSocket} from '@/app/API/ws'
import type {EmergencyAdmin, EmergencyStartArgs, EmergencyCancelArgs} from '@/app/types/emergency'

interface EmergencyState {
    active: EmergencyAdmin[]
    error: string | null
    start: (args: EmergencyStartArgs) => void
    cancel: (args: EmergencyCancelArgs) => void
    getByUser: (userId: string) => void
}

export type EmergencyAdmin = {
    emergencyId: string
    playlistId: string
    isRecurring: boolean
    screens: string[]
    groupId?: string | null
    startedAt?: number
}

export type EmergencyStartArgs = {
    userId: string
    playlistId: string
    isRecurring: boolean
    targets: { screenIds?: string[]; groupId?: string | null }
}

export type EmergencyCancelArgs = {
    userId: string
    emergencyId?: string
}

export const useEmergencyStore = create<EmergencyState, [["zustand/immer", never]]>(
    immer((set, get) => {
        const ws = connectWebSocket('schedule', (action, payload) => {
            switch (action) {
                case 'getEmergencyByUser': {
                    const list = (payload?.emergencies ?? []) as EmergencyAdmin[]
                    set(s => {
                        s.active = list
                    })
                    break
                }
                case 'emergencyStart': {
                    // сервер оповестил — просто запросим актуальный список
                    // (если хочется — можно из payload собрать частично)
                    break
                }
                case 'emergencyCancel': {
                    // тоже обновим список запросом
                    break
                }
                // на ошибки сервера можно добавить action: 'error'
            }
        })

        return {
            active: [],
            error: null,

            start: (args) => {
                ws.send(JSON.stringify({action: 'emergencyStart', payload: args}))
                // опционально сразу: get().getByUser(args.userId)
            },

            cancel: (args) => {
                ws.send(JSON.stringify({action: 'emergencyCancel', payload: args}))
                // опционально сразу: get().getByUser(args.userId)
            },

            getByUser: (userId: string) => {
                ws.send(JSON.stringify({action: 'getEmergencyByUser', payload: {userId}}))
            },
        }
    })
)
