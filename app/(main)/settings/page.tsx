'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {useSettingsStore} from "@/app/store/settingsStore";
import {useOrganizationStore} from "@/app/store/organizationStore";
import {useAuthStore} from "@/app/store/authStore";
import {Button} from "react-bootstrap";

export default function SettingsPage() {
    const router = useRouter()

    // ваш существующий глобальный стор для модалок ошибок
    const {   licenseKey,
        isApplying,
        error,
        applied,
        onLicenseChange,
        applyLicense,
        clearKey, } = useSettingsStore()

    const { hasOrg } = useOrganizationStore()
    const signOut = useAuthStore((s) => s.signOut)

    const handleLogout = () => {
        signOut()
        router.push('/auth/login')
    }

    useEffect(() => {
        if (!hasOrg) {
            router.push('/organization')
        }
    }, [hasOrg, router])

    return (
        <div className="p-6 max-w-xl mx-auto space-y-6">
            {/* === Блок: Лицензия (порт из Kotlin) === */}
            {/*<section className="border rounded-2xl overflow-hidden">*/}
            {/*    <div className="p-4 border-b">*/}
            {/*        <h2 className="text-base font-semibold">Лицензия</h2>*/}
            {/*    </div>*/}

            {/*    <div className="p-4 space-y-3">*/}
            {/*        <label className="block text-sm text-muted-foreground">*/}
            {/*            Введите ключ лицензии*/}
            {/*        </label>*/}

            {/*        <div className="flex gap-2">*/}
            {/*            <input*/}
            {/*                value={licenseKey}*/}
            {/*                onChange={(e) => onLicenseChange(e.target.value)}*/}
            {/*                placeholder="XXXX-XXXX-XXXX-XXXX"*/}
            {/*                className="flex-1 h-11 px-3 rounded-lg border outline-none me-3"*/}
            {/*            />*/}

            {/*            <Button*/}
            {/*                onClick={applyLicense}*/}
            {/*                disabled={!licenseKey || isApplying}*/}
            {/*                className="h-11 px-4 me-3"*/}
            {/*            >*/}
            {/*                {isApplying ? 'Применяю…' : 'Применить'}*/}
            {/*            </Button>*/}

            {/*            <Button*/}
            {/*                variant="outline"*/}
            {/*                onClick={clearKey}*/}
            {/*                disabled={!licenseKey || isApplying}*/}
            {/*                className="h-11 px-4"*/}
            {/*            >*/}
            {/*                Очистить*/}
            {/*            </Button>*/}
            {/*        </div>*/}

            {/*        <p className={`text-sm ${error ? 'text-red-600' : applied ? 'text-green-600' : 'text-muted-foreground'}`}>*/}
            {/*            {error*/}
            {/*                ? error*/}
            {/*                : applied*/}
            {/*                    ? 'Лицензия успешно применена'*/}
            {/*                    : 'Ключ не передавайте третьим лицам'}*/}
            {/*        </p>*/}
            {/*    </div>*/}
            {/*</section>*/}

            {/* === Блок: Выход (как в Kotlin) === */}
            <section className="border rounded-2xl overflow-hidden">
                <div className="p-4 flex justify-between items-center">
                    <Button variant="outline-danger px-5" onClick={handleLogout}>
                        Выйти
                    </Button>
                </div>
            </section>

            {/* Ваш существующий модал с ошибкой глобального стора */}
                {/*<ErrorModal*/}
                {/*    show={!!errorMessage}*/}
                {/*    message={errorMessage || ''}*/}
                {/*    onClose={() => setError(null)}*/}
                {/*/>*/}
        </div>
    )
}
