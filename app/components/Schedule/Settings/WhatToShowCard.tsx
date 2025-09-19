/*
 * Copyright (c) LLC "Centr Distribyucii"
 * All rights reserved.
 */

'use client'
import React from 'react'
import {Dropdown, Button, Col} from 'react-bootstrap'
import {usePlaylistStore} from '@/app/store/playlistStore'
import {useScheduleStore} from '@/app/store/scheduleStore'
import PlaylistSelect from "@/app/components/Schedule/Settings/Playlist/PlaylistSelect";
import PrioritySelect from "@/app/components/Schedule/Settings/Playlist/PrioritySelect";

type Props = {
    onNoPlaylistsClick: (e: React.MouseEvent) => void
}

export default function WhatToShowCard({onNoPlaylistsClick}: Props) {
    const {playlistItems} = usePlaylistStore()
    const {
        selectedPlaylist,
        setSelectedPlaylist,
        typeMode,
        priority,
        setPriority,
    } = useScheduleStore()

    return (
        <div className="d-flex flex-row justify-content-center align-items-center gap-3">
            <Col xs="auto">
                <PlaylistSelect onEmptyClick={onNoPlaylistsClick}/>
            </Col>

            <Col xs="auto" className="d-flex flex-column justify-content-center align-items-center text-center">
                <PrioritySelect/>
            </Col>
        </div>
    )
}
