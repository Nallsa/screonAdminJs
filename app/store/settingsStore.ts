/*
 * Copyright (c) LLC "Centr Distribyucii"
 * All rights reserved.
 */

// store/settings.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {getValueInStorage} from "@/app/API/localStorage";

export enum LICENSE {
    BASE = 'BASE',
    ADVANCED = 'ADVANCED',
    ULTIMATE = 'ULTIMATE',
}

type SettingsState = {
    licenseKey: string
}


export const useSettingsStore = create<SettingsState>()(
    persist(
        (set, get) => ({
            licenseKey: getValueInStorage('licenseKey') ?? '',
        }),
        {
            name: 'license-store',
            partialize: (s) => ({ licenseKey: s.licenseKey }),
        }
    )
)

