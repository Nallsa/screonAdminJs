'use client'

import React, {useEffect, useMemo, useState} from 'react'
import {Card, Dropdown, Button, Form, Alert, ListGroup, Badge} from 'react-bootstrap'
import Link from 'next/link'

import {usePlaylistStore} from '@/app/store/playlistStore'
import {useScreensStore} from '@/app/store/screensStore'
import {useScheduleStore} from '@/app/store/scheduleStore'
import {useEmergencyStore} from '@/app/store/emergencyStore'
import {getValueInStorage} from '@/app/API/localStorage'
import WhereToShowCard from '@/app/components/Schedule/Settings/WhereToShowCard'
import PlaylistSelect from "@/app/components/Schedule/Settings/Playlist/PlaylistSelect";
import {useRouter} from "next/navigation";

export default function EmergencyPage() {

    const router = useRouter()


    const userId = (typeof window !== 'undefined' ? (getValueInStorage('userId') || '') : '') as string

    const {playlistItems} = usePlaylistStore()
    const {allScreens, groups} = useScreensStore()
    const {
        selectedScreens,
        selectedGroup,
        setSelectedPlaylist,
        selectedPlaylist,
    } = useScheduleStore()

    const {active, start, cancel, getByUser} = useEmergencyStore()
    const [isLoop, setIsLoop] = useState(true)

    const selectedPlaylistObj = playlistItems.find(p => p.id === selectedPlaylist) || null
    const hasActive = active.length > 0

    useEffect(() => {
        if (userId) getByUser(userId)
    }, [userId, getByUser])

    const canSubmit =
        !!selectedPlaylist &&
        (selectedGroup !== null || selectedScreens.length > 0) &&
        !hasActive

    const screensToUse = useMemo(() => {
        if (selectedGroup) {
            return allScreens.filter(s => s.groupId === selectedGroup).map(s => s.id)
        }
        return selectedScreens
    }, [allScreens, selectedGroup, selectedScreens])

    const handleSend = () => {
        if (!selectedPlaylistObj) {
            alert('Выберите плейлист')
            return
        }
        if (screensToUse.length === 0 && !selectedGroup) {
            alert('Выберите экраны или группу')
            return
        }
        start({
            userId,
            playlistId: selectedPlaylistObj.id,
            isRecurring: isLoop,
            targets: {
                // передаём оба поля — сервер сам решит, чем пользоваться
                screenIds: screensToUse.length ? screensToUse : undefined,
                groupId: selectedGroup || undefined,
            }
        })
    }

    const handleCancelAll = () => {
        cancel({userId})
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

            {/* Активные экстренные (кратко) */}
            {hasActive && (
                <Card className="mb-4">
                    <Card.Header className="d-flex justify-content-between align-items-center">
                        <span>Активное экстренное</span>
                        <Button variant="outline-danger" onClick={handleCancelAll}>
                            Отменить
                        </Button>
                    </Card.Header>
                    <Card.Body>
                        <ListGroup>
                            {active.map(item => {
                                const plName = playlistItems.find(p => p.id === item.playlistId)?.name || item.playlistId
                                const groupName = item.groupId ? (groups.find(g => g.id === item.groupId)?.name || item.groupId) : null
                                const screenNames = item.screens
                                    .map(id => allScreens.find(s => s.id === id)?.name || id)
                                    .join(', ')
                                return (
                                    <ListGroup.Item key={item.emergencyId} className="d-flex flex-column gap-1">
                                        <div className="d-flex justify-content-between align-items-center">
                                            <div>
                                                <strong>{plName}</strong>{' '}
                                                <Badge bg={item.isRecurring ? 'success' : 'secondary'}>
                                                    {item.isRecurring ? 'Зациклено' : 'Один раз'}
                                                </Badge>
                                            </div>
                                            <small className="text-muted">ID: {item.emergencyId}</small>
                                        </div>
                                        {groupName && <div><strong>Группа:</strong> {groupName}</div>}
                                        {!!item.screens.length && <div><strong>Экраны:</strong> {screenNames}</div>}
                                    </ListGroup.Item>
                                )
                            })}
                        </ListGroup>
                    </Card.Body>
                </Card>
            )}

            {/* Форма */}
            <div className="d-flex flex-wrap gap-3">
                <Card style={{minWidth: 250}}>
                    <Card.Header>Плейлист</Card.Header>
                    <Card.Body className="d-flex align-items-center justify-content-center" style={{minHeight: 80}}>
                        <PlaylistSelect onEmptyClick={() => router.push('/playlists')}/>
                    </Card.Body>
                </Card>

                <Card style={{minWidth: 180}}>
                    <Card.Header>Режим</Card.Header>
                    <Card.Body
                        className="d-flex flex-column justify-content-center "

                    >
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

                <Card className="d-flex flex-column justify-content-center align-content-center">
                    <Card.Header>Где показывать</Card.Header>
                    <Card.Body
                        className="d-flex align-items-center justify-content-center"

                    >
                        <WhereToShowCard
                            onNoScreensClick={(e) => {
                                e.preventDefault()
                                alert('Сначала добавьте экраны')
                            }}
                        />
                    </Card.Body>
                </Card>
            </div>
        </div>

    )
}
