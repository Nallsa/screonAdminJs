/*
 * Copyright (c) LLC "Centr Distribyucii"
 * All rights reserved.
 */

'use client'

import {useParams, useRouter} from 'next/navigation'
import React, {useState, useCallback, useEffect, useMemo} from 'react'
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

    type IptvChannel = {
        name: string;
        url: string;
        group?: string | null;
        logo?: string | null;
    };

    const [showIptv, setShowIptv] = useState(false);
    const [iptvLoading, setIptvLoading] = useState(false);
    const [iptvError, setIptvError] = useState<string | null>(null);
    const [iptvChannels, setIptvChannels] = useState<IptvChannel[]>([]);


    useEffect(() => {
        if (!showIptv || iptvChannels.length > 0) return;

        const controller = new AbortController();
        const load = async () => {
            try {
                setIptvError(null);
                setIptvLoading(true);
                const res = await fetch(`${SERVER_URL}/iptv/channels`, {
                    signal: controller.signal,
                });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data: IptvChannel[] = await res.json();

                // На всякий случай фильтруем мусор и нормализуем поля
                const cleaned = (data ?? [])
                    .filter(c => c && c.name && c.url)
                    .map(c => ({
                        name: c.name.trim(),
                        url: c.url.trim(),
                        group: (c.group ?? 'Прочее').trim(),
                        logo: c.logo ?? null,
                    }));

                setIptvChannels(cleaned);
            } catch (e: any) {
                if (e?.name !== 'AbortError') {
                    setIptvError('Не удалось загрузить список IPTV каналов');
                    console.error('[IPTV fetch error]', e);
                }
            } finally {
                setIptvLoading(false);
            }
        };

        load();
        return () => controller.abort();
    }, [showIptv, iptvChannels.length]);


    const groupedIptv = useMemo(() => {
        const map = new Map<string, IptvChannel[]>();
        for (const ch of iptvChannels) {
            const key = ch.group || 'Прочее';
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(ch);
        }
        // для стабильности отсортируем группы и каналы по имени
        const sortedEntries = Array.from(map.entries())
            .sort((a, b) => a[0].localeCompare(b[0], 'ru'));
        sortedEntries.forEach(([k, arr]) => arr.sort((a, b) => a.name.localeCompare(b.name, 'ru')));
        return sortedEntries; // [ [groupName, IptvChannel[]], ... ]
    }, [iptvChannels]);

    // хелпер генерит стабильный fileId на основе URL
    const makeIptvFileId = (url: string) => `iptv_${encodeURIComponent(url)}`

    const addIptvToPlaylist = (ch: IptvChannel) => {

        if (items.find(item => item.source === "FILE")) {
            alert('Нельзя добавить канал');
            return;
        }

        if (items.length == 1) {
            alert('Можно добавить только 1 канал');
            return;
        }

        const fileId = makeIptvFileId(ch.url)

        // не добавляем дубликаты по iptvUrl/fileId
        if (items.find(i => i.fileId === fileId || i.iptvUrl === ch.url)) {
            alert('Этот канал уже в плейлисте');
            return;
        }

        const it: FileItem = {
            id: fileId,
            fileId,                         // нужен для DnD/Sortable и MediaCard
            name: ch.name,
            type: 'IPTV',
            size: null,
            duration: null,                 // пусть бэк поставит дефолт (например 120)
            hasPreview: Boolean(ch.logo),
            previewUrl: ch.logo || undefined,
            orderIndex: items.length,
            source: 'IPTV',
            iptvName: ch.name,
            iptvUrl: ch.url,
            iptvLogo: ch.logo || null,
        }


        setName(ch.name)
        setItems(prev => [...prev, it])
    }


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


    const addFileToPlaylist = (item: FileItem) => {
        if (items.find(item => item.source === "IPTV")) {
            alert('Нельзя добавить файл');
            return;
        }

        if (!items.find(i => i.fileId === item.fileId)) {
            const duration = item.type?.startsWith('image') ? 30 : item.duration;
            setItems(prev => [
                ...prev,
                {
                    ...item,
                    source: 'FILE',
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
                {/* Хедер */}
                <div className="mb-3">
                    <div className="row g-2 align-items-center">
                        {/* Левая зона */}
                        <div className="col">
                            {isEditingName ? (
                                <div className="d-grid d-sm-inline-flex gap-2">
                                    <Form.Control
                                        value={name}
                                        maxLength={150}
                                        onChange={e => setName(e.target.value)}
                                        className="w-100 w-sm-auto"
                                        style={{minWidth: 220}}
                                    />
                                    <Button
                                        onClick={() => setIsEditingName(false)}
                                        disabled={name.trim() === ''}
                                    >
                                        Сохранить
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        onClick={() => {
                                            setIsEditingName(false);
                                            setName('Default Playlist')
                                        }}
                                    >
                                        Отмена
                                    </Button>
                                </div>
                            ) : (
                                <div className="d-grid d-sm-inline-flex align-items-center gap-2">
                                    <h5 className="mb-0">{name}</h5>
                                    <Button variant="outline-primary" onClick={() => setIsEditingName(true)}>
                                        Редактировать
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* Правая зона */}
                        <div className="col-12 col-md-auto ms-md-auto d-grid d-sm-inline-flex gap-2">
                            <Button
                                className="px-sm-4 w-100 w-sm-auto"
                                variant="success"
                                onClick={handleSavePlaylist}
                                disabled={items.length === 0 || name.trim() === ''}
                            >
                                Сохранить
                            </Button>
                            <Button
                                className="px-sm-4 w-100 w-sm-auto"
                                variant="danger"
                                onClick={() => setShowDeleteModal(true)}
                            >
                                Удалить
                            </Button>
                        </div>
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

                    <div style={{width: 350}}>

                        <UploadZone/>

                        {/* ⬇️ вставьте переключатель сразу после UploadZone */}
                        <div className="mt-3 mb-4">
                            <Form.Check
                                type="switch"
                                id="iptv-toggle"
                                label="Вывести каналы с IPTV"
                                checked={showIptv}
                                onChange={(e) => setShowIptv(e.currentTarget.checked)}
                            />
                        </div>

                        {/* ⬇️ далее условный рендер IPTV / библиотека */}
                        {showIptv ? (
                            <div className="mt-2">
                                {iptvLoading && (
                                    <div className="text-muted p-3">Загрузка каналов...</div>
                                )}

                                {iptvError && (
                                    <div className="text-danger p-3">{iptvError}</div>
                                )}

                                {!iptvLoading && !iptvError && groupedIptv.length === 0 && (
                                    <div className="text-muted p-3">Каналы не найдены</div>
                                )}

                                {!iptvLoading && !iptvError && groupedIptv.length > 0 && (
                                    <div className="accordion" id="iptvAccordion">
                                        {groupedIptv.map(([groupName, channels], idx) => {
                                            const headingId = `heading-${idx}`;
                                            const collapseId = `collapse-${idx}`;
                                            return (
                                                <div className="accordion-item" key={groupName}>
                                                    <h2 className="accordion-header" id={headingId}>
                                                        <button
                                                            className={`accordion-button ${idx > 0 ? 'collapsed' : ''}`}
                                                            type="button"
                                                            data-bs-toggle="collapse"
                                                            data-bs-target={`#${collapseId}`}
                                                            aria-expanded={idx === 0 ? 'true' : 'false'}
                                                            aria-controls={collapseId}
                                                        >
                                                            {groupName} <span
                                                            className="ms-2 text-muted">({channels.length})</span>
                                                        </button>
                                                    </h2>
                                                    <div
                                                        id={collapseId}
                                                        className={`accordion-collapse collapse ${idx === 0 ? 'show' : ''}`}
                                                        aria-labelledby={headingId}
                                                        data-bs-parent="#iptvAccordion"
                                                    >
                                                        <div className="accordion-body p-0">
                                                            <div className="list-group list-group-flush">
                                                                {channels.map(ch => (
                                                                    <div
                                                                        key={ch.url}
                                                                        className="list-group-item d-flex align-items-center justify-content-between"
                                                                        role="button"
                                                                        tabIndex={0}
                                                                        onClick={() => addIptvToPlaylist(ch)}
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'Enter' || e.key === ' ') {
                                                                                e.preventDefault();
                                                                                addIptvToPlaylist(ch);
                                                                            }
                                                                        }}
                                                                        style={{cursor: 'pointer', userSelect: 'none'}}
                                                                        title="Добавить канал в плейлист"
                                                                    >
                                                                        <div
                                                                            className="d-flex align-items-center gap-2 overflow-hidden"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                addIptvToPlaylist(ch);
                                                                            }}
                                                                        >

                                                                            {/* ЛОГОТИП — кликабельно добавляет */}
                                                                            {ch.logo ? (
                                                                                <img
                                                                                    src={ch.logo}
                                                                                    alt={ch.name}
                                                                                    width={28}
                                                                                    height={28}
                                                                                    style={{
                                                                                        objectFit: 'contain',
                                                                                        cursor: 'pointer'
                                                                                    }}
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        addIptvToPlaylist(ch);
                                                                                    }}
                                                                                    title="Добавить канал в плейлист"
                                                                                />
                                                                            ) : (
                                                                                <div
                                                                                    className="bg-light border rounded"
                                                                                    style={{width: 28, height: 28}}
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        addIptvToPlaylist(ch);
                                                                                    }}
                                                                                    title="Добавить канал в плейлист"
                                                                                />
                                                                            )}

                                                                            {/* ИМЯ — кликабельно добавляет */}
                                                                            <div
                                                                                className="flex-grow-1 overflow-hidden">
                                                                                <div
                                                                                    className="text-truncate"
                                                                                    style={{cursor: 'pointer'}}
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        addIptvToPlaylist(ch);
                                                                                    }}
                                                                                    title="Добавить канал в плейлист"
                                                                                >
                                                                                    {ch.name}
                                                                                </div>

                                                                                {/* URL — ссылка в новую вкладку, НЕ добавляет */}
                                                                                <p
                                                                                    className="text-muted small text-truncate d-block"
                                                                                    onClick={(e) => e.stopPropagation()}
                                                                                    title="Открыть поток в новой вкладке"
                                                                                >
                                                                                    {ch.url}
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        ) : (
                            // === СТАРЫЙ ВЫВОД БИБЛИОТЕКИ, как у вас было ===
                            <>
                                {libraryItems.length > 0 ? (
                                    <div className="list-group">
                                        {libraryItems.map(li => (
                                            <div
                                                key={li.fileId}
                                                className="list-group-item d-flex align-items-center justify-content-between"
                                                style={{cursor: 'pointer'}}
                                                onClick={() => addFileToPlaylist(li)}
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
                            </>
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


