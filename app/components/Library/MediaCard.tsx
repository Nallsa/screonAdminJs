import React, {
    useState,
    useEffect,
    useRef,
    CSSProperties,
} from 'react';

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


interface Props {
    item: FileItem;

    onDelete(id: string): void;

    onUpdate(updated: FileItem): void;
}

const DEFAULT_IMAGE_DURATION = 8;

const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return m > 0
        ? `${m}:${s.toString().padStart(2, '0')}`
        : `${s}s`;
};

export default function MediaCard({item, onDelete, onUpdate}: Props) {
    const {setNodeRef, transform, transition, attributes, listeners, isDragging} =
        useSortable({id: item.id})

    const [thumb, setThumb] = useState<string | null>(null)
    const videoRef = useRef<HTMLVideoElement | null>(null)

    useEffect(() => {
        if (item.type === 'VIDEO') {

            const vid = document.createElement('video')
            vid.src = item.previewUrl
            vid.currentTime = 0.1
            vid.onloadedmetadata = () => {
                const dur = vid.duration
                vid.onloadeddata = () => {
                    const canvas = document.createElement('canvas')
                    canvas.width = vid.videoWidth
                    canvas.height = vid.videoHeight
                    canvas.getContext('2d')!.drawImage(vid, 0, 0, canvas.width, canvas.height)
                    setThumb(canvas.toDataURL('image/jpeg'))
                }
                onUpdate({...item, duration: dur})
            }
            vid.onerror = () => {
                setThumb('/assets/default-thumbnail.jpg')
                onUpdate({...item, duration: DEFAULT_IMAGE_DURATION})
            }
        } else {
            setThumb(item.previewUrl)
            onUpdate({...item, duration: item.duration ?? DEFAULT_IMAGE_DURATION})
        }
    }, [])

    console.log("item.previewUrl", item.previewUrl)

    const [showPreview, setShowPreview] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [editName, setEditName] = useState(item.name)
    const [editDur, setEditDur] = useState(item.duration ?? DEFAULT_IMAGE_DURATION)

    const applyEdit = () => {
        onUpdate({...item, name: editName, duration: editDur})
        setIsEditing(false)
    }


    return (


        <div ref={setNodeRef} style={
            {
                transform: CSS.Transform.toString(transform),
                transition,
                width: 220,
                height: 230,
                zIndex: isDragging ? 9999 : 'auto',
                position: 'relative',
                opacity: isDragging ? 0.9 : 1,
            }
        } className="card shadow-sm" {...attributes}>
            <button
                {...listeners}
                title="Drag to reorder"
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
                    background: 'rgba(0, 0, 0, 0.05)',
                    borderRadius: 4,
                    zIndex: 10,
                    userSelect: 'none',
                    border: 'none',
                    padding: 0,
                }}
            >
                ⠿
            </button>

            <div style={{width: '100%', height: '100%', background: '#000', overflow: 'hidden'}}>
                {thumb ? (
                    <img src={thumb} alt={item.name} style={{width: '100%', objectFit: 'cover'}}/>
                ) : (
                    <div className="text-white text-center p-5">Loading…</div>
                )}
            </div>

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
                        <Form.Control
                            size="sm"
                            type="number"
                            value={editDur}
                            onChange={(e) => setEditDur(+e.target.value)}
                        />
                        <div className="d-flex justify-content-end gap-1 mt-2">
                            <Button size="sm" variant="primary" onPointerDown={(e) => e.stopPropagation()}
                                    onClick={applyEdit}>
                                Save
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
                                Cancel
                            </Button>
                        </div>
                    </>
                ) : (
                    <>
                        <h6 className="mb-1" style={{fontSize: '0.9rem'}}>
                            {item.name}
                        </h6>
                        <div className="mb-2">
                            <Badge bg={item.type === 'IMAGE' ? 'success' : 'primary'} className="me-1">
                                {item.type}
                            </Badge>
                            <small className="text-muted">
                                {item.duration != null ? formatDuration(item.duration) : '--'}
                            </small>
                        </div>
                        <div className="d-flex justify-content-between align-items-center px-2">
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
                                onClick={() => onDelete(item.id)}
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
                dialogClassName="media-preview-modal"
            >
                <Modal.Body className="text-center p-0 m-0">
                    {item.type === 'VIDEO' ? (
                        <video
                            ref={videoRef}
                            src={item.previewUrl}
                            controls
                            style={{width: '100%', height: 'auto'}}
                        />
                    ) : (
                        <img
                            src={item.previewUrl}
                            alt={item.name}
                            style={{width: '100%', height: 'auto'}}
                        />
                    )}
                </Modal.Body>
            </Modal>
        </div>
    )
}