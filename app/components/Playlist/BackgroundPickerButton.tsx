/*
 * Copyright (c) LLC "Centr Distribyucii"
 * All rights reserved.
 */

'use client'

import React, {useState} from 'react'
import {Button, Modal, Form, Spinner} from 'react-bootstrap'
import {usePlaylistStore} from '@/app/store/playlistStore'
import {useScheduleStore} from "@/app/store/scheduleStore"
import {getValueInStorage} from "@/app/API/localStorage"
import {useScreensStore} from "@/app/store/screensStore";

type Props = {
    branchId: string
    className?: string
    size?: 'sm' | 'lg'
}

export default function BackgroundPickerButton({branchId, className, size}: Props) {
    const {playlistItems} = usePlaylistStore()
    const {
        backgroundByBranch,
        resolveBackground,
        setBackground,
    } = useScheduleStore()
    const {allScreens} = useScreensStore()

    const [show, setShow] = useState(false)
    const [loading, setLoading] = useState(false)
    const bg = backgroundByBranch?.[branchId]
    const [selectedId, setSelectedId] = useState<string>('')

    const open = async () => {
        setShow(true)
        setLoading(true)
        try {
            await resolveBackground(branchId)
            const fresh = useScheduleStore.getState().backgroundByBranch?.[branchId]
            setSelectedId(fresh?.playlistId ?? '')
        } finally {
            setLoading(false)
        }
    }

    const apply = async () => {
        if (!selectedId) return
        setLoading(true)
        try {
            const orgId = getValueInStorage('organizationId')! // нужен для backgroundSet
            const ok = await setBackground({
                branchId,
                orgId,
                playlistId: selectedId,
                screenIds: allScreens.map(b => b.id)
            })
            if (ok) setShow(false)
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <Button variant="outline-secondary" className={className} size={size} onClick={open}>
                Задать фоновый плейлист
            </Button>

            <Modal show={show} onHide={() => setShow(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Фоновый плейлист</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {loading ? (
                        <div className="d-flex align-items-center gap-2">
                            <Spinner size="sm"/> Загрузка…
                        </div>
                    ) : (
                        <>
                            <Form.Label>Выберите плейлист</Form.Label>
                            <Form.Select
                                value={selectedId}
                                onChange={(e) => setSelectedId(e.target.value)}
                            >
                                <option value="" disabled>— не выбрано —</option>
                                {playlistItems.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </Form.Select>

                            {bg?.playlistId && (
                                <div className="mt-2 text-muted" style={{fontSize: 12}}>
                                    Текущий фон:{' '}
                                    <b>{playlistItems.find(p => p.id === bg.playlistId)?.name ?? bg.playlistId}</b>
                                </div>
                            )}
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShow(false)} disabled={loading}>Отмена</Button>
                    <Button variant="primary" onClick={apply} disabled={loading || !selectedId}>
                        {loading ? 'Сохраняем…' : 'Сохранить'}
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    )
}