'use client'
import React from 'react'
import {Dropdown} from 'react-bootstrap'
import {useScheduleStore} from '@/app/store/scheduleStore'

export default function PrioritySelect() {
    const {typeMode, priority, setPriority} = useScheduleStore()

    if (typeMode === 'ADVERTISEMENT') {
        return (
            <span className="d-flex flex-column justify-content-center align-items-center text-center">
        Высокий приоритет
      </span>
        )
    }

    return (
        <Dropdown onSelect={k => setPriority(Number(k))}>
            <Dropdown.Toggle variant="primary">Приоритет: {priority}</Dropdown.Toggle>
            <Dropdown.Menu>
                {Array.from({length: 10}, (_, i) => (
                    <Dropdown.Item key={i + 1} eventKey={(i + 1).toString()}>
                        {i + 1}
                    </Dropdown.Item>
                ))}
            </Dropdown.Menu>
        </Dropdown>
    )
}
