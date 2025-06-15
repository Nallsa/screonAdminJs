'use client'

import React from 'react';
import { Form } from 'react-bootstrap';
import { useSortable, defaultAnimateLayoutChanges } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {PlaylistItem} from "@/public/types/interfaces";

export default function PlaylistItemCard({ item }: { item: PlaylistItem }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: item.id,
        animateLayoutChanges: defaultAnimateLayoutChanges,
    });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        width: 200,
        zIndex: isDragging ? 9999 : 'auto',
        position: isDragging ? ('relative' as const) : ('static' as const),
        opacity: isDragging ? 0.9 : 1,
        cursor: isDragging ? 'grabbing' : 'grab',
        boxShadow: isDragging ? '0 8px 16px rgba(0,0,0,0.2)' : undefined,
        backgroundColor: '#fff',
        borderRadius: 6,
    };

    return (
        <div ref={setNodeRef} style={style} className="card shadow-sm" {...attributes} {...listeners}>
            <div className="position-relative">
                <img src={item.previewUrl} alt={item.name} className="card-img-top" />
                <div className="position-absolute top-0 start-0 p-1">
                    <span role="img" aria-label="drag">⠿</span>
                </div>
            </div>
            <div className="card-body p-2">
                <div className="small fw-bold mb-1">{item.name}</div>
                <div className="badge bg-success mb-2">{item.type}</div>
                <div className="d-flex align-items-center mb-2">
                    <span className="me-1 small">Duration:</span>
                    {/*<Form.Control*/}
                    {/*    type="number"*/}
                    {/*    size="sm"*/}
                    {/*    value={item.duration}*/}
                    {/*    style={{ width: 60 }}*/}
                    {/*    readOnly*/}
                    {/*/>*/}
                    <span className="ms-1 small">sec</span>
                </div>
                <div className="d-flex justify-content-between">
                    <i className="bi bi-pencil-square"></i>
                    <i className="bi bi-eye"></i>
                    <i className="bi bi-download"></i>
                    <i className="bi bi-trash text-danger"></i>
                </div>
            </div>
        </div>
    );
}
