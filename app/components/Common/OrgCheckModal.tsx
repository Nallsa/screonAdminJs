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
        errorMessage,
        joinOrganizationByCode,
        setError,
    } = useSettingsStore()


    const [mode, setMode] = useState<'initial' | 'enterCode'>('initial')
    const [show, setShow] = useState(false)
    const [referralCode, setReferralCode] = useState('')

    useEffect(() => {
        async function checkOrg() {
            if (pathname === '/createOrg') {
                setShow(false)
                return
            }

            const storedOrgId = localStorage.getItem('organizationId')?.trim()
            if (storedOrgId) {
                setShow(false)
                return
            }

            const userId = localStorage.getItem('userId')?.trim()
            if (!userId) {
                setShow(true)
                return
            }

            const accessToken = localStorage.getItem('accessToken')

            try {
                const SERVER = process.env.NEXT_PUBLIC_SERVER_URL
                const res = await axios.get(
                    `${SERVER}organizations/organization`,
                    {headers: {Authorization: `Bearer ${accessToken}`}}
                )

                console.log("Полученная организация", res.data)

                if (res.status === 200 && res.data?.id) {
                    localStorage.setItem('organizationId', res.data.id)
                    setShow(false)
                    return
                }
            } catch (e) {
                console.error('Ошибка при получении организации:', e)
            }

            setShow(true)
        }

        checkOrg()
    }, [pathname])


    const handleCreateOrg = () => {
        setShow(false)
        router.push('/createOrg')
    }

    const handleEnterCodeClick = () => {
        setMode('enterCode')
    }

    const handleJoin = async () => {
        if (!referralCode.trim()) {
            setError('Введите код организации')
            return
        }
        await joinOrganizationByCode(referralCode.trim())
    }

    if (!show) return null


    return (
        <>
            <div className="modal-backdrop fade show"></div>
            <div
                className="modal show d-block"
                tabIndex={-1}
                style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
                                <h5 className="modal-title mb-3">Создание организации</h5>
                                <p className="mb-4">Для начала создадим организацию</p>
                                <div className="d-flex gap-2 flex-column justify-content-center">
                                    <button type="button" className="btn btn-primary" onClick={handleCreateOrg}>
                                        Создать организацию
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-outline-secondary"
                                        onClick={handleEnterCodeClick}
                                    >
                                        Ввести код организации
                                    </button>
                                </div>
                            </>
                        )}

                        {mode === 'enterCode' && (
                            <>
                                <h5 className="modal-title mb-3">Введите код для присоединения к организации</h5>
                                <div className="d-flex flex-column align-items-center gap-3">
                                    <input
                                        type="text"
                                        className="form-control text-center"
                                        placeholder="Код приглашения"
                                        style={{maxWidth: 200}}
                                        value={referralCode}
                                        onChange={(e) =>
                                            setReferralCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))
                                        }
                                    />
                                    <div className="d-flex gap-2 ">
                                        <button
                                            type="button"
                                            className="btn btn-primary px-4"
                                            onClick={handleJoin}
                                            disabled={!referralCode.trim()}
                                        >
                                            Вступить
                                        </button>
                                        <button
                                            type="button" className="btn btn-secondary px-4"
                                            onClick={() => setMode('initial')}>
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
            {/*{successMessage && (*/}
            {/*    <WarningModal*/}
            {/*        show={!!successMessage}*/}
            {/*        title="Готово"*/}
            {/*        message={successMessage || ''}*/}
            {/*        buttonText="Ок"*/}
            {/*        onClose={() => setSuccess(null)}*/}
            {/*    />*/}
            {/*)}*/}
        </>
    )
}
