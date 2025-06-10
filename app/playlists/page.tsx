'use client'

import React, {useState} from 'react';
import {DndContext, closestCenter} from '@dnd-kit/core';
import {
    SortableContext,
    arrayMove,
    verticalListSortingStrategy, horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import {Badge, Button, Form} from 'react-bootstrap';
import {PlaylistItem} from "@/public/types/interfaces";
import PlaylistItemCard from "@/app/components/Playlist/PlaylistItemCard";
import LibraryItemCard from "@/app/components/Library/LibraryItemCard";
import {color} from "motion-dom";
import Link from "next/link";

interface Playlists {
    id: string
    name: string
    duration: number // в секундах
    isActive: boolean
    thumbnail?: string
}

const samplePlaylists: Playlists[] = [
    {
        id: '1',
        name: 'Default Playlist',
        duration: 178,
        isActive: true,
        thumbnail: '/assets/default-thumbnail.jpg',
    },
    {
        id: '2',
        name: 'Плейлист 2',
        duration: 0,
        isActive: true,
        thumbnail: '/assets/default-thumbnail.jpg',
    },
]

const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = Math.floor(sec % 60)
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export default function PlaylistsPage() {
    const [playlists, setPlaylists] = useState<Playlists[]>(samplePlaylists)

    return (
        <div className="p-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h4 className="mb-0">Плейлисты</h4>
                <Button variant="outline-primary">
                    + Новый плейлист
                </Button>
            </div>

            <div className="d-flex flex-wrap gap-3">
                {playlists.map((p) => (

                    <Link
                        key={p.id}
                        href={`/playlists/${p.id}`}
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