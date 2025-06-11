'use client'

import {useParams, useRouter} from 'next/navigation'
import React, {useState, useCallback, useEffect} from 'react'
import Link from 'next/link'
import {
    Button,
    Form,
    Dropdown,
} from 'react-bootstrap'
import {useDropzone} from 'react-dropzone'

import MediaCard from '@/app/components/Library/MediaCard'
import {closestCenter, DndContext, DragEndEvent, useDraggable} from "@dnd-kit/core";
import {arrayMove, horizontalListSortingStrategy, SortableContext} from "@dnd-kit/sortable";
import {FileItem} from "@/public/types/interfaces";
import {useLibraryStore} from "@/app/store/libraryStore";


export default function PlaylistContentPage() {
    const {id} = useParams()!
    const router = useRouter()

    // берём из стора
    const libraryItems = useLibraryStore(state => state.libraryItems)
    const getFilesInLibrary = useLibraryStore(state => state.getFilesInLibrary)
    const addLibraryItem = useLibraryStore(state => state.addLibraryItem)

    // локальный state для плейлиста
    const [items, setItems] = useState<FileItem[]>([])

    // редактирование метаданных плейлиста
    const [isEditingName, setIsEditingName] = useState(false)
    const [name, setName] = useState('Default Playlist')
    const [priority, setPriority] = useState<'normal' | 'high' | 'override'>('normal')

    // 1. при маунте подтягиваем файлы из бэка
    useEffect(() => {
        getFilesInLibrary()
    }, [getFilesInLibrary])

    // 2. перетаскивание внутри плейлиста
    const handleDragEnd = (event: DragEndEvent) => {
        const {active, over} = event
        if (over && active.id !== over.id) {
            setItems(prev => {
                const oldIndex = prev.findIndex(i => i.id === active.id)
                const newIndex = prev.findIndex(i => i.id === over.id)
                return arrayMove(prev, oldIndex, newIndex)
            })
        }
    }

    // 3. дроп файлов во внешнюю библиотеку (сохраняем в стор)
    const onExtDrop = useCallback((files: File[]) => {
        files.forEach(file => {
            const newItem: FileItem = {
                id: crypto.randomUUID(),
                file,
                name: file.name,
                type: file.type.startsWith('video/') ? 'VIDEO' : 'IMAGE',
                size: file.size,
                duration: 0,
                url: URL.createObjectURL(file),
            }
            addLibraryItem(newItem)
        })
    }, [addLibraryItem])

    const {getRootProps, getInputProps} = useDropzone({
        onDrop: onExtDrop,
        accept: {'image/*': [], 'video/*': []},
    })

    // 4. добавить из библиотеки в плейлист
    const addToPlaylist = (item: FileItem) => {
        if (!items.find(i => i.id === item.id)) {
            setItems(prev => [...prev, item])
        }
    }

    return (
        <div className="p-4">
            <div className="d-flex justify-content-between align-items-center mb-4 bg-light rounded p-3">
                <div className="d-flex align-items-center gap-2">
                    {isEditingName ? (
                        <>
                            <Form.Control
                                value={name}
                                onChange={e => setName(e.target.value)}
                                style={{width: 200}}
                                size="sm"
                            />
                            <Button size="sm" onClick={() => {
                                setIsEditingName(false);
                                setName('Default Playlist')
                            }}>
                                Отмена
                            </Button>
                            <Button size="sm" onClick={() => setIsEditingName(false)}>
                                Сохранить
                            </Button>
                        </>
                    ) : (
                        <>
                            <h5 className="mb-0">{name}</h5>
                            <Button size="sm" onClick={() => setIsEditingName(true)}>
                                Редактировать
                            </Button>
                        </>
                    )}
                </div>
                <div className="d-flex align-items-center gap-2">
                    <Dropdown onSelect={k => setPriority(k as any)}>
                        <Dropdown.Toggle size="sm" variant="success">
                            {priority === 'normal'
                                ? 'Обычный приоритет'
                                : priority === 'high'
                                    ? 'Высокий приоритет'
                                    : 'Перекрывать всё'}
                        </Dropdown.Toggle>
                        <Dropdown.Menu>
                            <Dropdown.Item eventKey="normal">Обычный приоритет</Dropdown.Item>
                            <Dropdown.Item eventKey="high">Высокий приоритет</Dropdown.Item>
                            <Dropdown.Item eventKey="override">Перекрывать всё</Dropdown.Item>
                        </Dropdown.Menu>
                    </Dropdown>
                    <Button size="sm" variant="danger" onClick={() => router.push('/playlists')}>
                        Удалить
                    </Button>
                </div>
            </div>

            <div className="d-flex gap-4">
                <div className="flex-grow-1">
                    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext items={items.map(i => i.id)} strategy={horizontalListSortingStrategy}>
                            <div className="d-flex flex-wrap gap-3">
                                {items.map(item => (
                                    <MediaCard
                                        key={item.id}
                                        item={item}
                                        onDelete={id => setItems(prev => prev.filter(i => i.id !== id))}
                                        onUpdate={upd => setItems(prev => prev.map(i => i.id === upd.id ? upd : i))}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                </div>

                <div style={{width: 300}}>
                    <div
                        {...getRootProps()}
                        className="border border-dashed p-4 mb-3 text-center text-muted bg-white rounded"
                        style={{cursor: 'pointer'}}
                    >
                        <input {...getInputProps()} />
                        ↑ Drop files or click here to upload
                        <br/>
                        <small>Supports jpg, png, gif, webp, mp4, mpeg, mov, avi …</small>
                    </div>

                    {libraryItems.length > 0 ? (
                        <div className="list-group">
                            {libraryItems.map(li => (
                                <div
                                    key={li.id}
                                    className="list-group-item d-flex align-items-center justify-content-between"
                                    style={{cursor: 'pointer'}}
                                    onClick={() => addToPlaylist(li)}
                                >
                                    <img
                                        src={li.url}
                                        alt={li.name}
                                        style={{width: 40, height: 40, objectFit: 'cover', marginRight: 8}}
                                    />
                                    <div className="flex-grow-1">{li.name}</div>
                                    <div className="text-success fw-bold">+</div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center text-muted p-3">
                            Чтобы начать, добавьте медиа контент в библиотеку
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
