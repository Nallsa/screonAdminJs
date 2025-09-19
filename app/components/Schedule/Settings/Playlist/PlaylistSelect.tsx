/*
 * Copyright (c) LLC "Centr Distribyucii"
 * All rights reserved.
 */

'use client'
import React from 'react'
import {Button, Dropdown} from 'react-bootstrap'
import {usePlaylistStore} from '@/app/store/playlistStore'
import {useScheduleStore} from '@/app/store/scheduleStore'

type Props = {
    onEmptyClick?: (e: React.MouseEvent) => void
}

export default function PlaylistSelect({onEmptyClick}: Props) {
    const {playlistItems} = usePlaylistStore()
    const {selectedPlaylist, setSelectedPlaylist} = useScheduleStore()

    if (playlistItems.length === 0) {
        return (
            <Button variant="secondary" onClick={onEmptyClick}>
                Плейлисты
            </Button>
        )
    }

    return (
        <Dropdown onSelect={k => setSelectedPlaylist(k!)}>
            <Dropdown.Toggle variant="primary">
                {playlistItems.find(p => p.id === selectedPlaylist)?.name ?? 'Выберите плейлист'}
            </Dropdown.Toggle>
            <Dropdown.Menu>
                {playlistItems.map(pl => (
                    <Dropdown.Item key={pl.id} eventKey={pl.id}>
                        {pl.name}
                    </Dropdown.Item>
                ))}
            </Dropdown.Menu>
        </Dropdown>
    )
}
