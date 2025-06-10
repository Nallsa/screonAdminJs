'use client'

import React, {useCallback, useEffect, useState} from 'react';
import {Tabs, Tab, Form, Button, ProgressBar, Modal} from 'react-bootstrap';
import {
    DndContext,
    closestCenter,
    UniqueIdentifier,
    DragStartEvent,
    DragOverEvent,
    DragEndEvent,
    DragOverlay
} from '@dnd-kit/core';
import {SortableContext, arrayMove, horizontalListSortingStrategy} from '@dnd-kit/sortable';
import {LibraryItem} from "@/public/types/interfaces";
import LibraryItemCard from "@/app/components/Library/LibraryItemCard";
import MediaCard, {FileItem} from "@/app/components/Library/MediaCard";
import {AnimatePresence} from "framer-motion";
import {useDropzone} from 'react-dropzone';
import {v4 as uuid} from 'uuid';


export default function LibraryPage() {

    const [items, setItems] = useState<FileItem[]>([])
    const [showUploadModal, setShowUploadModal] = useState(false)
    const [uploadProgress, setUploadProgress] = useState(0)


    const startUpload = useCallback((files: File[]) => {
        setShowUploadModal(true)
        let prog = 0
        const iv = setInterval(() => {
            prog += 10
            setUploadProgress(prog)
            if (prog >= 100) {
                clearInterval(iv)
                const newItems = files.map((file) => ({
                    id: uuid(),
                    file,
                    name: file.name,
                    type: file.type.startsWith('video/') ? 'VIDEO' : 'IMAGE',
                    size: file.size,
                    duration: undefined,
                    url: URL.createObjectURL(file),
                }))
                setItems((prev) => [...prev, ...newItems])
                setShowUploadModal(false)
                setUploadProgress(0)
            }
        }, 100)
    }, [])

    const onDrop = useCallback(
        (accepted: File[]) => {
            if (accepted.length) startUpload(accepted)
        },
        [startUpload]
    )
    const {getRootProps, getInputProps, open} = useDropzone({
        onDrop,
        multiple: true,
        noClick: true,
        accept: {'image/*': [], 'video/*': []},
    })

    const handleDragEnd = (event: DragEndEvent) => {
        const {active, over} = event
        if (over && active.id !== over.id) {
            setItems((prev) => {
                const oldIndex = prev.findIndex((i) => i.id === active.id)
                const newIndex = prev.findIndex((i) => i.id === over.id)
                return arrayMove(prev, oldIndex, newIndex)
            })
        }
    }

    return (
        <div className="p-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h4>Библиотека</h4>
                <div>
                    <Button variant="outline-primary">
                        Сохранить
                    </Button>
                </div>
            </div>


            <div className="d-flex justify-content-end mb-3">

                <Form.Control
                    size="sm"
                    type="search"
                    placeholder="Search"
                    style={{maxWidth: 300}}
                />
            </div>

            <div
                {...getRootProps({
                    onClick: (e) => {
                        e.preventDefault()
                        open()
                    },
                })}
                className="upload-area border border-dashed p-4 mb-4 text-center text-muted bg-light rounded"
                style={{cursor: 'pointer'}}
            >
                <input {...getInputProps()} />
                <div>📤 Drop files here to upload, or click ‘Upload file’</div>
                <small>Supports: jpg, png, gif, webp, mp4, mpeg, mov, avi files</small>
            </div>

            <Modal show={showUploadModal} centered>
                <Modal.Header>
                    <Modal.Title>Uploading files…</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <ProgressBar now={uploadProgress} label={`${uploadProgress}%`}/>
                </Modal.Body>
            </Modal>

            <DndContext
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <SortableContext
                    items={items.map((i) => i.id)}
                    strategy={horizontalListSortingStrategy}
                >
                    <div className="d-flex flex-wrap gap-3">
                        {items.map((item) => (
                            <MediaCard
                                key={item.id}
                                item={item}
                                onDelete={(id) =>
                                    setItems((prev) => prev.filter((i) => i.id !== id))
                                }
                                onUpdate={(upd) =>
                                    setItems((prev) =>
                                        prev.map((i) => (i.id === upd.id ? upd : i))
                                    )
                                }
                            />
                        ))}
                    </div>
                </SortableContext>
            </DndContext>
        </div>
    )
}