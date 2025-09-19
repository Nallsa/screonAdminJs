/*
 * Copyright (c) LLC "Centr Distribyucii"
 * All rights reserved.
 */

'use client'
import React, {useState} from 'react'
import {Form, InputGroup, Button, ListGroup, Card} from 'react-bootstrap'
import {useScheduleStore} from '@/app/store/scheduleStore'
import PlaylistShowModePicker from "@/app/components/Schedule/Settings/ShowMode/PlaylistShowModePicker";
import AdvertisementShowModePicker from "@/app/components/Schedule/Settings/ShowMode/AdvertisementShowModePicker";

export default function HowToShowCard() {
    const {
        typeMode,
        showMode,
        setShowMode,
        advertisementShowMode,
        setAdvertisementShowMode,
        advertisementIntervalMinutes,
        setAdvertisementIntervalMinutes,
        advertisementIntervalHours,
        setAdvertisementIntervalHours,
        advertisementSpecificTimes,
        addAdvertisementSpecificTime,
        removeAdvertisementSpecificTime,
        startTime,
        endTime,
    } = useScheduleStore()

    // локальный выбор времени для "определённых часов"
    const [pendingTime, setPendingTime] = useState<string>('08:00')

    return (
        <>
            <Card.Header className="border-top">Как показывать</Card.Header>
            <Card.Body>


                {typeMode === 'PLAYLIST' ? (
                    <PlaylistShowModePicker/>
                ) : (
                    <AdvertisementShowModePicker/>
                )}

                {typeMode === 'ADVERTISEMENT' && (
                    <div className="d-flex justify-content-center align-content-center">
                        <div className="mt-3 flex-column flex-sm-row">
                            {advertisementShowMode === 'minutes' && (
                                <InputGroup style={{maxWidth: 300}} className="mb-2">
                                    <InputGroup.Text>Интервал, мин</InputGroup.Text>
                                    <Form.Control
                                        type="number"
                                        value={advertisementIntervalMinutes}
                                        onChange={e => setAdvertisementIntervalMinutes(+e.target.value)}
                                    />
                                </InputGroup>
                            )}

                            {advertisementShowMode === 'hours' && (
                                <InputGroup style={{maxWidth: 300}} className="mb-2">
                                    <InputGroup.Text>Интервал, ч</InputGroup.Text>
                                    <Form.Control
                                        type="number"
                                        value={advertisementIntervalHours}
                                        onChange={e => setAdvertisementIntervalHours(+e.target.value)}
                                    />
                                </InputGroup>
                            )}

                            {advertisementShowMode === 'specific' && (
                                <>
                                    <div className="d-flex justify-content-center align-content-center">
                                        <Form.Select
                                            style={{marginRight: 12, maxWidth: 150}}
                                            value={pendingTime}
                                            onChange={e => setPendingTime(e.target.value)}
                                        >
                                            {Array.from({length: 24}, (_, i) => {
                                                const hh = String(i).padStart(2, '0') + ':00'
                                                return (
                                                    <option
                                                        key={hh}
                                                        value={hh}
                                                        disabled={hh < startTime || hh >= endTime}
                                                    >
                                                        {hh}
                                                    </option>
                                                )
                                            })}
                                        </Form.Select>
                                        <Button
                                            style={{width: 220}}
                                            disabled={pendingTime < startTime || pendingTime > endTime}
                                            onClick={() => addAdvertisementSpecificTime(pendingTime)}
                                        >
                                            Добавить
                                        </Button>
                                    </div>

                                    <ListGroup style={{maxWidth: 200}} className="mb-2">
                                        {advertisementSpecificTimes.map(t => (
                                            <ListGroup.Item
                                                key={t}
                                                className="d-flex justify-content-between"
                                            >
                                                {t}
                                                <Button
                                                    variant="outline-danger"
                                                    size="sm"
                                                    onClick={() => removeAdvertisementSpecificTime(t)}
                                                >
                                                    &times;
                                                </Button>
                                            </ListGroup.Item>
                                        ))}
                                    </ListGroup>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </Card.Body>
        </>
    )
}
