'use client'

import React, { useState } from 'react';
import { Tabs, Tab, Form, Button } from 'react-bootstrap';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, arrayMove, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import {LibraryItem} from "@/public/types/interfaces";
import LibraryItemCard from "@/app/components/Library/LibraryItemCard";

const initialItems: LibraryItem[] = [
    { id: 1, title: 'Get started with Digital Reception', image: '/assets/image1.jpg' },
    { id: 2, title: 'Digital Signage Software', image: '/assets/image2.jpg' },
    { id: 3, title: 'What is Digital Signage?', image: '/assets/image3.jpg' },
    { id: 4, title: 'We are excited to introduce you to Castit', image: '/assets/image4.jpg' },
];

export default function LibraryPage() {
    const [key, setKey] = useState('uploaded');
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
                <h4>Library ✏️</h4>
                <div>
                    <Button variant="outline-secondary" className="me-2">Create new folder</Button>
                    <Button variant="dark">Upload file</Button>
                </div>
            </div>

            <Tabs activeKey={key} onSelect={(k) => setKey(k || '')} className="mb-3">
                <Tab eventKey="uploaded" title="Uploaded" />
                <Tab eventKey="slides" title="Slides" />
                <Tab eventKey="stock" title="Stock" />
                <Tab eventKey="ai" title="AI generated" />
            </Tabs>

            <div className="d-flex justify-content-between mb-3">
                <div className="d-flex gap-2">
                    <Form.Select size="sm">
                        <option>Show: All</option>
                    </Form.Select>
                    <Form.Select size="sm">
                        <option>Sort by: Name ↑</option>
                    </Form.Select>
                </div>
                <Form.Control size="sm" type="search" placeholder="Search" style={{ maxWidth: 300 }} />
            </div>

            <div className="upload-area border border-dashed p-4 mb-4 text-center text-muted bg-light rounded">
                <div>📤 Drop files here to upload, or use the ‘Upload file’ button</div>
                <small>Supports: jpg, png, gif, webp, mp4, mpeg, mov, avi files</small>
            </div>

            <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={items.map(item => item.id)} strategy={horizontalListSortingStrategy}>
                    <div className="d-flex flex-wrap gap-3">
                        {items.map(item => (
                            <LibraryItemCard key={item.id} item={item} />
                        ))}
                    </div>
                </SortableContext>
            </DndContext>
        </div>
    );
}
