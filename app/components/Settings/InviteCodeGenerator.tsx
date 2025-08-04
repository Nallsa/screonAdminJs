'use client'

import React from 'react'
import {Button} from 'react-bootstrap'
import {useSettingsStore} from '@/app/store/settingsStore'

export default function InviteCodeGenerator() {
    const {
        organizationId,
        userId,
        accessToken,
        inviteCode,
        isGenerating,
        errorMessage,
        successMessage,
        generateInviteCode,
        clearInviteCode,
        setSuccess,
    } = useSettingsStore()

    const handleGenerate = async () => {
        await generateInviteCode()
    }

    const handleCopy = () => {
        if (inviteCode) {
            navigator.clipboard.writeText(inviteCode)
            setSuccess('Скопировано в буфер обмена')
        }
    }

    return (
        <section className="border rounded-lg p-4 space-y-3">
            <h2 className="text-xl font-medium">Пригласить участников</h2>
            <p className="text-sm text-muted py-2">
                Сгенерируйте уникальный код, чтобы пригласить других пользователей в организацию.
            </p>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3 py-2">
                <Button onClick={handleGenerate} disabled={isGenerating}>
                    {isGenerating ? 'Генерируем...' : 'Сгенерировать код'}
                </Button>

                {inviteCode && (
                    <div className="flex-grow flex flex-col sm:flex-row sm:items-center gap-3 ">
                        <div className="flex-1 bg-gray-100  rounded px-3 py-3 break-all select-all">
                            <code>{inviteCode}</code>
                        </div>
                        <div className="flex flex-row ">
                            <Button onClick={handleCopy} variant="success" className="whitespace-nowrap"
                                    style={{marginRight: 12}}>
                                Скопировать
                            </Button>
                            <Button onClick={clearInviteCode} variant="outline-primary" className="whitespace-nowrap">
                                Очистить
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </section>
    )
}
