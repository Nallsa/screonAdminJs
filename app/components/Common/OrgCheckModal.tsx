'use client'

import React, {useEffect, useState} from 'react'
import {usePathname, useRouter} from 'next/navigation'
import ErrorModal from '@/app/components/Common/ErrorModal'
import {useSettingsStore} from '@/app/store/settingsStore'
import {WarningModal} from "@/app/components/Common/WarningModal";
import axios from "axios";

export default function OrgCheckModal() {
    const pathname = usePathname()
    const router = useRouter()

    const {
        hasOrg,
        errorMessage,
        successMessage,
        checkOrg,
        joinOrganizationByCode,
        createOrganization,
        setError,
        setSuccess,
    } = useSettingsStore()


    const [mode, setMode] = useState<'initial' | 'enterCode'>('initial')
    const [referralCode, setReferralCode] = useState('')
    const [orgName, setOrgName] = useState('')

    useEffect(() => {
        if (pathname === '/createOrg') return
        checkOrg()
    }, [pathname, checkOrg])


    const show = !hasOrg && pathname !== '/createOrg'

    const handleCreateOrg = async () => {
        if (!orgName.trim()) {
            setError('Название организации не может быть пустым')
            return
        }
        await createOrganization(orgName.trim())
    }

    const handleJoin = async () => {
        if (!referralCode.trim()) {
            setError('Введите код организации');
            return;
        }
        const ok = await joinOrganizationByCode(referralCode.trim())
        if (ok) {
            router.replace('/playlists')
            setSuccess(null)
        }
    };


    if (!show) return null


    return (
        <>
            <div className="modal-backdrop fade show"></div>
            <div
                className="modal show d-block"
                tabIndex={-1}
                style={{
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1050,
                }}
            >
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content text-center border-0 p-4">
                        {mode === 'initial' && (
                            <>
                                <h5 className="modal-title mb-1">Создание организации</h5>
                                <p className="">Создайте организацию или вступите по коду</p>
                                <div className="mb-3">
                                    <input
                                        type="text"
                                        className="form-control my-3"
                                        placeholder="Название организации"
                                        value={orgName}
                                        onChange={(e) => setOrgName(e.target.value)}
                                    />
                                    <button className="btn btn-primary w-100 mb-2" onClick={handleCreateOrg}>
                                        Создать организацию
                                    </button>
                                    <button className="btn btn-outline-secondary w-100"
                                            onClick={() => setMode('enterCode')}>
                                        Ввести код организации
                                    </button>
                                </div>
                            </>
                        )}
                        {mode === 'enterCode' && (
                            <>
                                <h5 className="modal-title mb-3">Введите код приглашения</h5>
                                <div className="d-flex flex-column align-items-center gap-3">
                                    <input
                                        type="text"
                                        className="form-control text-center"
                                        placeholder="Код приглашения"
                                        style={{maxWidth: 200}}
                                        value={referralCode}
                                        onChange={(e) => setReferralCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                                    />
                                    <div className="d-flex gap-2">
                                        <button className="btn btn-primary px-4" onClick={handleJoin}
                                                disabled={!referralCode.trim()}>
                                            Вступить
                                        </button>
                                        <button
                                            className="btn btn-secondary px-4"
                                            onClick={() => {
                                                setMode('initial')
                                                setReferralCode('')
                                            }}
                                        >
                                            Назад
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <ErrorModal show={!!errorMessage} message={errorMessage || ''} onClose={() => setError(null)}/>

        </>
    )
}
