'use client'
import React, {useEffect} from 'react'
import ScheduleHeader from '@/app/components/Schedule/ScheduleHeader'
import ScheduleSettingsPanel from '@/app/components/Schedule/ScheduleSettingsPanel'
import EditableScheduleTable from '@/app/components/Schedule/EditableScheduleTable'
import {useAuthStore} from "@/app/store/authStore";
import {connectWebSocket} from "@/app/API/ws";
import {useScheduleStore} from "@/app/store/scheduleStore";

export default function SchedulePage() {
    const checkToken = useAuthStore(s => s.checkToken)
    const getSchedule = useScheduleStore(s => s.getSchedule)
    const scheduleId = useScheduleStore(s => s.scheduleId)


    useEffect(() => {
        const initialize = async () => {
            await checkToken(); // асинхронно ждем токен
            connectWebSocket((action, payload) => {
                console.log("Получено сообщение:", action, payload);
            });
        };

        initialize();
    }, [checkToken]);

    useEffect(() => {
        // if (scheduleId) {
        getSchedule("576f6ed8-559a-4c42-9c33-cdd868551666")
        // }
    }, [scheduleId])


    return (
        <div style={{padding: 16, display: 'flex', flexDirection: 'column', gap: 24}}>
            <ScheduleHeader/>
            <ScheduleSettingsPanel/>
            <EditableScheduleTable/>
        </div>
    )
}
