'use client'

import React, {useEffect, useState} from 'react'
import {Card, Button, Form, Modal} from 'react-bootstrap'
import {useScreensStore} from '@/app/store/screensStore'
import {DeviceStatus, GroupData, ScreenData} from "@/public/types/interfaces";
import ConfirmModal from "@/app/components/Common/ConfirmModal";

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

    // Собираем имена групп, в которые входит этот экран
    const groupName = screen.groupId
        ? groups.find(g => g.id === screen.groupId)?.name || '— без группы —'
        : '— без группы —'


    const sendGetStatus = useScreensStore(s => s.sendGetStatus);
    const live = useScreensStore(s => s.statusByScreen[screen.id]);
    const isOnline = useScreensStore(s => s.isScreenOnline(screen.id));

    const [showStatusModal, setShowStatusModal] = useState(false);
    const [statusLoading, setStatusLoading] = useState(false);
    const [seenAt, setSeenAt] = useState<string | undefined>(undefined);
    const [prevRecvAt, setPrevRecvAt] = useState<number | null>(null);
    const timeoutRef = React.useRef<any>(null);

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


    // хэлперы для модалки статуса
    const fmtPct = (n?: number) => (n == null ? '—' : `${n.toFixed(1)} %`);
    const fmtC = (n?: number) => (n == null ? '—' : `${n.toFixed(1)} °C`);
    const fmtVer = (s?: string) => s ?? '—';


    function formatAgo(iso?: string, locale = navigator.language): string {
        if (!iso) return '—';
        const d = new Date(iso);
        const diffSec = Math.round((Date.now() - d.getTime()) / 1000);
        const abs = Math.abs(diffSec);
        if ('RelativeTimeFormat' in Intl) {
            const rtf = new Intl.RelativeTimeFormat(locale, {numeric: 'auto'});
            if (abs < 60) return rtf.format(-diffSec, 'second');
            else if (abs < 3600) return rtf.format(-Math.trunc(diffSec / 60), 'minute');
            else if (abs < 86400) return rtf.format(-Math.trunc(diffSec / 3600), 'hour');
            return rtf.format(-Math.trunc(diffSec / 86400), 'day');
        }
        // fallback
        if (abs < 60) return `${abs} с назад`;
        if (abs < 3600) return `${Math.trunc(abs / 60)} мин назад`;
        if (abs < 86400) return `${Math.trunc(abs / 3600)} ч назад`;
        return `${Math.trunc(abs / 86400)} дн назад`;
    }

    function formatLastSeen(iso?: string, locale = navigator.language): string {
        if (!iso) return '—';
        const d = new Date(iso);
        if (isNaN(d.getTime())) return iso;

        const dtf = new Intl.DateTimeFormat(locale, {
            dateStyle: 'medium',
            timeStyle: 'medium',
        });
        const nice = dtf.format(d);

        // относительное время
        const now = new Date();
        const diffSec = Math.round((d.getTime() - now.getTime()) / 1000);
        const abs = Math.abs(diffSec);

        let rel = '';
        if ('RelativeTimeFormat' in Intl) {
            const rtf = new Intl.RelativeTimeFormat(locale, {numeric: 'auto'});
            if (abs < 60) rel = rtf.format(Math.trunc(diffSec), 'second');
            else if (abs < 3600) rel = rtf.format(Math.trunc(diffSec / 60), 'minute');
            else if (abs < 86400) rel = rtf.format(Math.trunc(diffSec / 3600), 'hour');
            else rel = rtf.format(Math.trunc(diffSec / 86400), 'day');
        } else {
            rel = abs < 60 ? `${abs} с назад`
                : abs < 3600 ? `${Math.trunc(abs / 60)} мин назад`
                    : abs < 86400 ? `${Math.trunc(abs / 3600)} ч назад`
                        : `${Math.trunc(abs / 86400)} дн назад`;
        }

        // таймзона пользователя (UTC±hh:mm)
        const tzOffsetMin = -d.getTimezoneOffset();
        const sign = tzOffsetMin >= 0 ? '+' : '-';
        const hh = String(Math.floor(Math.abs(tzOffsetMin) / 60)).padStart(2, '0');
        const mm = String(Math.abs(tzOffsetMin) % 60).padStart(2, '0');


        return `${nice} (UTC${sign}${hh}:${mm})`;
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
                        height: 140,
                        background: '#000',
                        borderTopLeftRadius: 8,
                        borderTopRightRadius: 8,
                    }}
                />

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
                        {screen.status ? (
                            ['Статус', 'Редактировать', 'Удалить'].map(label => (
                                <Button
                                    key={label}
                                    size="sm"
                                    variant="outline-primary"
                                    className="flex-grow-1"

                                    onClick={() => {
                                        if (label == 'Удалить') {
                                            setShowConfirm(true)
                                        }
                                        if (label === 'Редактировать') openEdit()
                                        if (label === 'Статус') openStatus();

                                    }}
                                >
                                    {label}
                                </Button>
                            ))
                        ) : (
                            ['Перезапуск', 'Диагностика'].map(label => (
                                <Button
                                    key={label}
                                    size="sm"
                                    variant="outline-primary"
                                    className="flex-grow-1"
                                >
                                    {label}
                                </Button>
                            ))
                        )}
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

            <Modal show={showStatusModal} onHide={() => setShowStatusModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Статус экрана</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {statusLoading && <div>Запрашиваем статус…</div>}
                    {!statusLoading && live && (
                        <div>
                            <Row label="Статус:" value={live.status ?? '—'}/>
                            <Row label="Загрузка процессора:" value={fmtPct(live.cpuLoad)}/>
                            <Row label="Температура процессора:" value={fmtC(live.temperature)}/>
                            <Row label="Загрузка ОЗУ:" value={fmtPct(live.ramUsage)}/>
                            <Row label="Версия плеера:" value={fmtVer(live.playerVersion)}/>
                            <Row label="Последняя проверка:" value={formatLastSeen(live.lastSeenAt)}/>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowStatusModal(false)}>Закрыть</Button>
                    <Button
                        variant="primary"
                        onClick={() => {
                            setStatusLoading(true);
                            setSeenAt(live?.lastSeenAt);
                            sendGetStatus(screen.id);
                        }}
                    >
                        Обновить
                    </Button>
                </Modal.Footer>

            </Modal>
        </>

    )
}
