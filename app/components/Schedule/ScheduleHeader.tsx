/*
 * Copyright (c) LLC "Centr Distribyucii"
 * All rights reserved.
 */

'use client'
import React from 'react'
import {Button} from 'react-bootstrap'
import {useScheduleStore} from "@/app/store/scheduleStore";

export default function ScheduleHeader() {

    const {sendSchedule, selectedScreens, selectedPlaylist, clearAllSlots} = useScheduleStore()

    return (
        <header className="mb-3">
            <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center gap-2">
                <h4 className="mb-0">Расписание</h4>

                <div className="ms-md-auto w-100 w-sm-auto">
                    <div className="d-grid gap-2 d-sm-inline-flex w-100 justify-content-md-end">
                        <Button
                            className="px-4"
                            onClick={sendSchedule}
                            variant="success"
                            disabled={selectedScreens.length === 0}
                        >
                            Сохранить
                        </Button>

                        <Button
                            className="px-4"
                            variant="outline-primary"
                            onClick={clearAllSlots}
                        >
                            Очистить
                        </Button>
                    </div>
                </div>
            </div>
        </header>
    )
}