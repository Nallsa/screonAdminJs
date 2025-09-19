/*
 * Copyright (c) LLC "Centr Distribyucii"
 * All rights reserved.
 */

'use client'

import React, {useEffect, useMemo, useState} from 'react'
import {Badge, Button, Card, ListGroup} from 'react-bootstrap'
import {useRouter} from 'next/navigation'

import {usePlaylistStore} from '@/app/store/playlistStore'
import {useScreensStore} from '@/app/store/screensStore'
import {useScheduleStore} from '@/app/store/scheduleStore'
import {useSettingsStore} from '@/app/store/settingsStore'
import {WarningModal} from "@/app/components/Common/WarningModal";
import ErrorModal from "@/app/components/Common/ErrorModal";
import {EmergencyCreateModal} from "@/app/components/Emergency/EmergencyCreateModal";
import {ScenarioCreateModal} from "@/app/components/Emergency/ScenarioCreateModal";

export default function EmergencyPage() {
    const router = useRouter()
    const orgId = useSettingsStore(s => s.organizationId) || ''

    const {playlistItems} = usePlaylistStore()
    const {allScreens, groups} = useScreensStore()
    const {selectedScreens, selectedGroup, selectedPlaylist, canStartScenarioOn} = useScheduleStore()

    const {
        emergency,
        start,
        cancel,
        getByOrganization,
        successMessage,
        errorMessage,
        setSuccess,
        setError,
        scenarios,
        createScenario,
        startScenario,
        cancelScenario,

    } = useScheduleStore()


    useEffect(() => {
        if (orgId) getByOrganization(orgId)
    }, [orgId, getByOrganization])


    const screenNameById = useMemo(() => {
        const m = new Map<string, string>()
        allScreens.forEach(s => m.set(s.id, s.name))
        return m
    }, [allScreens])

    const prettyScreens = (ids?: string[], fallbackCount?: number) => {
        const names = (ids ?? []).map(id => screenNameById.get(id) ?? id)

        if (names.length > 0) {
            return names.length > 6
                ? `${names.slice(0, 6).join(', ')} и ещё ${names.length - 6}`
                : names.join(', ')
        }

        const n = fallbackCount ?? 0
        const mod10 = n % 10, mod100 = n % 100
        if (mod10 === 1 && mod100 !== 11) return `${n} экран`
        if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return `${n} экрана`
        return `${n} экранов`
    }


    const [showEmergencyModal, setShowEmergencyModal] = useState(false)
    const [showScenarioModal, setShowScenarioModal] = useState(false)

    return (
        <div className="p-4 d-flex flex-column align-items-center gap-4 w-100">
            {/* хэдер + кнопки */}
            <div className="mb-3 w-100">
                <div className="row w-100 d-flex justify-content-between g-2 align-items-center">
                    <div className="col">
                        <h4 className="mb-0">Сценарии и экстренное проигрывание</h4>
                    </div>
                    <div className="col-12 col-md-auto ms-md-auto d-grid d-sm-inline-flex gap-2">
                        <Button variant="primary" onClick={() => setShowEmergencyModal(true)}>
                            Создать экстренное
                        </Button>
                        <Button variant="outline-primary" onClick={() => setShowScenarioModal(true)}>
                            Создать сценарий
                        </Button>
                    </div>
                </div>
            </div>

            <div className="d-flex flex-column align-items-center gap-4 w-100">
                {/* Список экстренных  */}
                <Card className="w-100 mx-auto shadow-sm" style={{maxWidth: 600}}>
                    <Card.Header>Активные экстренные</Card.Header>
                    <Card.Body>
                        {emergency.length === 0 ? (
                            <div className="text-muted">Сейчас нет активных экстренных показов</div>
                        ) : (
                            <ListGroup>
                                {emergency.map(item => {
                                    const started = item.startedAt ? new Date(item.startedAt).toLocaleString() : '—'

                                    const badgeVariant =
                                        item.status === 'ACTIVE' ? 'success'
                                            : item.status === 'FINISHED' ? 'secondary'
                                                : 'primary'

                                    const status = item.status == 'ACTIVE' ? 'Активен' : item.status == 'STOPPED' || 'DRAFT' ? 'Пауза' : 'Не активен'

                                    return (
                                        <ListGroup.Item key={item.emergencyId} className="p-3">
                                            <div
                                                className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-2">
                                                <div className="d-flex flex-row align-items-center flex-wrap gap-2">
                                                    <strong>Экстренный показ</strong>
                                                    <Badge bg={badgeVariant}>{status}</Badge>
                                                </div>

                                                <div
                                                    className="d-grid gap-2 w-100 d-sm-inline-flex justify-content-sm-end">
                                                    <Button size="sm" className="w-100 w-sm-auto"
                                                            variant="outline-danger"
                                                            onClick={() => cancel(item.emergencyId)}>
                                                        Отменить
                                                    </Button>
                                                </div>
                                            </div>

                                            <div
                                                className="text-muted d-flex flex-column flex-sm-row flex-wrap gap-2 mt-1">
                                                <div><strong>Старт:</strong> {started}</div>
                                                <div className="text-break">
                                                    <strong>Экраны:</strong> {prettyScreens(item.screensIds, item.screens)}
                                                </div>
                                            </div>
                                        </ListGroup.Item>
                                    )
                                })}
                            </ListGroup>
                        )}
                    </Card.Body>
                </Card>

                {/* Список сценариев  */}
                <Card className="w-100 mx-auto shadow-sm" style={{maxWidth: 600}}>
                    <Card.Header className="d-flex justify-content-between align-items-center">
                        <span>Сценарии</span>
                    </Card.Header>
                    <Card.Body>
                        {scenarios.length === 0 ? (
                            <div className="text-muted ">Сценариев пока нет</div>
                        ) : (
                            <ListGroup>
                                {scenarios.map(item => {

                                    const badgeVariant =
                                        item.status === 'ACTIVE' ? 'success'
                                            : item.status === 'DRAFT' ? 'dark'
                                                : item.status === 'STOPPED' ? 'dark'
                                                    : 'primary'
                                    const status = item.status == 'ACTIVE' ? 'Активен' : item.status == 'STOPPED' || 'DRAFT' ? 'Пауза' : 'Не активен'
                                    return (
                                        <ListGroup.Item key={item.emergencyId} className="p-3">
                                            <div
                                                className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-2">
                                                <div className="d-flex align-items-center flex-wrap gap-2">
                                                    <strong>{item.name}</strong>
                                                    <Badge bg={badgeVariant}>{status}</Badge>
                                                    <Badge bg={item.recurring ? 'success' : 'secondary'}>
                                                        {item.recurring ? 'Зациклено' : 'Один раз'}
                                                    </Badge>
                                                </div>

                                                <div
                                                    className="d-grid gap-2 w-100 d-sm-inline-flex justify-content-sm-end">
                                                    <Button
                                                        size="sm"
                                                        className="w-100 w-sm-auto"
                                                        variant="success"
                                                        onClick={() => { /* ваша логика */
                                                        }}
                                                        disabled={item.status === 'ACTIVE'}
                                                    >
                                                        Запустить
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        className="w-100 w-sm-auto"
                                                        variant="outline-danger"
                                                        onClick={() => cancelScenario(item.emergencyId)}
                                                        disabled={item.status !== 'ACTIVE'}
                                                    >
                                                        Отменить
                                                    </Button>
                                                </div>
                                            </div>

                                            <div
                                                className="text-muted d-flex flex-column flex-sm-row flex-wrap gap-2 mt-1">
                                                <div className="text-break">
                                                    <strong>Экраны:</strong> {prettyScreens(item.screensIds, item.screens)}
                                                </div>
                                            </div>
                                        </ListGroup.Item>
                                    )
                                })}
                            </ListGroup>
                        )}
                    </Card.Body>
                </Card>
            </div>

            {/* Модалка Создать экстренное */}
            <EmergencyCreateModal
                show={showEmergencyModal}
                onHide={() => setShowEmergencyModal(false)}
                onSubmit={() => {
                    const selectedPlaylistObj = playlistItems.find(p => p.id === selectedPlaylist) || null
                    const screensToUse = selectedGroup
                        ? allScreens.filter(s => s.groupId === selectedGroup).map(s => s.id)
                        : selectedScreens

                    // валидация
                    if (!selectedPlaylistObj) {
                        setError('Выберите плейлист');
                        return
                    }
                    if (screensToUse.length === 0 && !selectedGroup) {
                        setError('Выберите экраны или группу');
                        return
                    }

                    // проверка пересечений с уже активными
                    const busyIds = new Set<string>()
                    for (const a of emergency) {
                        if (!a) continue
                        if (Array.isArray((a as any).screenIds)) (a as any).screenIds.forEach((x: string) => busyIds.add(x))
                        else if (Array.isArray((a as any).screensIds)) (a as any).screensIds.forEach((x: string) => busyIds.add(x))
                        else if (Array.isArray((a as any).assignments)) {
                            for (const asg of (a as any).assignments) (asg?.screens || []).forEach((x: string) => busyIds.add(x))
                        }
                    }
                    const conflict = screensToUse.filter(id => busyIds.has(id))
                    if (conflict.length) {
                        const byId = new Map(allScreens.map(s => [s.id, s.name]))
                        const names = conflict.slice(0, 5).map(id => byId.get(id) || id).join(', ')
                        const more = conflict.length > 5 ? ` и ещё ${conflict.length - 5}` : ''
                        setError(`Нельзя запустить экстренное. Уже заняты экраны: ${names}${more}.`)
                        return
                    }

                    start({
                        organizationId: orgId,
                        recurring: (document.getElementById('emg-loop') as HTMLInputElement)?.checked ?? true,
                        assignments: [{playlistId: selectedPlaylistObj.id, screens: screensToUse}],
                    })

                    setShowEmergencyModal(false)
                }}
            />

            {/* Модалка Создать сценарий */}
            <ScenarioCreateModal
                show={showScenarioModal}
                onHide={() => setShowScenarioModal(false)}
                onSubmit={async (name, recurring, groups) => {
                    if (!orgId) {
                        setError('Не выбрана организация');
                        return
                    }
                    if (!name.trim()) {
                        setError('Введите название сценария');
                        return
                    }
                    if (groups.length === 0) {
                        setError('Добавьте хотя бы одну группу');
                        return
                    }

                    // Проверим, что экраны в группах не пересекаются
                    const seen = new Set<string>()
                    for (const g of groups) {
                        for (const id of g.screens) {
                            if (seen.has(id)) {
                                setError('Экраны в группах сценария не должны пересекаться');
                                return
                            }
                            seen.add(id)
                        }
                    }

                    await createScenario({
                        organizationId: orgId,
                        name: name.trim(),
                        recurring,
                        assignments: groups,
                    })
                    setShowScenarioModal(false)
                }}
            />

            {/* уведомления */}
            <WarningModal
                show={!!successMessage}
                title="Готово"
                message={successMessage || ''}
                buttonText="Ок"
                onClose={() => setSuccess(null)}
            />
            <ErrorModal
                show={!!errorMessage}
                message={errorMessage || ''}
                onClose={() => setError(null)}
            />
        </div>
    )
}
