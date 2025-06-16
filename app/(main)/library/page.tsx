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


export default function LibraryPage() {
    const {
        libraryItems,
        addLibraryItems,
        deleteLibraryItem,
        updateLibraryItem,
        getFilesInLibrary
    } = useLibraryStore(state => state)


    useEffect(() => {
        console.log(libraryItems)

        if (libraryItems.length == 0) {
            getFilesInLibrary()
        }
    }, []);


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

            <UploadZone/>

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