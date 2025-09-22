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
    isApplying: boolean
    error: string | null
    applied: boolean
    license: LICENSE

    onLicenseChange: (value: string) => void
    applyLicense: () => Promise<void>
    clearKey: () => void
    setLicense: (lic: LICENSE) => void
}


export const useSettingsStore = create<SettingsState>()(
    persist(
        (set, get) => ({
            licenseKey: getValueInStorage('licenseKey') ?? '',
            isApplying: false,
            error: null,
            applied: getValueInStorage('licenseKey') ? !!getValueInStorage('licenseKey') : false,
            license: LICENSE.BASE,

            onLicenseChange: (value) => set({ licenseKey: value, error: null, applied: false }),

            clearKey: () => set({ licenseKey: '', error: null, applied: false }),

            setLicense: (lic) => set({ license: lic }),

            applyLicense: async () => {
                const key = get().licenseKey.trim()

                // сохраняем ключ локально (аналог addValueInStorage)
                if (typeof window !== 'undefined') {
                    window.localStorage.setItem('licenseKey', key)
                }

                // валидация один-в-один с Kotlin
                if (key.length === 0) {
                    set({ error: 'Ключ не может быть пустым' })
                    return
                }
                if (key.length < 10) {
                    set({ error: 'Слишком короткий ключ' })
                    return
                }

                set({ isApplying: true, error: null, applied: false })
                try {
                    // TODO: вызов вашего API/репозитория (repository.activateLicense(key))
                    await new Promise((res) => setTimeout(res, 800)) // имитация delay(800)

                    set({ isApplying: false, applied: true })
                    // по желанию можно определить уровень лицензии:
                    // set({ license: LICENSE.ADVANCED })
                } catch (e: any) {
                    set({
                        isApplying: false,
                        error: e?.message ?? 'Не удалось применить лицензию',
                    })
                }
            },
        }),
        {
            name: 'license-store',
            partialize: (s) => ({ licenseKey: s.licenseKey, license: s.license }),
        }
    )
)

// Аналог функции licenseControl из Kotlin:
export const licenseControl = (licenses: LICENSE[]) => {
    const { license } = useSettingsStore.getState()
    return licenses.includes(license)
}
