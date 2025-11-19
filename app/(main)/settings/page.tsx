/*
 * Copyright (c) LLC "Centr Distribyucii"
 * All rights reserved.
 */

'use client'

import {useCallback, useEffect} from 'react'
import {useRouter} from 'next/navigation'
import {useSettingsStore} from "@/app/store/settingsStore";
import {useOrganizationStore} from "@/app/store/organizationStore";
import {useAuthStore} from "@/app/store/authStore";
import {Button} from "react-bootstrap";
import {useLicenseStore} from "@/app/store/licenseStore";
import {UserRole} from "@/public/types/interfaces";

export default function SettingsPage() {
    const router = useRouter()

    // org / auth
    const hasOrg = useOrganizationStore((s) => s.hasOrg)
    const signOut = useAuthStore((s) => s.signOut)

    // license store
    const licenseKey = useLicenseStore((s) => s.licenseKey)
    const isApplying = useLicenseStore((s) => s.isApplying)
    const error = useLicenseStore((s) => s.error)
    const applied = useLicenseStore((s) => s.applied)
    const onChangeKey = useLicenseStore((s) => s.onLicenseChange)
    const applyLicense = useLicenseStore((s) => s.applyLicense)
    const {
        role
    } = useOrganizationStore();

    const isSuccess = applied && !error

    const handleLogout = useCallback(() => {
        signOut()
        router.push('/auth/login')
    }, [router, signOut])

    // useEffect(() => {
    //     if (!hasOrg) router.push('/organization')
    // }, [hasOrg, router])

    const handleApply = useCallback(async () => {
        // аналог focus.clearFocus() — снимаем фокус, чтобы скрыть клавиатуру/снять курсор
        if (typeof document !== 'undefined') (document.activeElement as HTMLElement | null)?.blur()
        await applyLicense()
    }, [applyLicense])

    return (
        <div className="p-6 max-w-xl mx-auto space-y-6">
            {/* === Блок: Лицензия === */}
        {/*    {UserRole.OWNER == role && hasOrg && (*/}
        {/*        <section className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">*/}
        {/*            <div className="p-5 sm:p-6 space-y-5">*/}
        {/*                <div className="flex items-center justify-between">*/}
        {/*                    <h2 className="text-base sm:text-lg font-semibold text-gray-900">Лицензия</h2>*/}
        {/*                    /!* состояние справа — факультативно *!/*/}
        {/*                    {isSuccess && (*/}
        {/*                        <span className="inline-flex items-center gap-2 text-sm font-medium text-green-700">*/}
        {/*  <span className="h-2.5 w-2.5 rounded-full bg-green-500"/>*/}
        {/*  Активирована*/}
        {/*</span>*/}
        {/*                    )}*/}
        {/*                </div>*/}

        {/*                /!* Баннер успеха *!/*/}
        {/*                {isSuccess && (*/}
        {/*                    <div*/}
        {/*                        className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3">*/}
        {/*                        <svg width="20" height="20" viewBox="0 0 24 24" className="mt-0.5" aria-hidden>*/}
        {/*                            <path fill="currentColor"*/}
        {/*                                  d="M12 2a10 10 0 1 0 .001 20.001A10 10 0 0 0 12 2m-1 14l-4-4 1.414-1.414L11 12.172l5.586-5.586L18 8l-7 8z"/>*/}
        {/*                        </svg>*/}
        {/*                        <div className="text-sm text-green-800">*/}
        {/*                            Лицензия Dealer Cast активирована*/}
        {/*                        </div>*/}
        {/*                    </div>*/}
        {/*                )}*/}

        {/*                /!* Поле ключа *!/*/}
        {/*                <div className="space-y-1.5">*/}
        {/*                    <label className="block text-sm font-medium text-gray-800">Введите ключ лицензии</label>*/}

        {/*                    <div className="relative">*/}
        {/*                        <input*/}
        {/*                            type="text"*/}
        {/*                            value={licenseKey}*/}
        {/*                            onChange={(e) => onChangeKey(e.target.value)}*/}
        {/*                            placeholder="XXXX-XXXX-XXXX-XXXX"*/}
        {/*                            disabled={isApplying || isSuccess}*/}
        {/*                            className={[*/}
        {/*                                'w-full rounded-xl border bg-white px-3.5 py-2.5',*/}
        {/*                                'text-[15px] tracking-wider font-mono',*/}
        {/*                                'placeholder:text-gray-400',*/}
        {/*                                'outline-none transition',*/}
        {/*                                error*/}
        {/*                                    ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-100'*/}
        {/*                                    : 'border-gray-300 focus:border-gray-900 focus:ring-4 focus:ring-gray-200',*/}
        {/*                                'disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed',*/}
        {/*                                'pr-10',*/}
        {/*                                // >>> дополнительные отступы (победят предыдущие)*/}
        {/*                                'pl-2 pr-2 py-2 ps-2',*/}
        {/*                            ].join(' ')}*/}
        {/*                            onKeyDown={(e) => {*/}
        {/*                                if (e.key === 'Enter' && !isApplying && !isSuccess && licenseKey.trim().length > 0) {*/}
        {/*                                    e.preventDefault()*/}
        {/*                                    handleApply()*/}
        {/*                                }*/}
        {/*                            }}*/}
        {/*                        />*/}


        {/*                        /!* Трейлинг-иконка *!/*/}
        {/*                        {(isSuccess || error) && (*/}
        {/*                            <span*/}
        {/*                                className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-400">*/}
        {/*    {isSuccess ? (*/}
        {/*        <svg width="18" height="18" viewBox="0 0 24 24" className="text-green-600">*/}
        {/*            <path fill="currentColor"*/}
        {/*                  d="M12 2a10 10 0 1 0 .001 20.001A10 10 0 0 0 12 2m-1 14l-4-4 1.414-1.414L11 12.172l5.586-5.586L18 8l-7 8z"/>*/}
        {/*        </svg>*/}
        {/*    ) : (*/}
        {/*        <svg width="18" height="18" viewBox="0 0 24 24" className="text-red-500">*/}
        {/*            <path fill="currentColor"*/}
        {/*                  d="M11 15h2v2h-2zm0-8h2v6h-2zm1-5a10 10 0 1 0 .001 20.001A10 10 0 0 0 12 2z"/>*/}
        {/*        </svg>*/}
        {/*    )}*/}
        {/*  </span>*/}
        {/*                        )}*/}
        {/*                    </div>*/}

        {/*                    /!* supporting text *!/*/}
        {/*                    <div className="min-h-[20px] text-sm mt-1">*/}
        {/*                        {error ? (*/}
        {/*                            <span className="text-red-600">{error}</span>*/}
        {/*                        ) : isSuccess ? (*/}
        {/*                            <span className="text-gray-600">Лицензия Dealer Cast активирована</span>*/}
        {/*                        ) : (*/}
        {/*                            <span className="text-gray-500">Не передавайте ключ третьим лицам</span>*/}
        {/*                        )}*/}
        {/*                    </div>*/}
        {/*                </div>*/}

        {/*                /!* Кнопки *!/*/}
        {/*                <div className="flex flex-wrap items-center gap-2.5 mt-3">*/}
        {/*                    <button*/}
        {/*                        onClick={handleApply}*/}
        {/*                        disabled={licenseKey.trim().length === 0 || isApplying || isSuccess}*/}
        {/*                        className={[*/}
        {/*                            // base*/}
        {/*                            'inline-flex items-center justify-center gap-2',*/}
        {/*                            'h-11 px-5 rounded-xl',*/}
        {/*                            // elevated white on white*/}
        {/*                            'bg-gradient-to-b from-white to-gray-50',*/}
        {/*                            'border border-gray-200 text-gray-900 shadow-sm',*/}
        {/*                            // interactions*/}
        {/*                            'hover:shadow-md hover:border-gray-300',*/}
        {/*                            'active:shadow-sm active:translate-y-px',*/}
        {/*                            'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gray-200',*/}
        {/*                            // disabled*/}
        {/*                            'disabled:opacity-60 disabled:cursor-not-allowed',*/}
        {/*                            // transitions*/}
        {/*                            'transition'*/}
        {/*                        ].join(' ')}*/}
        {/*                    >*/}
        {/*                        {isApplying ? (*/}
        {/*                            <>*/}
        {/*                                <span*/}
        {/*                                    className="inline-block h-4 w-4 animate-spin border-2 border-current border-t-transparent rounded-full"/>*/}
        {/*                                <span>Применяю…</span>*/}
        {/*                            </>*/}
        {/*                        ) : (*/}
        {/*                            <>*/}
        {/*                                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>*/}
        {/*                                    <path fill="currentColor"*/}
        {/*                                          d="m9 16.17l-3.88-3.88L3.71 13.7L9 19l12-12l-1.41-1.41z"/>*/}
        {/*                                </svg>*/}
        {/*                                <span>Применить</span>*/}
        {/*                            </>*/}
        {/*                        )}*/}
        {/*                    </button>*/}


        {/*                    <button*/}
        {/*                        onClick={() => onChangeKey('')}*/}
        {/*                        disabled={licenseKey.length === 0 || isApplying || isSuccess}*/}
        {/*                        className={[*/}
        {/*                            'inline-flex items-center justify-center',*/}
        {/*                            'h-11 px-4 rounded-xl',*/}
        {/*                            'border border-gray-300 text-gray-800 bg-white',*/}
        {/*                            'hover:bg-gray-50 active:scale-[0.99]',*/}
        {/*                            'disabled:opacity-60 disabled:cursor-not-allowed',*/}
        {/*                            'transition',*/}
        {/*                        ].join(' ')}*/}
        {/*                    >*/}
        {/*                        Очистить*/}
        {/*                    </button>*/}

        {/*                    {isSuccess && (*/}
        {/*                        <button*/}
        {/*                            onClick={() => onChangeKey('')}*/}
        {/*                            className={[*/}
        {/*                                'inline-flex items-center justify-center',*/}
        {/*                                'h-11 px-4 rounded-xl',*/}
        {/*                                'border border-gray-300 text-gray-800 bg-white',*/}
        {/*                                'hover:bg-gray-50 active:scale-[0.99]',*/}
        {/*                                'transition',*/}
        {/*                            ].join(' ')}*/}
        {/*                        >*/}
        {/*                            Сменить ключ*/}
        {/*                        </button>*/}
        {/*                    )}*/}
        {/*                </div>*/}
        {/*            </div>*/}
        {/*        </section>*/}
        {/*    )}*/}

            {/* === Выход === */}
            <section className="border rounded-2xl overflow-hidden">
                <div className="p-4 flex justify-between items-center">
                    <Button variant="outline-danger px-5" onClick={handleLogout}>
                        Выйти
                    </Button>
                </div>
            </section>
        </div>
    )
}