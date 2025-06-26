'use client'

import React, {useEffect, useState} from 'react';
import {Badge, Button, Form} from 'react-bootstrap';
import Link from "next/link";

import {useRouter} from 'next/navigation'
import {usePlaylistStore} from "@/app/store/playlistStore";
import {PlaylistItem} from "@/public/types/interfaces";
import {getValueInStorage} from "@/app/API/localStorage";
import {useAuthStore} from "@/app/store/authStore";
import {connectWebSocket} from "@/app/API/ws";
import ErrorModal from "@/app/components/Common/ErrorModal";


const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = Math.floor(sec % 60)
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export default function PlaylistsPage() {
    const {
        playlistItems, getPlaylists, addPlaylist, setPlaylistToEdit, setPlaylistToCreate, errorMessage,
        setError
    } = usePlaylistStore()
    const router = useRouter()


    useEffect(() => {
        if (playlistItems.length === 0) {
            getPlaylists()
        }
    }, [getPlaylists, playlistItems.length])


    const handleNewPlaylist = () => {
        const userId = getValueInStorage('userId')
        const organizationId = getValueInStorage('organizationId')

        if (userId?.trim() && organizationId?.trim()) {
            router.push(`/playlists/0`)
        } else {
            alert("Id пользователя или Id организации отсутствуют");
        }
    }


    const handleEditPlaylist = (playlist: PlaylistItem) => {
        setPlaylistToEdit(playlist)
    }


    return (
        <>
            <div className="p-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <h4 className="mb-0">Плейлисты</h4>
                    <Button variant="primary" onClick={handleNewPlaylist}>
                        + Новый плейлист
                    </Button>
                </div>

                <div className="d-flex flex-wrap gap-3">
                    {playlistItems.map((p) => (

                        <Link
                            key={p.id}
                            href={`/playlists/${p.id}`}
                            onClick={() => handleEditPlaylist(p)}
                            className="text-decoration-none"
                        >
                            <div
                                key={p.id}
                                className="card shadow-sm"
                                style={{width: 240, background: "white", borderRadius: 8, cursor: 'pointer',}}
                            >

                                <div style={{height: 140, overflow: 'hidden', background: '#000'}}>
                                    <img
                                        src={p.previewUrl ?? ""}
                                        alt={p.name}
                                        style={{width: '100%', height: '100%', objectFit: 'cover'}}
                                    />
                                </div>
                                <div className="p-2">
                                    <div style={{fontWeight: 500}}>{p.name}</div>
                                    <div className="d-flex justify-content-between align-items-center mt-2">
                                        {/*<div*/}
                                        {/*    className="border rounded-pill px-2 py-1 text-muted small d-flex align-items-center gap-1">*/}
                                        {/*    <i className="bi bi-clock"/>*/}
                                        {/*    {formatDuration(p.duration)}*/}
                                        {/*</div>*/}
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
            <ErrorModal
                show={!!errorMessage}
                message={errorMessage || ''}
                onClose={() => setError(null)}
            />
        </>
    )
}