'use client'

import {useParams, useRouter} from 'next/navigation'
import React, {useState, useCallback} from 'react'
import Link from 'next/link'
import {
    Button,
    Form,
    Dropdown,
} from 'react-bootstrap'
import {useDropzone} from 'react-dropzone'

import MediaCard, {FileItem} from '@/app/components/Library/MediaCard'
import {closestCenter, DndContext, DragEndEvent, useDraggable} from "@dnd-kit/core";
import {arrayMove, horizontalListSortingStrategy, SortableContext} from "@dnd-kit/sortable";


const makeFile = (name: string, type: string): File =>
    new File([''], name, {type})

export const sampleLibraryItems: FileItem[] = [
    {
        id: 'lib-1',
        file: makeFile('image1.png', 'image/png'),
        name: 'image1.png',
        type: 'IMAGE',
        size: 12345,
        duration: 8,
        url: '/assets/demo1.png',
    },
    {
        id: 'lib-2',
        file: makeFile('video1.mp4', 'video/mp4'),
        name: 'video1.mp4',
        type: 'VIDEO',
        size: 23456,
        duration: 12,
        url: '/assets/demo-video.mp4',
    },
]

export interface Playlist {
    id: string
    name: string
    priority: 'normal' | 'high' | 'override'
    items: FileItem[]
}

// Просто берём пару элементов из нашей библиотеки, чтобы проиллюстрировать


export const samplePlaylists: Playlist[] = [
    {
        id: '1',
        name: 'Default Playlist',
        priority: 'normal',
        items: [sampleLibraryItems[0], sampleLibraryItems[1]],
    },
    {
        id: '2',
        name: 'Плейлист 2',
        priority: 'high',
        items: [],
    },
]

export default function PlaylistContentPage() {
    const {id} = useParams()!
    const router = useRouter()


    const playlistName = 'Default Playlist'
    const playlistPriority: 'normal' | 'high' | 'override' = 'normal'
    const initialPlaylistItems: FileItem[] = []


    const [items, setItems] = useState<FileItem[]>(initialPlaylistItems)

    const [libraryItems, setLibraryItems] = useState<FileItem[]>([])

    const [isEditingName, setIsEditingName] = useState(false)
    const [name, setName] = useState(playlistName)
    const [priority, setPriority] = useState(playlistPriority)


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

    const onExtDrop = useCallback((files: File[]) => {
        const added = files.map((file) => ({
            id: crypto.randomUUID(),
            file,
            name: file.name,
            type: file.type.startsWith('video/') ? 'VIDEO' : 'IMAGE',
            size: file.size,
            duration: undefined,
            url: URL.createObjectURL(file),
        }))
        setLibraryItems((prev) => [...added, ...prev])
    }, [])
    const {getRootProps, getInputProps} = useDropzone({
        onDrop: onExtDrop,
        accept: {'image/*': [], 'video/*': []},
    })


    const addToPlaylist = (item: FileItem) => {
        if (!items.find((i) => i.id === item.id)) {
            setItems((prev) => [...prev, item])
        }
    }


    function DraggableLibraryItem({li}: { li: FileItem }) {
        const {attributes, listeners, setNodeRef, transform, isDragging} = useDraggable({
            id: `lib-${li.id}`,
        })
        const style: React.CSSProperties = {
            transform: transform
                ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
                : undefined,
            opacity: isDragging ? 0.5 : 1,
            cursor: 'grab',
        }
        return (
            <div
                ref={setNodeRef}
                {...listeners}
                {...attributes}
                style={style}
                className="list-group-item d-flex align-items-center justify-content-between"
            >
                <img
                    src={li.url}
                    alt={li.name}
                    style={{width: 40, height: 40, objectFit: 'cover', marginRight: 8}}
                />
                <div className="flex-grow-1">{li.name}</div>
                <div className="text-success fw-bold">+</div>
            </div>
        )
    }


    return (
        <div className="p-4">

            <div className="d-flex justify-content-between align-items-center mb-4 bg-light rounded p-3">
                <div className="d-flex align-items-center gap-2">
                    {isEditingName ? (
                        <>
                            <Form.Control
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                style={{width: 200}}
                                size="sm"
                            />
                            <Button size="sm" onClick={() => {
                                setIsEditingName(false);
                                setName(playlistName)
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
                    <Dropdown onSelect={(k) => setPriority(k as any)}>
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
                        <SortableContext
                            items={items.map((i) => i.id)}
                            strategy={horizontalListSortingStrategy}
                        >
                            <div className="d-flex flex-wrap gap-3">
                                {items.map((item) => (
                                    <MediaCard
                                        key={item.id}
                                        item={item}
                                        onDelete={(id) => setItems((prev) => prev.filter((i) => i.id !== id))}
                                        onUpdate={(upd) =>
                                            setItems((prev) => prev.map((i) => (i.id === upd.id ? upd : i)))
                                        }
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
                        <div>↑ Drop files or click here to upload</div>
                        <small>Supports jpg, png, gif, webp, mp4, mpeg, mov, avi …</small>
                    </div>


                    {libraryItems.length > 0 ? (
                        <div className="list-group">
                            {libraryItems.map((li) => (
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
