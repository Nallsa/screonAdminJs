'use client'
import React from 'react'
import {Form} from 'react-bootstrap'
import {useScheduleStore} from '@/app/store/scheduleStore'

export default function AdvertisementShowModePicker() {
    const {advertisementShowMode, setAdvertisementShowMode} = useScheduleStore()
    return (
        <>
            <Form.Check
                inline
                type="checkbox"
                label="Раз в N минут"
                checked={advertisementShowMode === 'minutes'}
                onChange={() => setAdvertisementShowMode('minutes')}
            />
            <Form.Check
                inline
                type="checkbox"
                label="Раз в N часов"
                checked={advertisementShowMode === 'hours'}
                onChange={() => setAdvertisementShowMode('hours')}
            />
            <Form.Check
                inline
                type="checkbox"
                label="Раз в определённые часы"
                checked={advertisementShowMode === 'specific'}
                onChange={() => setAdvertisementShowMode('specific')}
            />
        </>
    )
}
