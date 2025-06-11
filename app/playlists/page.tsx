'use client'

import React, {useEffect, useState} from 'react';
import {Badge, Button, Form} from 'react-bootstrap';
import Link from "next/link";

import {useRouter} from 'next/navigation'
import {usePlaylistStore} from "@/app/store/playlistStore";
import {PlaylistItem} from "@/public/types/interfaces";


const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = Math.floor(sec % 60)
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export default function PlaylistsPage() {
    const {playlistItems, getPlaylists, addPlaylist} = usePlaylistStore()
    const router = useRouter()
    useEffect(() => {
        if (playlistItems.length === 0) {
            getPlaylists()
        }
    }, [getPlaylists, playlistItems.length])

    const handleNewPlaylist = () => {
        const newPlaylist: PlaylistItem = {
            id: "1",
            name: 'Новый плейлист',
            duration: 0,
            isActive: false,
            thumbnail: '',
            childFiles: [],
        }
        addPlaylist(newPlaylist)

        router.push(`/playlists/${newPlaylist.id}`)
    }


    return (
        <div className="p-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h4 className="mb-0">Плейлисты</h4>
                <Button variant="outline-primary" onClick={handleNewPlaylist}>
                    + Новый плейлист
                </Button>
            </div>

            <div className="d-flex flex-wrap gap-3">
                {playlistItems.map((p) => (

                    <Link
                        key={p.id}
                        href={`/playlistItems/${p.id}`}
                        className="text-decoration-none"
                    >
                        <div
                            key={p.id}
                            className="card shadow-sm"
                            style={{width: 240, background: "white", borderRadius: 8, cursor: 'pointer',}}
                        >

                            <div style={{height: 140, overflow: 'hidden', background: '#000'}}>
                                <img
                                    src={p.thumbnail}
                                    alt={p.name}
                                    style={{width: '100%', height: '100%', objectFit: 'cover'}}
                                />
                            </div>
                            <div className="p-2">
                                <div style={{fontWeight: 500}}>{p.name}</div>
                                <div className="d-flex justify-content-between align-items-center mt-2">
                                    {p.isActive && (
                                        <Badge bg="success" className="px-3 py-1 rounded-pill">
                                            ACTIVE
                                        </Badge>
                                    )}
                                    <div
                                        className="border rounded-pill px-2 py-1 text-muted small d-flex align-items-center gap-1">
                                        <i className="bi bi-clock"/>
                                        {formatDuration(p.duration)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    )
}