/*
 * Copyright (c) LLC "Centr Distribyucii"
 * All rights reserved.
 */

'use client'
import React, {useEffect} from 'react'
import ScheduleHeader from '@/app/components/Schedule/ScheduleHeader'
import ScheduleSettingsPanel from '@/app/components/Schedule/Settings/ScheduleSettingsPanel'
import EditableScheduleTable from '@/app/components/Schedule/EditableScheduleTable'
import {useAuthStore} from "@/app/store/authStore";
import {connectWebSocket} from "@/app/API/ws";
import {useScheduleStore} from "@/app/store/scheduleStore";
import ErrorModal from "@/app/components/Common/ErrorModal";
import {WarningModal} from "@/app/components/Common/WarningModal";
import {useOrganizationStore} from "@/app/store/organizationStore";

export default function SchedulePage() {
    const {errorMessage, setError, successMessage, setSuccess, getSchedule} = useScheduleStore()
    const activeBranches = useOrganizationStore(state => state.activeBranches)

    useEffect(() => {
        getSchedule()
    }, [activeBranches.length])

    return (
        <div style={{padding: 16, display: 'flex', flexDirection: 'column', gap: 24}}>
            <ScheduleHeader/>
            <ScheduleSettingsPanel/>
            <EditableScheduleTable/>
            <WarningModal show={!!successMessage} title="Готово" message={successMessage || ''} buttonText="Ок"
                          onClose={() => setSuccess(null)}/>
            <ErrorModal show={!!errorMessage} message={errorMessage || ''} onClose={() => setError(null)}/>
        </div>
    )
}
