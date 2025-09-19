/*
 * Copyright (c) LLC "Centr Distribyucii"
 * All rights reserved.
 */

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
import MediaCard from "@/app/components/Library/MediaCard";
import {AnimatePresence} from "framer-motion";
import {useDropzone} from 'react-dropzone';
import {v4 as uuid} from 'uuid';
import {useLibraryStore} from "@/app/store/libraryStore";
import UploadZone from "@/app/components/Library/UploadZone";
import ErrorModal from "@/app/components/Common/ErrorModal";
import {useOrganizationStore} from "@/app/store/organizationStore";
import PreviewImage from "@/app/components/Common/PreviewImage";
import StorePanel from "@/app/components/Store/StorePanel";


export default function LibraryPage() {
    const {
        libraryItems,
        addLibraryItems,
        deleteLibraryItem,
        updateLibraryItem,
        getFilesInLibrary,
        delFileById,
        errorMessage,
        setError
    } = useLibraryStore(state => state)

    const activeBranches = useOrganizationStore(state => state.activeBranches)

    useEffect(() => {
        getFilesInLibrary()
    }, [activeBranches]);


    const handleDragEnd = (event: DragEndEvent) => {
        const {active, over} = event;
        if (over && active.id !== over.id) {
            const oldIndex = libraryItems.findIndex((i) => i.fileId === active.id);
            const newIndex = libraryItems.findIndex((i) => i.fileId === over.id);
            const newItems = arrayMove(libraryItems, oldIndex, newIndex);
            addLibraryItems(newItems);
        }
    };


    function handleDelItem(id: string) {
        delFileById(id).then(r => r && deleteLibraryItem(id));
    }


    return (
        <>
            <div className="d-flex gap-4 p-4">

                <div className="flex-grow-1 min-w-0">

                    <div className="d-flex justify-content-between align-libraryItems-center mb-3">
                        <h4>Библиотека</h4>
                    </div>


                    <div className="d-flex justify-content-start  mb-3">
                        <Form.Control
                            type="search"
                            placeholder="Поиск по названию..."
                            style={{maxWidth: 300}}
                        />
                    </div>

                    <UploadZone/>


                    {/*библиотека*/}
                    <DndContext
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={libraryItems.map((i) => i.fileId)}
                            strategy={horizontalListSortingStrategy}
                        >
                            <div className="d-flex flex-wrap gap-3">
                                {libraryItems.map((item) => (
                                    <MediaCard
                                        key={item.fileId}
                                        item={item}
                                        isPlaylist={false}
                                        onDelete={() => handleDelItem(item.fileId)}
                                        onUpdate={(updatedItem) => updateLibraryItem(updatedItem)}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                </div>


                {/*магазин*/}
                <StorePanel/>
            </div>
        </>
    )
}