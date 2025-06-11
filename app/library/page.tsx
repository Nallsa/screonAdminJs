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
import {FileItem} from "@/public/types/interfaces";
import LibraryItemCard from "@/app/components/Library/LibraryItemCard";
import MediaCard from "@/app/components/Library/MediaCard";
import {AnimatePresence} from "framer-motion";
import {useDropzone} from 'react-dropzone';
import {v4 as uuid} from 'uuid';
import {useLibraryStore} from "@/app/store/libraryStore";


export default function LibraryPage() {
    const {
        libraryItems,
        addLibraryItems,
        deleteLibraryItem,
        updateLibraryItem,
        getFilesInLibrary
    } = useLibraryStore(state => state)
    const [showUploadModal, setShowUploadModal] = useState(false)
    const [uploadProgress, setUploadProgress] = useState(0)
    const {uploadFile, uploadFileMetaData, addLibraryItem} = useLibraryStore();

    useEffect(() => {
        getFilesInLibrary()
    }, [getFilesInLibrary])

    useEffect(() => {
        console.log(libraryItems)

        if (libraryItems.length == 0) {
            getFilesInLibrary()
        }
    }, []);

    const startUpload = useCallback((files: File[]) => {
        if (!files.length) return;

        setShowUploadModal(true);
        setUploadProgress(0);

        // Загружаем по одному файлу (можно будет потом распараллелить)
        const uploadNext = async (index: number) => {
            const file = files[index];

            await uploadFile(
                `${process.env.NEXT_PUBLIC_SERVER_URL}files/upload`,
                file,
                (percent) => {
                    // Обновляем прогресс — например, если один файл: просто percent
                    // Если много — (index + percent/100) / files.length * 100
                    const totalProgress = Math.round(((index + percent / 100) / files.length) * 100);

                    console.log(`${totalProgress}%`);
                    setUploadProgress(totalProgress);
                },
                async (fileId) => {
                    if (fileId) {
                        const newItem: FileItem = {
                            id: fileId,
                            file,
                            name: file.name,
                            type: file.type.startsWith('video/') ? 'VIDEO' : 'IMAGE',
                            size: file.size,
                            duration: 0,
                            url: URL.createObjectURL(file),
                        };

                        addLibraryItem(newItem);

                        // сразу заливаем метаданные
                        await uploadFileMetaData(newItem);
                    }

                    if (index + 1 < files.length) {
                        await uploadNext(index + 1);
                    } else {
                        // всё загружено
                        setShowUploadModal(false);
                        setUploadProgress(0);
                    }
                }
            );
        };

        uploadNext(0);
    }, [uploadFile, uploadFileMetaData, addLibraryItem]);


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
        const {active, over} = event;
        if (over && active.id !== over.id) {
            const oldIndex = libraryItems.findIndex((i) => i.id === active.id);
            const newIndex = libraryItems.findIndex((i) => i.id === over.id);
            const newItems = arrayMove(libraryItems, oldIndex, newIndex);
            addLibraryItems(newItems); // тут вызывается функция, устанавливающая новые items
        }
    };


    return (
        <div className="p-4">
            <div className="d-flex justify-content-between align-libraryItems-center mb-3">
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
                    items={libraryItems.map((i) => i.id)}
                    strategy={horizontalListSortingStrategy}
                >
                    <div className="d-flex flex-wrap gap-3">
                        {libraryItems.map((item) => (
                            <MediaCard
                                key={item.id}
                                item={item}
                                onDelete={() => deleteLibraryItem(item.id)}
                                onUpdate={(updatedItem) => updateLibraryItem(updatedItem)}
                            />
                        ))}
                    </div>
                </SortableContext>
            </DndContext>
        </div>
    )
}