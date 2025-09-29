/*
 * Copyright (c) LLC "Centr Distribyucii"
 * All rights reserved.
 */

import React, {useMemo, useState} from 'react'
import {Button, Card, Form, Modal} from 'react-bootstrap'
import {useRouter} from 'next/navigation'
import WhereToShowCard from '@/app/components/Schedule/Settings/WhereToShowCard'
import PlaylistSelect from '@/app/components/Schedule/Settings/Playlist/PlaylistSelect'
import {useSettingsStore} from "@/app/store/settingsStore";
import {usePlaylistStore} from "@/app/store/playlistStore";
import {useScreensStore} from "@/app/store/screensStore";
import {useScheduleStore} from "@/app/store/scheduleStore";
import {useOrganizationStore} from "@/app/store/organizationStore";

export function EmergencyCreateModal({
                                         show,
                                         onHide,
                                         onSubmit,
                                     }: {
    show: boolean
    onHide: () => void
    onSubmit?: () => void
}) {
    const router = useRouter()
    const orgId = useOrganizationStore(s => s.organizationInfo?.id) || ''

    const {playlistItems} = usePlaylistStore()
    const {allScreens} = useScreensStore()
    const {
        selectedScreens,
        selectedGroup,
        selectedPlaylist,
        start,
        activeScenarioScreens,
        canStartEmergencyOn
    } = useScheduleStore()

    const [isLoop, setIsLoop] = useState(true)
    const [err, setErr] = useState<string | null>(null)
    const clearErr = () => setErr(null)

    const screensToUse = useMemo(
        () => (selectedGroup ? allScreens.filter(s => s.groupId === selectedGroup).map(s => s.id) : selectedScreens),
        [allScreens, selectedGroup, selectedScreens]
    )

    const handleSubmit = () => {
        clearErr()

        if (!orgId) return setErr('Не выбрана организация')
        const pl = playlistItems.find(p => p.id === selectedPlaylist)
        if (!pl) return setErr('Выберите плейлист')

        const ids = screensToUse
        if (ids.length === 0 && !selectedGroup) return setErr('Выберите экраны или группу')

        // точная проверка пересечения
        const [ok, msg] = canStartEmergencyOn(ids)
        if (!ok) return setErr(msg || 'Нельзя запустить экстренное')

        start({
            organizationId: orgId,
            recurring: isLoop,
            assignments: [{playlistId: pl.id, screens: ids}],
        })
        onHide()
    }

    return (
        <Modal show={show} onHide={onHide} centered>
            <Modal.Header closeButton>
                <Modal.Title>Создать экстренное</Modal.Title>

            </Modal.Header>
            {!!err && <div className="text-danger small px-3">{err}</div>}
            <Modal.Body>
                <div className="d-flex flex-column gap-3">
                    <Card>
                        <Card.Header>Плейлист</Card.Header>
                        <Card.Body className="d-flex align-items-center justify-content-center" style={{height: 80}}>
                            <PlaylistSelect onEmptyClick={() => router.push('/playlists')}/>
                        </Card.Body>
                    </Card>

                    <Card>
                        <Card.Header>Режим</Card.Header>
                        <Card.Body
                            className="d-flex flex-column  flex-sm-row align-items-center justify-content-center text-center"
                            style={{height: 80}}>
                            <Form.Check
                                type="radio"
                                id="emg-loop"
                                name="emg-mode"
                                label="Зациклено"
                                checked={isLoop}
                                onChange={() => {
                                    clearErr();
                                    setIsLoop(true)
                                }}
                                className="mb-2"
                            />
                            <div className="px-3"></div>
                            <Form.Check
                                type="radio"
                                id="emg-once"
                                name="emg-mode"
                                label="Один раз"
                                checked={!isLoop}
                                onChange={() => {
                                    clearErr();
                                    setIsLoop(false)
                                }}
                            />
                        </Card.Body>
                    </Card>

                    <Card>
                        <Card.Header>Где показывать</Card.Header>
                        <Card.Body className="d-flex pt-3 align-items-center justify-content-center"
                                   style={{height: 100}}>
                            <div className="w-100" style={{maxWidth: 420}}>
                                <WhereToShowCard onNoScreensClick={(e) => {
                                    e.preventDefault();
                                    setErr('Сначала добавьте экраны')
                                }}/>
                            </div>
                        </Card.Body>
                    </Card>


                </div>
            </Modal.Body>
            <Modal.Footer>
                <div className="d-grid gap-2 flex-sm-row flex-column d-sm-flex d-flex justify-content-between w-100">
                    <Button className="w-100 " variant="secondary" onClick={onHide}>
                        Отмена
                    </Button>
                    <Button className="w-100 " variant="success" onClick={onSubmit ?? handleSubmit}>
                        Запустить
                    </Button>
                </div>
            </Modal.Footer>
        </Modal>
    )
}