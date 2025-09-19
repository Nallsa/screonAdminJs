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

    return (
        <>
            <Card>
                <Card.Header>Когда показывать</Card.Header>
                <Card.Body>

                    <InputGroup className="mb-3" style={{maxWidth: 300}}>
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

                    <Col xs="auto">
                        <div style={{display: 'flex', gap: 8}}>
                            {RU_DAYS.map(d => (
                                <Button
                                    key={d}
                                    size="sm"
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
        </>
    )
}
