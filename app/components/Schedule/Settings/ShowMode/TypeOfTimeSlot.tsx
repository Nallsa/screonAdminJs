/*
 * Copyright (c) LLC "Centr Distribyucii"
 * All rights reserved.
 */

'use client'
import React from 'react'
import {Card, Form} from 'react-bootstrap'
import {useScheduleStore} from '@/app/store/scheduleStore'

export default function TypeOfTimeSlot() {
    const {typeMode, setTypeMode} = useScheduleStore()

    return (
        <>
            <Card.Header>Тип слотов</Card.Header>
            <Card.Body>


                <Form.Group>
                    <div className="d-flex gap-3 flex-column flex-sm-row">
                        <Form.Check
                            inline
                            type="checkbox"
                            id="mode-playlist"
                            name="typeMode"
                            label="Обычный слот"
                            checked={typeMode === 'PLAYLIST'}
                            onChange={() => setTypeMode('PLAYLIST')}
                        />
                        <Form.Check
                            inline
                            type="checkbox"
                            id="mode-advertisement"
                            name="typeMode"
                            label="Реклама"
                            checked={typeMode === 'ADVERTISEMENT'}
                            onChange={() => setTypeMode('ADVERTISEMENT')}
                        />
                    </div>
                </Form.Group>
            </Card.Body>
        </>
    )
}
