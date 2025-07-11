'use client'
import React from 'react'
import {Button} from 'react-bootstrap'
import {useScheduleStore} from "@/app/store/scheduleStore";

export default function ScheduleHeader() {

    const {sendSchedule, selectedScreens, selectedPlaylist} = useScheduleStore()

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

                style={{paddingLeft: 40, paddingRight: 40}}
                onClick={sendSchedule}
                variant="success"
                disabled={selectedScreens.length === 0
                    // || !selectedPlaylist
                }


            >
                Сохранить
            </Button>
        </header>
    )
}
