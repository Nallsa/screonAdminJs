/*
 * Copyright (c) LLC "Centr Distribyucii"
 * All rights reserved.
 */

import React, {
    useState,
    useEffect,
    useRef,
    CSSProperties,
} from 'react';
import Image from 'next/image';


import {CSS, CSS as dndCSS} from '@dnd-kit/utilities';
import {useSortable} from '@dnd-kit/sortable';
import {motion} from 'framer-motion';
import {
    Modal,
    Button,
    Form,
    Badge,
} from 'react-bootstrap';
import type {UniqueIdentifier} from '@dnd-kit/core';
import {FileItem} from "@/public/types/interfaces";
import {SERVER_URL} from "@/app/API/api";
import PreviewImage from "@/app/components/Common/PreviewImage";
import {usePlaylistStore} from "@/app/store/playlistStore";


interface Props {
    item: FileItem;
    isPlaylist: boolean,
    canEdit?: boolean

    onDelete(id: string): void;

    onUpdate(updated: FileItem): void;
}

const DEFAULT_IMAGE_DURATION = 8;

const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return m > 0
        ? `${m}:${s.toString().padStart(2, '0')}`
        : `${s}с`;
};

export default function MediaCard({item, isPlaylist = true, onDelete, onUpdate, canEdit = true}: Props) {
    const {setNodeRef, transform, transition, attributes, listeners, isDragging} =
        useSortable({id: item.fileId})
    const {updatePlaylistFileItem} = usePlaylistStore()


    const [showPreview, setShowPreview] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [editName, setEditName] = useState(item.name)
    const [editDur, setEditDur] = useState(item.duration ?? DEFAULT_IMAGE_DURATION)

    const applyEdit = async () => {
        const success = await updatePlaylistFileItem({
            id: item.id,
            name: editName,
            type: item.type,
            duration: editDur,
        })

        if (success) {
            onUpdate({...item, name: editName, duration: editDur})
            setIsEditing(false)
        }
    }


    return (
        <div ref={setNodeRef} style={
            {
                transform: CSS.Transform.toString(transform),
                transition,
                width: 220,
                height: !isEditing ? 230 : 250,
                zIndex: isDragging ? 9999 : 'auto',
                position: 'relative',
                opacity: isDragging ? 0.9 : 1,
            }
        } className="card shadow-sm" {...attributes}>
            {isPlaylist && (
                <button
                    {...listeners}
                    title="Перетащите, чтобы изменить порядок"
                    style={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        width: 30,
                        height: 30,
                        cursor: 'grab',
                        fontSize: 18,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#cccccc',
                        borderRadius: 4,
                        zIndex: 10,
                        userSelect: 'none',
                        border: 'none',
                        padding: 0,
                    }}
                >
                    ⠿
                </button>
            )}

            <PreviewImage id={item.fileId} name={item.name} fill aspectRatio={16 / 9}/>

            <div className="card-body p-2" style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                width: '100%',
                height: '100%'
            }}>
                {isEditing ? (
                    <>

                        <Form.Control
                            size="sm"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="mb-1"
                        />
                        {item.type?.startsWith('image/') && (
                            <Form.Control
                                size="sm"
                                type="number"
                                min={1}
                                value={editDur}
                                onChange={(e) => setEditDur(+e.target.value)}
                            />
                        )}
                        <div className="d-flex justify-content-end gap-1 mt-2">
                            <Button size="sm" variant="primary" onPointerDown={(e) => e.stopPropagation()}
                                    onClick={applyEdit}>
                                Сохранить
                            </Button>
                            <Button
                                size="sm"
                                variant="outline-secondary"
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={() => {
                                    setIsEditing(false)
                                    setEditName(item.name)
                                    setEditDur(item.duration ?? DEFAULT_IMAGE_DURATION)
                                }}
                            >
                                Отмена
                            </Button>
                        </div>
                    </>
                ) : (
                    <>
                        <h6
                            className="mb-1"
                            style={{
                                fontSize: '0.9rem',
                                display: '-webkit-box',
                                WebkitBoxOrient: 'vertical',
                                WebkitLineClamp: 2,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                            }}
                        >
                            {item.name}
                        </h6>
                        <div className="mb-2">
                            <Badge
                                bg={item.type?.startsWith('image/') ? 'success' : 'primary'}
                                className="me-1"
                            >
                                {item.type}
                            </Badge>
                            <small className="text-muted">
                                {item.duration != null ? formatDuration(item.duration) : '--'}
                            </small>
                        </div>
                        <div className="d-flex justify-content-between align-items-center px-2">

                            {canEdit && isPlaylist && (
                                <span
                                    style={{
                                        width: 24,
                                        height: 24,
                                        lineHeight: '24px',
                                        textAlign: 'center',
                                        cursor: 'pointer',
                                        userSelect: 'none',
                                    }}
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onClick={() => setIsEditing(true)}
                                >
                            ✏️
                            </span>
                            )}
                            <span
                                style={{
                                    width: 24,
                                    height: 24,
                                    lineHeight: '24px',
                                    textAlign: 'center',
                                    cursor: 'pointer',
                                    userSelect: 'none',
                                }}
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={() => setShowPreview(true)}
                            >
                            👁️
                        </span>
                            <span
                                style={{
                                    width: 24,
                                    height: 24,
                                    lineHeight: '24px',
                                    textAlign: 'center',
                                    cursor: 'pointer',
                                    userSelect: 'none',
                                    color: 'red',
                                }}
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={() => onDelete(item.fileId)}
                            >
                             🗑️
                        </span>
                        </div>

                    </>
                )}
            </div>

            <Modal
                show={showPreview}
                onHide={() => setShowPreview(false)}
                centered
                contentClassName="bg-transparent border-0"  // <— делаем фон модалки прозрачным и убираем рамку
                dialogClassName="p-0"                        // <— убираем внутренние паддинги у диалога
            >
                <Modal.Body className="p-0 m-0 d-flex justify-content-center align-items-center">
                    <div
                        style={{
                            position: 'relative',
                            maxWidth: '90vw',
                            maxHeight: '90vh',
                        }}
                    >
                        <img
                            src={`${SERVER_URL}files/${item.fileId}/preview`}
                            alt={item.name}
                            style={{
                                width: '100%',
                                height: 'auto',
                                borderRadius: '12px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                            }}
                        />
                    </div>
                </Modal.Body>
            </Modal>
        </div>
    )
}