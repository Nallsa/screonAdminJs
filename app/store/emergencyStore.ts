// app/store/emergencyStore.ts
'use client'
import {create} from 'zustand'
import {immer} from 'zustand/middleware/immer'
import {connectWebSocket, sendWS} from '@/app/API/ws'

export type EmergencyAdmin = {
    emergencyId: string
    playlistId: string
    isRecurring: boolean
    screens: string[]
}

interface EmergencyState {
    active: EmergencyAdmin[]
    error: string | null
    successMessage: string | null
    errorMessage: string | null
    setSuccess: (msg: string | null) => void
    setError: (msg: string | null) => void
    start: (args: { playlistId: string; screensId: string[]; isRecursing: boolean }) => void
    cancel: (emergencyId: string) => void
    getByOrganization: (orgId: string) => void
}

export const useEmergencyStore = create<EmergencyState, [["zustand/immer", never]]>(
    immer((set, get) => {
        let lastOrgId: string | null = null

        // Унификация формата входящего сообщения
        const unpack = (raw: any) => {
            const isRoot = raw && typeof raw === 'object' && ('status' in raw || 'payload' in raw || 'isChunked' in raw);
            return {status: isRoot ? raw.status : undefined, payload: isRoot ? raw.payload : raw, raw};
        };

        connectWebSocket('schedule', (action, incoming) => {
            const {status, payload} = unpack(incoming);

            switch (action) {
                case 'getEmergencyByOrganization': {
                    if (status === 'error') {
                        set(s => {
                            s.errorMessage = incoming?.message || 'Не удалось получить экстренные';
                        });
                        break;
                    }
                    const listRaw = Array.isArray(payload) ? payload : [];
                    const list = listRaw.map((it: any): EmergencyAdmin => ({
                        emergencyId: it.emergencyId || it.emrgencyId,
                        playlistId: it.playlistId,
                        isRecurring: Boolean(it.isRecursing),
                        screens: Array.isArray(it.screens) ? it.screens : [],
                    }));
                    set(s => {
                        s.active = list;
                    });
                    break;
                }

                case 'emergencyStart': {
                    const ok = status === 'success' || Boolean(payload?.emergencyId);
                    if (ok) {
                        set(s => {
                            s.successMessage = 'Экстренный показ запущен';
                        });
                        if (lastOrgId) get().getByOrganization(lastOrgId);
                    } else {
                        set(s => {
                            s.errorMessage = incoming?.message || 'Не удалось запустить экстренный показ';
                        });
                    }
                    break;
                }

                case 'emergencyCancel': {
                    const ok = status === 'success' || Boolean(payload?.emergencyId);
                    if (ok) {
                        const emgId = payload?.emergencyId;
                        set(s => {
                            s.successMessage = 'Экстренный показ отменён';
                        });
                        if (emgId) set(s => {
                            s.active = s.active.filter(e => e.emergencyId !== emgId);
                        });
                        else if (lastOrgId) get().getByOrganization(lastOrgId);
                    } else {
                        set(s => {
                            s.errorMessage = incoming?.message || 'Не удалось отменить экстренный показ';
                        });
                    }
                    break;
                }
            }
        });

        return {
            active: [],
            error: null,

            successMessage: null,
            errorMessage: null,
            setSuccess: msg => set(s => {
                s.successMessage = msg;
            }),
            setError: msg => set(s => {
                s.errorMessage = msg;
            }),

            start: ({playlistId, screensId, isRecursing}) => {
                const ts = new Date().toISOString(); // таймстамп для логов/бэка

                console.log(`[${ts}] emergencyStart →`, {playlistId, screensId, isRecursing});

                set(s => {
                    s.successMessage = null;
                    s.errorMessage = null;
                });

                sendWS('schedule', {
                    action: 'emergencyStart',
                    data: {playlistId, screensId, isRecursing}
                });
            },

            cancel: (emergencyId: string) => {
                set(s => {
                    s.successMessage = null;
                    s.errorMessage = null;
                });
                sendWS('schedule', {action: 'emergencyCancel', data: {emergencyId}});
            },

            getByOrganization: (orgId: string) => {
                lastOrgId = orgId;
                sendWS('schedule', {action: 'getEmergencyByOrganization', data: {orgId}});
            },
        };
    })
);
