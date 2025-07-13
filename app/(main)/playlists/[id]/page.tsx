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
import UploadZone from "@/app/components/Library/UploadZone";
import {usePlaylistStore} from "@/app/store/playlistStore";
import {SERVER_URL} from "@/app/API/api";
import Image from "next/image"
import ConfirmModal from "@/app/components/Common/ConfirmModal";
import ErrorModal from "@/app/components/Common/ErrorModal";
import PreviewImage from "@/app/components/Common/PreviewImage";


export default function PlaylistContentPage() {

    const router = useRouter()

    const {getFilesInLibrary, libraryItems} = useLibraryStore(state => state)

    const {
        createPlaylist,
        playlistToEdit,
        setPlaylistToEdit,
        updatePlaylist,
        deletePlaylist,
        errorMessage,
        setError
    } = usePlaylistStore(state => state)

    const [items, setItems] = useState<FileItem[]>([])
    const [isEditingName, setIsEditingName] = useState(false)
    const [name, setName] = useState('Новый плейлист')
    const [priority, setPriority] = useState<'normal' | 'high' | 'override'>('normal')

    const [showDeleteModal, setShowDeleteModal] = useState(false);


    useEffect(() => {
        console.log("lflasflaflfl", playlistToEdit)

        if (playlistToEdit && Array.isArray(playlistToEdit.childFiles)) {

            setName(playlistToEdit.name || 'Без названия')
            setItems(playlistToEdit.childFiles)
        }
    }, [playlistToEdit])


    const handleDragEnd = (event: DragEndEvent) => {
        const {active, over} = event;
        if (over && active.id !== over.id) {
            setItems(prev => {
                const oldIndex = prev.findIndex(i => i.fileId === active.id);
                const newIndex = prev.findIndex(i => i.fileId === over.id);
                const reordered = arrayMove(prev, oldIndex, newIndex);
                return reordered.map((item, idx) => ({
                    ...item,
                    orderIndex: idx
                }));
            });
        }
    };


    const addToPlaylist = (item: FileItem) => {
        if (!items.find(i => i.fileId === item.fileId)) {
            const duration = item.type?.startsWith('image') ? 30 : item.duration;
            setItems(prev => [
                ...prev,
                {
                    ...item,
                    duration,
                },
            ]);
        } else {
            alert('Этот файл уже добавлен в плейлист');
        }
    };

    async function handleSavePlaylist() {
        // валидация
        if (name.trim() === '') {
            alert('Введите название плейлиста');
            return;
        }
        if (items.length === 0) {
            alert('Добавьте хотя бы один файл в плейлист');
            return;
        }

        // пересчитываем индексы
        const itemsWithOrder = items.map((file, idx) => ({
            ...file,
            orderIndex: idx,
        }));

        // сохраняем
        let res: boolean;
        if (playlistToEdit) {
            res = await updatePlaylist(itemsWithOrder, name);
        } else {
            res = await createPlaylist(itemsWithOrder, name);
        }

        // редирект при успехе
        if (res) {
            router.push('/playlists');
        }
    }

    async function handleDeletePlaylist() {
        console.log('[Delete Handler] playlistToEdit:', playlistToEdit)

        const success = await deletePlaylist(null)
        if (success) {
            setPlaylistToEdit(null)
            router.push('/playlists')
        }
    }


    return (
        <>
            <div className="p-4">
                <div className="d-flex justify-content-between align-items-end mb-4 rounded">
                    <div className="d-flex align-items-center gap-3">
                        {isEditingName ? (
                            <>
                                <Form.Control
                                    value={name}
                                    maxLength={150}
                                    onChange={e => setName(e.target.value)}
                                    style={{width: 200}}
                                />
                                <Button disabled={name.trim() === ''} onClick={() => setIsEditingName(false)}>
                                    Сохранить
                                </Button>
                                <Button onClick={() => {
                                    setIsEditingName(false);
                                    setName('Default Playlist')
                                }}>
                                    Отмена
                                </Button>

                            </>
                        ) : (
                            <>
                                <h5 className="mb-0">{name}</h5>
                                <Button onClick={() => setIsEditingName(true)}>
                                    Редактировать
                                </Button>
                            </>
                        )}
                    </div>
                    <div className="d-flex align-items-center gap-3">
                        <Button
                            style={{paddingLeft: 36, paddingRight: 36}}
                            variant="success"
                            onClick={handleSavePlaylist}
                            disabled={items.length === 0 || name.trim() === ''}
                        >
                            Сохранить
                        </Button>

                        <Button
                            style={{paddingLeft: 36, paddingRight: 36}}
                            variant="danger"
                            onClick={() => setShowDeleteModal(true)}
                        >
                            Удалить
                        </Button>
                    </div>
                </div>

                <div className="d-flex gap-4">
                    <div className="flex-grow-1">
                        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                            <SortableContext items={items.map(i => i.fileId)} strategy={horizontalListSortingStrategy}>
                                <div className="d-flex flex-wrap gap-3">
                                    {items.map(item => (
                                        <MediaCard
                                            key={item.fileId}
                                            item={item}
                                            isPlaylist={true}
                                            canEdit={Boolean(playlistToEdit?.id)}
                                            onDelete={id => setItems(prev => prev.filter(i => i.fileId !== id))}
                                            onUpdate={upd => setItems(prev => prev.map(i => i.fileId === upd.fileId ? upd : i))}
                                        />
                                    ))}
                                </div>
                            </SortableContext>
                        </DndContext>
                    </div>

                    <div style={{width: 300}}>

                        <UploadZone/>

                        {libraryItems.length > 0 ? (
                            <div className="list-group">
                                {libraryItems.map(li => (
                                    <div
                                        key={li.fileId}
                                        className="list-group-item d-flex align-items-center justify-content-between"
                                        style={{cursor: 'pointer'}}
                                        onClick={() => addToPlaylist(li)}
                                    >
                                        <div style={{marginRight: 8}}>
                                            <PreviewImage id={li.fileId} name={li.name}/>
                                        </div>
                                        <div className="flex-grow-1 overflow-hidden">
                                            <span className="text-truncate d-block">
                                                {li.name}
                                            </span>
                                        </div>
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


            <ConfirmModal
                show={showDeleteModal}
                title="Удаление плейлиста"
                message="Вы уверены, что хотите удалить этот плейлист?"
                confirmText="Удалить"
                cancelText="Отмена"
                onCancel={() => setShowDeleteModal(false)}
                onConfirm={() => {
                    setShowDeleteModal(false)
                    handleDeletePlaylist()
                }}
            />

            <ErrorModal
                show={!!errorMessage}
                message={errorMessage || ''}
                onClose={() => setError(null)}
            />
        </>

    )
}
