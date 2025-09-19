/*
 * Copyright (c) LLC "Centr Distribyucii"
 * All rights reserved.
 */

'use client'
import React from 'react'
import {Form} from 'react-bootstrap'
import {useScheduleStore} from '@/app/store/scheduleStore'

export default function PlaylistShowModePicker() {
    const {showMode, setShowMode} = useScheduleStore()
    return (
        <Form.Group>
            <div className="d-flex gap-3 flex-column flex-sm-row justify-content-around">
                <Form.Check
                    inline
                    type="checkbox"
                    label="Один раз"
                    checked={showMode === 'once'}
                    onChange={() => setShowMode('once')}
                />
                <Form.Check
                    inline
                    type="checkbox"
                    label="Зациклено"
                    checked={showMode === 'cycle'}
                    onChange={() => setShowMode('cycle')}
                />
            </div>
        </Form.Group>
    )
}
