/*
 * Copyright (c) LLC "Centr Distribyucii"
 * All rights reserved.
 */

'use client';

import {create} from 'zustand'
import axios from 'axios'
import {addValueInStorage, getValueInStorage} from "@/app/API/localStorage";

// ===== Types matching the Kotlin models =====
export enum Grade {
    BASE = 'BASE',
    PRO = 'PRO',
    NONE = 'NONE',
}

export interface LicenseInfoRequest {
    userId: string
    orgId: string
    branchId: string
}

export interface LicenseInfoResponse {
    grade: Grade
    hasDealerCast: boolean
}

export interface SettingsUiState {
    licenseKey: string
    isApplying: boolean
    error: string | null
    applied: boolean
}

// ===== Helpers replacing Kotlin storage/network utils =====
const STORAGE_KEYS = {
    licenseKey: 'licenseKey',
    userId: 'userId',
} as const

// API base can be configured per app environment
const API_BASE = (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_SERVER_URL) || '/'

const api = axios.create({
    baseURL: API_BASE.replace(/\/$/, ''),
    withCredentials: true,
    headers: {'Content-Type': 'application/json'},
})

async function post(path: string, body: string): Promise<string> {
    try {
        const cleanPath = path.replace(/^\//, '')
        const res = await api.post<string>(`/${cleanPath}`,
            body,
            {responseType: 'text'}
        )
        return typeof res.data === 'string' ? res.data : JSON.stringify(res.data)
    } catch (err: any) {
        const data = err?.response?.data
        const message = typeof data === 'string' ? data : (data?.message || err?.message || 'Request failed')
        throw new Error(message)
    }
}

// Optional IP collector — safe fallback to undefined
async function getLocalIp(): Promise<string | undefined> {
    try {
        // In browser contexts, obtaining a local IP reliably is non‑trivial and often blocked.
        // Leave undefined; backend can capture request IP.
        return undefined
    } catch {
        return undefined
    }
}

// ===== Organization dependency surface (instead of Koin DI) =====
// You can wire this to your existing Organization store/ViewModel equivalents.
export type OrganizationInfo = { id: string }
export type Branch = { id: string }

export interface OrgDeps {
    // reactive getters
    getHasOrg: () => boolean
    getOrganizationInfo: () => OrganizationInfo | null
    getActiveBranches: () => Branch[]
    // subscribe to activeBranches changes; return unsubscribe
    subscribeActiveBranches?: (cb: (branches: Branch[]) => void) => () => void
}

let orgDeps: OrgDeps | null = null

export function connectOrganization(deps: OrgDeps) {
    orgDeps = deps
    // On connect, mirror the Kotlin init { collect(activeBranches) { getLicense() } }
    const unsub = deps.subscribeActiveBranches?.(() => {
        // Fire and forget
        useLicenseStore.getState().getLicense().catch(() => void 0)
    })
    return unsub // caller can dispose if needed
}

// ===== Zustand Store =====
export interface LicenseState extends SettingsUiState {
    hasDealerCast: boolean
    screenLicense: Grade
    onLicenseChange: (value: string) => void
    applyLicense: () => Promise<void>
    getLicense: () => Promise<void>
}

export const useLicenseStore = create<LicenseState>((set, get) => ({
    // SettingsUiState
    licenseKey: getValueInStorage(STORAGE_KEYS.licenseKey) || '',
    isApplying: false,
    error: null,
    applied: false,

    // Kotlin flows -> plain fields
    hasDealerCast: false,
    screenLicense: Grade.NONE,

    onLicenseChange: (value: string) => {
        set({licenseKey: value, error: null, applied: false})
    },

    applyLicense: async () => {
        const key = get().licenseKey.trim()

        addValueInStorage(STORAGE_KEYS.licenseKey, key)

        // simple validation (parity with Kotlin)
        if (!key) {
            set({error: 'Ключ не может быть пустым'})
            return
        }
        if (key.length < 10) {
            set({error: 'Слишком короткий ключ'})
            return
        }

        set({isApplying: true, error: null, applied: false})

        try {
            if (!orgDeps) throw new Error('Org deps are not connected')

            const org = orgDeps.getOrganizationInfo()
            const userId = getValueInStorage(STORAGE_KEYS.userId)
            if (!org || !userId) throw new Error('Нет данных организации или пользователя')

            const ip = await getLocalIp()

            const body = JSON.stringify({
                key,
                orgId: org.id,
                activatedBy: userId,
                ip, // backend can ignore undefined
                fingerprint: 'mobile-ui',
            })

            await post('licenses/keys/redeem', body)

            // Kotlin had delay(800); not strictly needed in UI, but we can mimic slight debounce
            await new Promise((r) => setTimeout(r, 250))

            await get().getLicense()

            set({isApplying: false, applied: true})
        } catch (e: any) {
            set({isApplying: false, error: e?.message || 'Не удалось применить лицензию'})
        }
    },

    getLicense: async () => {
        try {
            if (!orgDeps) return
            if (!orgDeps.getHasOrg()) return

            const userId = getValueInStorage(STORAGE_KEYS.userId)
            const org = orgDeps.getOrganizationInfo()
            const branches = orgDeps.getActiveBranches()
            if (!userId || !org || !branches?.[0]?.id) return

            const payload: LicenseInfoRequest = {
                userId,
                orgId: org.id,
                branchId: branches[0].id,
            }

            const responseText = await post('licenses/summary/info', JSON.stringify(payload))

            // Strict JSON parse similar to Kotlinx with ignoreUnknownKeys
            const parsed: LicenseInfoResponse = JSON.parse(responseText)

            set({
                applied: !!parsed.hasDealerCast,
                hasDealerCast: !!parsed.hasDealerCast,
                screenLicense: parsed.grade ?? Grade.NONE,
            })

            if (process.env.NODE_ENV !== 'production') {
                // eslint-disable-next-line no-console
                console.log(`grade=${parsed.grade}, hasDealerCast=${parsed.hasDealerCast}`)
            }
        } catch (e) {
            if (process.env.NODE_ENV !== 'production') {
                // eslint-disable-next-line no-console
                console.log('Ошибка запроса/парсинга:', e)
            }
        }
    },
}))

// ===== Standalone helpers to mirror Kotlin top-level functions =====
export function licenseControlSS(licenses: Grade[]): boolean {
    const value = useLicenseStore.getState().screenLicense
    return licenses.includes(value)
}

export function dealerCastControl(): boolean {
    return useLicenseStore.getState().hasDealerCast
}

