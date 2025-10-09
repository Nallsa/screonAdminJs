/*
 * Copyright (c) LLC "Centr Distribyucii"
 * All rights reserved.
 */

'use client'
import React from 'react'
import {Form, Button, InputGroup, Col, Card} from 'react-bootstrap'
import {RU_DAYS} from '@/app/lib/scheduleUtils'
import {useScheduleStore} from '@/app/store/scheduleStore'

export default function WhenToShowCard() {
    const {
        startTime,
        endTime,
        setStartTime,
        setEndTime,
        selectedDays,
        toggleDay,
    } = useScheduleStore()

    const setFullDay = () => {
        setStartTime('00:00')
        setEndTime('00:00')
    }
    const isFullDay = (startTime === '00:00' && endTime === '00:00')

    return (
        <Card>
            <Card.Header>Когда показывать</Card.Header>
            <Card.Body>

                <div className="d-grid gap-2 d-sm-none mb-3">
                    <Form.Group>
                        <Form.Label className="mb-1">С</Form.Label>
                        <Form.Control
                            type="time"
                            value={startTime || ''}
                            onChange={e => {
                                const t = e.target.value
                                setStartTime(t)
                                if (endTime < t) setEndTime(t)
                            }}
                            max={endTime}
                        />
                    </Form.Group>
                    <Form.Group>
                        <Form.Label className="mb-1">До</Form.Label>
                        <Form.Control
                            type="time"
                            value={endTime || ''}
                            onChange={e => {
                                const t = e.target.value
                                if (t >= startTime) setEndTime(t)
                            }}
                            min={startTime}
                        />
                    </Form.Group>
                </div>

                <div className="d-flex flex-row mb-2 justify-content-center">
                    <InputGroup className="d-none d-sm-flex mb-3" style={{maxWidth: 350}}>
                        <InputGroup.Text>С</InputGroup.Text>
                        <Form.Control
                            type="time"
                            value={startTime || ''}
                            onChange={e => {
                                const t = e.target.value
                                setStartTime(t)
                                if (endTime < t) setEndTime(t)
                            }}
                            max={endTime}
                        />
                        <InputGroup.Text>До</InputGroup.Text>
                        <Form.Control
                            type="time"
                            value={endTime || ''}
                            onChange={e => {
                                const t = e.target.value
                                if (t >= startTime) setEndTime(t)
                            }}
                            min={startTime}
                        />

                    </InputGroup>


                    <Button
                        variant={isFullDay ? 'success' : 'outline-secondary'}
                        onClick={setFullDay}
                        className="text-nowrap w-auto flex-shrink-0"
                        style={{whiteSpace: 'nowrap', height: 38, marginLeft: 12}}
                    >
                        Полный&nbsp;день {isFullDay ? '✓' : ''}
                    </Button>
                </div>


                {/* Дни недели */}
                <Col xs="auto">

                    <div
                        className="d-grid d-sm-none"
                        style={{gridTemplateColumns: 'repeat(4, 1fr)', gap: 8}}
                    >
                        {RU_DAYS.map(d => (
                            <Button
                                key={d}
                                className="w-100"
                                variant={selectedDays.includes(d) ? 'success' : 'outline-secondary'}
                                onClick={() => toggleDay(d)}
                            >
                                {d}
                            </Button>
                        ))}
                    </div>

                    <div className="d-none d-sm-flex flex-wrap gap-2 justify-content-center">
                        {RU_DAYS.map(d => (
                            <Button
                                key={d}
                                variant={selectedDays.includes(d) ? 'success' : 'outline-secondary'}
                                onClick={() => toggleDay(d)}
                            >
                                {d}
                            </Button>
                        ))}
                    </div>
                </Col>
            </Card.Body>
        </Card>
    )
}
