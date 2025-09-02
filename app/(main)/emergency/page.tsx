// app/emergency/page.tsx
'use client'

import React, {useEffect, useMemo, useState} from 'react'
import {Card, Button, Form, ListGroup, Badge} from 'react-bootstrap'
import {useRouter} from 'next/navigation'

import {usePlaylistStore} from '@/app/store/playlistStore'
import {useScreensStore} from '@/app/store/screensStore'
import {useScheduleStore} from '@/app/store/scheduleStore'
import {useSettingsStore} from '@/app/store/settingsStore'
import WhereToShowCard from '@/app/components/Schedule/Settings/WhereToShowCard'
import PlaylistSelect from '@/app/components/Schedule/Settings/Playlist/PlaylistSelect'
import {WarningModal} from "@/app/components/Common/WarningModal";
import ErrorModal from "@/app/components/Common/ErrorModal";

export default function EmergencyPage() {
    const router = useRouter()
    const orgId = useSettingsStore(s => s.organizationId) || ''

    const {playlistItems} = usePlaylistStore()
    const {allScreens, groups} = useScreensStore()
    const {selectedScreens, selectedGroup, selectedPlaylist} = useScheduleStore()

    const {
        active,
        start,
        cancel,
        getByOrganization,
        successMessage,
        errorMessage,
        setSuccess,
        setError,

    } = useScheduleStore()
    const [isLoop, setIsLoop] = useState(true)

    const selectedPlaylistObj = playlistItems.find(p => p.id === selectedPlaylist) || null

    useEffect(() => {
        if (orgId) getByOrganization(orgId)
    }, [orgId, getByOrganization])

    const screensToUse = useMemo(() => {
        if (selectedGroup) {
            return allScreens.filter(s => s.groupId === selectedGroup).map(s => s.id)
        }
        return selectedScreens
    }, [allScreens, selectedGroup, selectedScreens])

    const canSubmit = !!selectedPlaylist && (selectedGroup !== null || screensToUse.length > 0)

    const handleSend = () => {
        if (!selectedPlaylistObj) {
            setError('Выберите плейлист');
            return
        }
        if (screensToUse.length === 0 && !selectedGroup) {
            setError('Выберите экраны или группу');
            return
        }

        start({
            playlistId: selectedPlaylistObj.id,
            screensId: screensToUse,
            isRecursing: isLoop,
        })
    }

    return (
        <div className="p-4">
            <div className="d-flex justify-content-between align-items-center mb-3 rounded">
                <h4 className="mb-0">Экстренное проигрывание</h4>

                <Button
                    style={{paddingLeft: 40, paddingRight: 40}}
                    variant="success"
                    onClick={handleSend}
                    disabled={!canSubmit}
                >
                    Запустить
                </Button>

            </div>

            {/* Настройки */}
            <div className="d-flex flex-wrap gap-3 align-items-stretch">
                <Card style={{minWidth: 250}}>
                    <Card.Header>Плейлист</Card.Header>
                    <Card.Body className="d-flex align-items-center justify-content-center" style={{height: 90}}>
                        <PlaylistSelect onEmptyClick={() => router.push('/playlists')}/>
                    </Card.Body>
                </Card>

                <Card style={{minWidth: 180}}>
                    <Card.Header>Режим</Card.Header>
                    <Card.Body className="d-flex flex-column align-items-center justify-content-center text-center"
                               style={{height: 90}}>
                        <Form.Check
                            type="radio"
                            id="emg-loop"
                            name="emg-mode"
                            label="Зациклено"
                            checked={isLoop}
                            onChange={() => setIsLoop(true)}
                            className="mb-2"
                        />
                        <Form.Check
                            type="radio"
                            id="emg-once"
                            name="emg-mode"
                            label="Один раз"
                            checked={!isLoop}
                            onChange={() => setIsLoop(false)}
                        />
                    </Card.Body>
                </Card>

                <Card className="flex-grow-0">
                    <Card.Header>Где показывать</Card.Header>
                    <Card.Body className="d-flex align-items-center justify-content-center" style={{height: 90}}>
                        <div className="w-100" style={{maxWidth: 400}}>
                            <WhereToShowCard
                                onNoScreensClick={(e) => {
                                    e.preventDefault()
                                    alert('Сначала добавьте экраны')
                                }}
                            />
                        </div>
                    </Card.Body>
                </Card>
            </div>

            {/* Активные экстренные ниже настроек */}
            {active.length > 0 && (
                <Card className="mt-4">
                    <Card.Header>Активные экстренные</Card.Header>
                    <Card.Body>
                        <ListGroup>
                            {active.map(item => {
                                const plName = playlistItems.find(p => p.id === item.playlistId)?.name || item.playlistId
                                const screenNames = item.screens
                                    .map(id => allScreens.find(s => s.id === id)?.name || id)
                                    .join(', ')
                                return (
                                    <ListGroup.Item key={item.emergencyId} className="d-flex flex-column gap-2">
                                        <div className="d-flex justify-content-between align-items-center">
                                            <div>
                                                <strong>{plName}</strong>{' '}
                                                <Badge bg={item.isRecursing ? 'success' : 'secondary'}>
                                                    {item.isRecursing ? 'Зациклено' : 'Один раз'}
                                                </Badge>
                                            </div>
                                            <div className="d-flex align-items-center gap-3">
                                                <Button
                                                    size="sm"
                                                    variant="outline-danger"
                                                    onClick={() => cancel(item.emergencyId)}
                                                >
                                                    Отменить
                                                </Button>
                                            </div>
                                        </div>
                                        {!!item.screens.length && (

                                            <div className="text-muted">
                                                <strong>Экраны:</strong> {screenNames}
                                            </div>
                                        )}
                                    </ListGroup.Item>
                                )
                            })}
                        </ListGroup>
                    </Card.Body>
                </Card>
            )}


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
