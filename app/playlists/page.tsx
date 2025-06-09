'use client'

import React, { useState } from 'react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import {
    SortableContext,
    arrayMove,
    verticalListSortingStrategy, horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Button, Form } from 'react-bootstrap';
import {PlaylistItem} from "@/public/types/interfaces";
import PlaylistItemCard from "@/app/components/Playlist/PlaylistItemCard";
import LibraryItemCard from "@/app/components/Library/LibraryItemCard";

const initialItems: PlaylistItem[] = [
    { id: 1, title: 'Default Image', type: 'IMAGE', duration: 8, image: '/assets/image1.jpg' },
    { id: 2, title: 'Digital Signage Software', type: 'IMAGE', duration: 8, image: '/assets/image2.jpg' },
    { id: 3, title: 'ClockControlObject', type: 'CLOCK', duration: 5, image: '/assets/clock.jpg' },
    { id: 4, title: 'YouTube Video', type: 'YOUTUBE VIDEO', duration: 117, image: '/assets/youtube.jpg' },
];

export default function PlaylistsPage() {
    const [items, setItems] = useState(initialItems);

    const handleDragEnd = (event: any) => {
        const { active, over } = event;
        if (active.id !== over?.id) {
            const oldIndex = items.findIndex(i => i.id === active.id);
            const newIndex = items.findIndex(i => i.id === over?.id);
            setItems(arrayMove(items, oldIndex, newIndex));
        }
    };

    return (
        <div className="p-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h4>Playlist &gt; <span className="text-muted">Default Playlist ✏️</span></h4>
                <div>
                    <Button variant="danger" className="me-2">🗑️</Button>
                    <Button variant="outline-secondary" className="me-2">Preview</Button>
                    <Button variant="secondary">Duplicate</Button>
                </div>
            </div>

            <div className="d-flex">
                <div className="flex-grow-1 pe-4">
                    <div className="d-flex justify-content-between mb-3">
                        <div><b>Total duration:</b> 00:02:58</div>
                        <div className="d-flex gap-3">
                            <Button variant="outline-secondary" size="sm">Playlist contents</Button>
                            <Button variant="light" size="sm">Playlist settings</Button>
                        </div>
                    </div>

                    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext
                            items={items.map(item => item.id)}
                            strategy={horizontalListSortingStrategy}
                        >
                            <div className="d-flex flex-wrap gap-3">
                                {items.map(item => (
                                    <LibraryItemCard key={item.id} item={item} />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                </div>

                {/* Right sidebar, как раньше */}
                <div style={{ width: 250 }} className="border-start ps-3">
                    <div className="d-flex mb-3">
                        <Button variant="light" size="sm" className="me-2">LIBRARY</Button>
                        <Button variant="outline-secondary" size="sm" className="me-2">APPS</Button>
                        <Button variant="outline-secondary" size="sm">SLIDES</Button>
                    </div>
                    <Form.Control type="search" placeholder="Search" size="sm" className="mb-3" />
                </div>
            </div>
        </div>
    );
}
