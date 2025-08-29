// app/store/emergencyStore.ts
'use client'
import {create} from 'zustand'
import {immer} from 'zustand/middleware/immer'
import {connectWebSocket} from '@/app/API/ws'

export type EmergencyAdmin = {
    emergencyId: string
    playlistId: string
    isRecurring: boolean
    screens: string[]
}

interface EmergencyState {
    active: EmergencyAdmin[]
    error: string | null
    start: (args: { playlistId: string; screensId: string[]; isRecursing: boolean }) => void
    cancel: (emergencyId: string) => void
    getByOrganization: (orgId: string) => void
}

export const useEmergencyStore = create<EmergencyState, [["zustand/immer", never]]>(
    immer((set, get) => {
        let lastOrgId: string | null = null

        const ws = connectWebSocket('schedule', (action, payload, root?: any) => {
            // сервер шлёт { action, status, payload, isChunked }
            switch (action) {
                case 'getEmergencyByOrganization': {
                    // payload — это массив элементов
                    const listRaw = Array.isArray(payload) ? payload : []
                    const list = listRaw.map((it: any): EmergencyAdmin => ({
                        emergencyId: it.emergencyId || it.emrgencyId, // сервер может прислать с опечаткой
                        playlistId: it.playlistId,
                        isRecurring: Boolean(it.isRecursing),
                        screens: Array.isArray(it.screens) ? it.screens : [],
                    }))
                    set(s => {
                        s.active = list
                    })
                    break
                }

                case 'emergencyStart': {
                    // после старта просто подтягиваем свежий список по orgId
                    if (lastOrgId) get().getByOrganization(lastOrgId)
                    break
                }

                case 'emergencyCancel': {
                    // если пришёл success — обновим список
                    const emgId = payload?.emergencyId
                    if (emgId) {
                        set(s => {
                            s.active = s.active.filter(e => e.emergencyId !== emgId)
                        })
                    } else if (lastOrgId) {
                        get().getByOrganization(lastOrgId)
                    }
                    break
                }

                default:
                    break
            }
        })

        return {
            active: [],
            error: null,

            start: ({playlistId, screensId, isRecursing}) => {
                ws.send(JSON.stringify({
                    action: 'emergencyStart',
                    data: {playlistId, screensId, isRecursing}
                }))
            },

            cancel: (emergencyId: string) => {
                ws.send(JSON.stringify({
                    action: 'emergencyCancel',
                    data: {emergencyId}
                }))
            },

            getByOrganization: (orgId: string) => {
                lastOrgId = orgId
                ws.send(JSON.stringify({
                    action: 'getEmergencyByOrganization',
                    data: {orgId}
                }))
            },
        }
    })
)
