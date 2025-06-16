'use client'
import React from 'react'
import {Button} from 'react-bootstrap'

export default function ScheduleHeader() {
    return (
        <header
            style={{
                padding: 20,
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center'
            }}
        >
            <Button
                onClick={() => { /* TODO: */
                }}
                variant="primary"
            >
                Сохранить
            </Button>
        </header>
    )
}
