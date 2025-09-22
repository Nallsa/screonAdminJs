/*
 * Copyright (c) LLC "Centr Distribyucii"
 * All rights reserved.
 */

'use client'

import React, {useCallback, useEffect, useMemo, useState} from 'react';
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
import {SortableContext, arrayMove, horizontalListSortingStrategy, rectSortingStrategy} from '@dnd-kit/sortable';
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

const getKind = (mime?: string) =>
    (mime?.split('/')[0] ?? '').toLowerCase() as 'image' | 'video' | ''

type TypeFilter = 'all' | 'image' | 'video'
type SortField = 'name' | 'type'

export default function LibraryPage() {
    const {
        libraryItems,
        addLibraryItems,
        deleteLibraryItem,
        updateLibraryItem,
        getFilesInLibrary,
        delFileById,
    } = useLibraryStore()

    const activeBranches = useOrganizationStore(s => s.activeBranches)

    const [activeTab, setActiveTab] = useState<'library' | 'store'>('library')
    const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
    const [sortField, setSortField] = useState<SortField>('name')
    const [isAscending, setIsAscending] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')

    useEffect(() => {
        getFilesInLibrary()
    }, [activeBranches, getFilesInLibrary])

    // корректная русская сортировка по имени
    const ruCollator = useMemo(() => new Intl.Collator('ru', {sensitivity: 'base'}), [])

    const visibleItems = useMemo(() => {
        const q = searchQuery.trim().toLowerCase()

        const filtered = libraryItems.filter(item => {
            const kind = getKind(item.type)
            const passesType = typeFilter === 'all' ? true : kind === typeFilter
            const passesSearch = q ? (item.name ?? '').toLowerCase().includes(q) : true
            return passesType && passesSearch
        })

        filtered.sort((a, b) => {
            if (sortField === 'type') {
                const ka = getKind(a.type)
                const kb = getKind(b.type)
                const byType = (ka < kb ? -1 : ka > kb ? 1 : 0) * (isAscending ? 1 : -1)
                if (byType !== 0) return byType
                // тай-брейк по имени
                const byName = ruCollator.compare(a.name ?? '', b.name ?? '')
                return isAscending ? byName : -byName
            }
            const byName = ruCollator.compare(a.name ?? '', b.name ?? '')
            return isAscending ? byName : -byName
        })

        return filtered
    }, [libraryItems, typeFilter, sortField, isAscending, searchQuery, ruCollator])

    const handleDragEnd = (event: DragEndEvent) => {
        const {active, over} = event
        if (!over || active.id === over.id) return

        const from = libraryItems.findIndex(i => i.fileId === active.id)
        const to = libraryItems.findIndex(i => i.fileId === over.id)
        if (from < 0 || to < 0) return

        const next = libraryItems.slice()
        const [moved] = next.splice(from, 1)
        next.splice(to, 0, moved)
        addLibraryItems(next)
    }

    const handleDeleteItem = async (id: string) => {
        const ok = await delFileById(id)
        if (ok) deleteLibraryItem(id)
    }

    return (
        <div className="p-3 p-md-4">
            <Tabs
                activeKey={activeTab}
                onSelect={k => setActiveTab((k as any) ?? 'library')}
                justify
                className="mb-3 mb-md-4"
            >
                <Tab eventKey="library" title="Загруженные">
                    {/* Панель управления */}
                    <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
                        <div className="d-flex align-items-center gap-2">
                            <span className="text-muted">Показывать:</span>
                            <Form.Select
                                size="sm"
                                className="w-auto"
                                value={typeFilter}
                                onChange={e => setTypeFilter(e.target.value as TypeFilter)}
                            >
                                <option value="all">Все</option>
                                <option value="image">Изображения</option>
                                <option value="video">Видео</option>
                            </Form.Select>
                        </div>

                        <div className="d-flex align-items-center gap-2">
                            <span className="text-muted">Сортировать по:</span>
                            <Form.Select
                                size="sm"
                                className="w-auto"
                                value={sortField}
                                onChange={e => setSortField(e.target.value as SortField)}
                            >
                                <option value="name">Имени (А→Я)</option>
                                <option value="type">Типу</option>
                            </Form.Select>
                            <Button
                                size="sm"
                                variant="light"
                                title={isAscending ? 'По возрастанию' : 'По убыванию'}
                                onClick={() => setIsAscending(v => !v)}
                            >
                                {isAscending ? '↑' : '↓'}
                            </Button>
                        </div>

                        <Form.Control
                            type="search"
                            placeholder="Поиск по названию…"
                            className="ms-auto w-100 w-md-auto"
                            style={{maxWidth: 320}}
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <UploadZone/>
                    <SortableContext
                        items={visibleItems.map(i => i.fileId)}
                        strategy={rectSortingStrategy}
                    >
                        <div
                            style={{
                                display: 'grid',
                                gap: 12,
                                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                            }}
                        >
                            {visibleItems.map(item => (
                                <MediaCard
                                    key={item.fileId}
                                    item={item}
                                    isPlaylist={false}
                                    onDelete={() => handleDeleteItem(item.fileId)}
                                    onUpdate={updated => updateLibraryItem(updated)}
                                />
                            ))}
                        </div>
                    </SortableContext>
                </Tab>

                <Tab eventKey="store" title="Магазин">
                    <StorePanel/>
                </Tab>
            </Tabs>
        </div>
    )
}