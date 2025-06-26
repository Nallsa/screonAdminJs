'use client'
import React, {useEffect} from 'react'
import ScheduleHeader from '@/app/components/Schedule/ScheduleHeader'
import ScheduleSettingsPanel from '@/app/components/Schedule/ScheduleSettingsPanel'
import EditableScheduleTable from '@/app/components/Schedule/EditableScheduleTable'
import {useAuthStore} from "@/app/store/authStore";
import {connectWebSocket} from "@/app/API/ws";
import {useScheduleStore} from "@/app/store/scheduleStore";
import ErrorModal from "@/app/components/Common/ErrorModal";

export default function SchedulePage() {
    const {errorMessage, setError} = useScheduleStore()

    return (
        <div style={{padding: 16, display: 'flex', flexDirection: 'column', gap: 24}}>
            <ScheduleHeader/>
            <ScheduleSettingsPanel/>
            <EditableScheduleTable/>
            <ErrorModal show={!!errorMessage} message={errorMessage || ''} onClose={() => setError(null)}/>
        </div>
    )
}
