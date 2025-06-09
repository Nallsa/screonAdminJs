'use client'

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {LibraryItem} from "@/public/types/interfaces";



export default function LibraryItemCard({ item }: { item: LibraryItem }) {
    const {
        setNodeRef,
        transform,
        transition,
        attributes,
        listeners,
        isDragging,
    } = useSortable({ id: item.id });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        width: 220,
        zIndex: isDragging ? 9999 : 'auto',
        position: isDragging ? ('relative' as const) : ('static' as const),
        opacity: isDragging ? 0.9 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} className="card shadow-sm" {...attributes} {...listeners}>
            <img src={item.image} alt={item.title} className="card-img-top" />
            <div className="card-body p-2">
                <h6 className="mb-1" style={{ fontSize: '0.9rem' }}>{item.title}</h6>
                <p className="text-muted mb-2" style={{ fontSize: '0.8rem' }}>Default Image</p>
                <span className="badge bg-success mb-2">IMAGE</span>
                <div className="d-flex justify-content-between">
                    <i className="bi bi-pencil-square cursor-pointer"></i>
                    <i className="bi bi-eye cursor-pointer"></i>
                    <i className="bi bi-download cursor-pointer"></i>
                    <i className="bi bi-trash cursor-pointer text-danger"></i>
                </div>
            </div>
        </div>
    );
}
