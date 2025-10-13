/*
 * Copyright (c) LLC "Centr Distribyucii"
 * All rights reserved.
 */

'use client'

import React, {useEffect, useMemo, useState} from 'react'
import {Card, Button, Form, Modal, Spinner} from 'react-bootstrap'
import {useScreensStore} from '@/app/store/screensStore'
import {DeviceStatus, GroupData, ScreenData} from "@/public/types/interfaces";
import ConfirmModal from "@/app/components/Common/ConfirmModal";
import {usePlaylistStore} from "@/app/store/playlistStore";
import {useScheduleStore} from "@/app/store/scheduleStore";
import {shallow} from 'zustand/shallow';
import PreviewImage from "@/app/components/Common/PreviewImage";
import {useCurrentPlayingPlaylist} from "@/app/hooks/useCurrentPlayingPlaylist";
import {fmtC, fmtPct, fmtVer, formatLastSeen} from "@/app/lib/screensUtils";

interface ScreenCardProps {
    screen: ScreenData
    isCreatingGroup: boolean
    isSelected: boolean
    onSelect?: () => void
}

export default function ScreenCard({
                                       screen,
                                       isCreatingGroup,
                                       isSelected,
                                       onSelect,
                                   }: ScreenCardProps) {


    const delScreen = useScreensStore(state => state.delScreen)
    const groups = useScreensStore(state => state.groups)
    const assignGroupToScreen = useScreensStore(state => state.assignGroupToScreen)
    const updateScreenName = useScreensStore(state => state.updateScreenName)

    const [showConfirm, setShowConfirm] = useState(false)
    const [showEditModal, setShowEditModal] = useState(false)

    const [editModalName, setEditModalName] = useState(screen.name)
    const [editModalGroup, setEditModalGroup] = useState<string | null>(screen.groupId ?? null);

    const sendGetStatus = useScreensStore(s => s.sendGetStatus);
    const live = useScreensStore(s => s.statusByScreen[screen.id]);
    const needsUpdate = useScreensStore(s => s.needsUpdate);
    const latestName = useScreensStore(s => s.latestPlayerVersionName);

    // Собираем имена групп, в которые входит этот экран
    const groupName = screen.groupId
        ? groups.find(g => g.id === screen.groupId)?.name || '— без группы —'
        : ' без группы '


    const statusEntry = useScreensStore(s => s.statusByScreen[screen.id]);
    const isOnline = (() => {
        const s = statusEntry?.status?.toLowerCase();
        return s === 'online' || s === 'connected' || s === 'ok';
    })();


    const [showStatusModal, setShowStatusModal] = useState(false);
    const [statusLoading, setStatusLoading] = useState(false);
    const [seenAt, setSeenAt] = useState<string | undefined>(undefined);
    const [prevRecvAt, setPrevRecvAt] = useState<number | null>(null);
    const timeoutRef = React.useRef<any>(null);
    const currentPl = useCurrentPlayingPlaylist(screen.id);

    function openStatus() {
        setShowStatusModal(true);
        // setStatusLoading(true);
        // setPrevRecvAt(live?.receivedAt ?? null);
        // sendGetStatus(screen.id);
        //
        //
        // clearTimeout(timeoutRef.current);
        // timeoutRef.current = setTimeout(() => setStatusLoading(false), 4000);
    }


    useEffect(() => {
        if (!statusLoading) return;
        const rec = live?.receivedAt ?? 0;
        if (prevRecvAt == null || rec > prevRecvAt) {
            setStatusLoading(false);
            setPrevRecvAt(rec);
            clearTimeout(timeoutRef.current);
        }
    }, [statusLoading, live?.receivedAt, prevRecvAt]);

    function handleDelete() {
        delScreen(screen.id)
        setShowConfirm(false)
    }

    function openEdit() {
        setEditModalName(screen.name);
        setEditModalGroup(screen.groupId ?? null);
        setShowEditModal(true);
    }

    async function saveEditModal() {
        try {
            await updateScreenName(screen.id, editModalName)

            await assignGroupToScreen(screen.id, editModalGroup)

            setShowEditModal(false)
        } catch (e) {
            console.error(e)
        }
    }


    const Row = ({label, value}: { label: string; value: React.ReactNode }) => (
        <div className="d-flex align-items-start justify-content-between mb-2"
             style={{gap: 16, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto'}}>
            <span className="text-muted">{label}</span>
            <span className="fw-semibold text-end" style={{minWidth: 140}}>{value}</span>
        </div>
    );


    return (
        <>
            <Card
                className="shadow-sm position-relative"
                style={{width: 240, borderRadius: 8}}
            >
                {isCreatingGroup && onSelect && (
                    <Form.Check
                        type="checkbox"
                        checked={isSelected}
                        onChange={onSelect}
                        className="position-absolute"
                        style={{top: 8, right: 8, zIndex: 10}}
                    />
                )}

                {/* Превью */}
                <div
                    style={{
                        height: 120,
                        borderTopLeftRadius: 8,
                        borderTopRightRadius: 8,
                        overflow: 'hidden',
                        background: '#000',
                        position: 'relative',              // ВАЖНО для PreviewImage с prop `fill`
                    }}
                >
                    {currentPl?.filePreviewId && isOnline && (
                        <PreviewImage
                            id={currentPl.filePreviewId}
                            name={currentPl.name}
                            fill
                            aspectRatio={16 / 9}
                        />
                    )}
                </div>
                <Card.Body className="p-2">
                    {/* Название */}
                    <Card.Title as="h6" className="mb-1">
                        {screen.name}
                    </Card.Title>

                    {/* Статус */}
                    <div className="d-flex align-items-center mb-1" style={{gap: 6}}>
  <span
      style={{
          display: 'inline-block',
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: isOnline ? 'green' : 'red',
      }}
  />
                        {isOnline ? 'Онлайн' : 'Оффлайн'}
                        {/*                    {!!live?.lastSeenAt && (*/}
                        {/*                        <span className="text-muted ms-2" style={{fontSize: 12}}>*/}
                        {/*  (обновлено {formatAgo(live.lastSeenAt)})*/}
                        {/*</span>*/}
                        {/*                    )}*/}
                    </div>


                    {/* Группа */}
                    <div className="mb-3">
                        <strong>Группа:</strong> {groupName}
                    </div>

                    {/* Действия */}
                    <div className="d-flex flex-wrap gap-2">

                        {['Статус', 'Редактировать', 'Удалить'].map(label => (
                            <Button
                                key={label}
                                size="sm"
                                variant="outline-primary"
                                className="flex-grow-1"
                                onClick={() => {
                                    if (label == 'Удалить') setShowConfirm(true)
                                    if (label === 'Редактировать') openEdit()
                                    if (label === 'Статус') openStatus()
                                }}
                            >
                                {label}
                                {label === 'Статус' && needsUpdate(screen.id) && (
                                    <span
                                        className="ms-1"
                                        title={latestName ? `Доступно обновление (${latestName})` : 'Доступно обновление'}
                                        aria-label="Доступно обновление"
                                        style={{lineHeight: 1}}
                                    >
                                        ⚠️
                                    </span>
                                )}
                            </Button>
                        ))}


                    </div>
                </Card.Body>
            </Card>


            {/* Модальное окно подтверждения удаления */}
            <ConfirmModal
                show={showConfirm}
                title="Подтвердите удаление"
                message={`Вы уверены, что хотите удалить экран «${screen.name}»?`}
                confirmText="Удалить"
                cancelText="Отмена"
                onConfirm={handleDelete}
                onCancel={() => setShowConfirm(false)}
            />

            {/*Редактирование экрана*/}
            <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Редактировать экран</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group className="mb-4">
                            <Form.Label>Имя экрана</Form.Label>
                            <Form.Control
                                type="text"
                                value={editModalName}
                                onChange={e => setEditModalName(e.target.value)}
                                placeholder="Введите новое имя"
                            />
                        </Form.Group>

                        <Form.Group>
                            <Form.Label>Группа</Form.Label>
                            <Form.Select
                                value={editModalGroup || ''}
                                onChange={e => setEditModalGroup(e.target.value)}
                            >
                                <option value="">— без группы —</option>
                                {groups.map(g => (
                                    <option key={g.id} value={g.id}>{g.name}</option>
                                ))}
                            </Form.Select>
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer className="d-flex justify-content-between">
                    <Button variant="secondary" onClick={() => setShowEditModal(false)}>
                        Отмена
                    </Button>
                    <Button
                        variant="primary"
                        onClick={saveEditModal}
                        disabled={!editModalName.trim()}
                    >
                        Сохранить
                    </Button>
                </Modal.Footer>
            </Modal>

            {/*Статус*/}
            <Modal show={showStatusModal} onHide={() => setShowStatusModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Статус экрана</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div style={{position: 'relative', minHeight: isOnline ? 160 : 30}}>
                        {!isOnline && (
                            <div>Офлайн</div>
                        )}
                        {live && (
                            <div aria-hidden={statusLoading}>
                                <Row label="Статус:" value={isOnline ? 'Онлайн' : 'Оффлайн'}/>
                                <Row label="Загрузка процессора:" value={fmtPct(live.cpuLoad)}/>
                                <Row label="Температура процессора:" value={fmtC(live.temperature)}/>
                                <Row label="Загрузка ОЗУ:" value={fmtPct(live.ramUsage)}/>
                                <Row label="Ориентация экрана:"
                                     value={live.orientation == 'horizontal' ? "Горизонтальная" : "Вертикальная"}/>
                                <Row label="Версия плеера:" value={fmtVer(live.playerVersion)}/>
                                <Row label="Последняя проверка:"
                                     value={statusEntry ? formatLastSeen(statusEntry.lastSeenAt) : '—'}/>
                            </div>
                        )}

                        {statusLoading && (
                            <div
                                style={{
                                    position: 'absolute', inset: 0,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: 'rgba(255,255,255,0.6)',
                                    backdropFilter: 'blur(1px)'
                                }}
                            >
                                <Spinner animation="border" className="me-2"/> Обновляем…
                            </div>
                        )}

                        {needsUpdate(screen.id) && (
                            <div className="mt-3 p-2 rounded-2"
                                 style={{
                                     background: '#fff3cd',
                                     border: '1px solid #ffe69c',
                                     color: '#664d03',
                                     fontSize: 13
                                 }}>
                                Доступно обновление{latestName ? ` (${latestName})` : ''}. Перезапустите экран.
                            </div>
                        )}
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <Button
                        variant="primary"
                        onClick={() => {
                            setStatusLoading(true);
                            setPrevRecvAt(live?.receivedAt ?? null);
                            sendGetStatus(screen.id);
                            clearTimeout(timeoutRef.current);
                            timeoutRef.current = setTimeout(() => setStatusLoading(false), 4000);
                        }}
                        disabled={statusLoading}
                    >
                        {statusLoading ? (
                            <>
                                <Spinner as="span" animation="border" size="sm" className="me-2"/>
                                Обновляем…
                            </>
                        ) : (
                            'Обновить'
                        )}
                    </Button>
                </Modal.Footer>

            </Modal>
        </>

    )
}
